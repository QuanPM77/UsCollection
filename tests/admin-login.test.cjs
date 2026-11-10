const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, URL, Date, console,
    require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
  });
  return module.exports;
}

class AuthError extends Error { type = "AuthError"; }
class CredentialsSignin extends AuthError { type = "CredentialsSignin"; code = "credentials"; }
const routing = load("lib/auth-destination.ts", {});
const admin = { role: "admin", status: "active", phone: "0912345678", email: null, profileCompletedAt: null, emailVerifiedAt: null };

function loginSetup(failure, user = admin) {
  let verified = false;
  const action = load("app/(auth)/login/actions.ts", {
    "@/lib/checkout-return": { rememberCheckout: async () => {} },
    "next-auth": { AuthError, CredentialsSignin },
    "@/auth": { signIn: async (provider, options) => {
      assert.equal(provider, "credentials");
      assert.equal(options.phone, "0912345678");
      if (failure) throw failure;
      verified = true;
    } },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => {
      assert.equal(verified, true, "account destination is only read after authentication");
      return user;
    } } } },
    "@/lib/auth-destination": routing,
  });
  return callback => action.loginWithPassword("0912 345 678", "test-password", callback);
}

test("admin login resolves directly to admin and accepts only local callbacks", async () => {
  const login = loginSetup();
  assert.equal((await login()).destination, "/admin");
  assert.equal((await login("/admin/orders")).destination, "/admin/orders");
  for (const callback of ["https://example.com", "//example.com", "/\\example.com", "/\n/example.com"]) {
    assert.equal((await login(callback)).destination, "/admin");
  }
});

test("account lock and rate-limit errors survive the server action", async () => {
  for (const code of ["account_locked", "rate_limited_90", "credentials"]) {
    const error = new CredentialsSignin(); error.code = code;
    const result = await loginSetup(error)();
    assert.equal(result.ok, false);
    assert.equal(result.code, code);
    assert.equal(result.destination, undefined);
  }
});

test("missing or newly locked accounts are not routed after authentication", async () => {
  for (const user of [null, { ...admin, status: "locked" }]) {
    assert.equal((await loginSetup(undefined, user)()).ok, false);
  }
});

const { NextRequest, NextResponse } = require("next/server");
const middleware = load("middleware.ts", {
  "@/auth": { auth: handler => handler },
  "next/server": { NextResponse },
});

async function visit(pathname, user, method = "GET") {
  const request = new NextRequest(`https://usstory.vercel.app${pathname}`, { method });
  request.auth = user ? { user } : null;
  return middleware.default(request);
}

test("admin page requests outside the admin area redirect to the dashboard", async () => {
  for (const pathname of ["/", "/buy", "/buy/product-id", "/customizer", "/my-designs", "/customer", "/staff", "/login?callbackUrl=%2Fbuy", "/post-login", "/administrator"]) {
    const response = await visit(pathname, { ...admin, id: "admin-id" });
    assert.equal(response.status, 307, pathname);
    assert.equal(response.headers.get("location"), "https://usstory.vercel.app/admin", pathname);
  }
});

test("admin pages and forced sign-out remain accessible without redirect loops", async () => {
  for (const pathname of ["/admin", "/admin/", "/admin/orders?status=new", "/admin/products/catalog/new", "/admin/settings", "/force-signout"]) {
    const response = await visit(pathname, { ...admin, id: "admin-id" });
    assert.equal(response.headers.get("x-middleware-next"), "1", pathname);
    assert.equal(response.headers.get("location"), null, pathname);
  }
});

test("admin restriction preserves guest, staff and customer verification flows", async () => {
  for (const user of [null, { id: "staff-id", role: "staff" }, { id: "customer-id", role: "customer", isEmailVerified: true }]) {
    const response = await visit("/buy", user);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  }
  const customer = { id: "customer-id", role: "customer", isEmailVerified: false };
  assert.equal((await visit("/buy", customer)).headers.get("location"), "https://usstory.vercel.app/force-signout");
  for (const pathname of ["/complete-profile", "/verify-required", "/verify-email", "/force-signout", "/post-login"]) {
    assert.equal((await visit(pathname, customer)).headers.get("x-middleware-next"), "1", pathname);
  }
});

test("customer onboarding takes priority over the post-login callback", async () => {
  const customer = { ...admin, role: "customer", email: "customer@example.com", emailVerifiedAt: new Date() };
  for (const account of [customer, { ...customer, phone: null, profileCompletedAt: new Date() }, { ...customer, emailVerifiedAt: null }]) {
    assert.equal((await loginSetup(undefined, account)("/buy")).destination, "/complete-profile");
  }
  const completed = { ...customer, profileCompletedAt: new Date() };
  assert.equal((await loginSetup(undefined, { ...completed, emailVerifiedAt: null })("/buy")).destination, "/verify-required");
  assert.equal((await loginSetup(undefined, completed)("/buy")).destination, "/buy");
});

test("customers with incomplete profiles cannot open feature pages or submit actions there", async () => {
  for (const isEmailVerified of [true, false]) {
    const customer = { id: "customer-id", role: "customer", destination: "/complete-profile", isEmailVerified };
    for (const pathname of ["/", "/buy", "/buy/product-id", "/customizer", "/my-designs", "/favorites", "/checkout", "/transactions", "/customer", "/login?callbackUrl=%2Fbuy"]) {
      for (const method of ["GET", "POST"]) {
        const response = await visit(pathname, customer, method);
        assert.equal(response.headers.get("location"), "https://usstory.vercel.app/complete-profile", `${method} ${pathname}`);
      }
    }
    for (const pathname of ["/complete-profile", "/verify-required", "/verify-email", "/force-signout", "/post-login"]) {
      assert.equal((await visit(pathname, customer)).headers.get("x-middleware-next"), "1", pathname);
    }
  }
  const completed = { id: "customer-id", role: "customer", destination: "/", isEmailVerified: true };
  assert.equal((await visit("/buy", completed)).headers.get("x-middleware-next"), "1");
});

const featureApis = ["/api/custom-designs", "/api/support/chat", "/api/payment/create", "/api/payment/cancel", "/api/payment/status"];

test("direct feature API requests reject customers who have not finished onboarding", async () => {
  for (const destination of ["/complete-profile", "/verify-required"]) {
    const customer = { id: "customer-id", role: "customer", destination, isEmailVerified: true };
    for (const pathname of featureApis) {
      for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
        const response = await visit(pathname, customer, method);
        assert.equal(response.status, 403, `${method} ${pathname}`);
        assert.equal((await response.json()).redirectTo, destination);
      }
    }
  }
  for (const user of [null, { id: "admin-id", role: "admin" }, { id: "customer-id", role: "customer", destination: "/", isEmailVerified: true }]) {
    for (const pathname of featureApis) {
      assert.equal((await visit(pathname, user)).headers.get("x-middleware-next"), "1", pathname);
    }
  }
});

test("middleware covers feature APIs while leaving OAuth, payment webhooks and assets accessible", () => {
  const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");
  for (const url of [...featureApis, "/api/custom-designs/?cursor=example", "/customizer", "/admin"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config: middleware.config, url }), true, url);
  }
  for (const url of ["/api/auth/session", "/api/auth/callback/google", "/api/payment/notify", "/api/admin/orders", "/images/usstory-logo.webp", "/_next/static/test.js", "/_next/image?url=test"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config: middleware.config, url }), false, url);
  }
});

test("review server action checks onboarding before reading or writing review data", async () => {
  for (const destination of ["/complete-profile", "/verify-required"]) {
    const redirect = url => { throw new Error(`redirect:${url}`); };
    const guard = load("lib/guard.ts", {
      "next/navigation": { redirect },
      "@/lib/auth-session": { getSession: async () => ({ user: { id: "customer-id", role: "customer", destination } }) },
    });
    const action = load("app/(shop)/buy/[id]/actions.ts", {
      "next/cache": { revalidatePath: () => assert.fail("Should not revalidate") },
      "next/navigation": { redirect },
      "@/lib/guard": guard,
      "@/lib/prisma": { prisma: {} },
    });
    await assert.rejects(action.submitReview("product-id", new FormData()), { message: `redirect:${destination}` });
  }
});

test("analytics preserves totals and access control using shared aggregates", async () => {
  let session = { user: { id: "admin-id", role: "admin" } }, queries = 0;
  const query = result => async () => { queries++; return result; };
  const prisma = {
    store_settings: { findUnique: query({ low_stock_threshold: 5 }) },
    products: { findMany: query([{ stock: 0, status: "active" }, { stock: 2, status: "active" }, { stock: 9, status: "active" }]) },
    order: {
      aggregate: query({ _sum: { totalPrice: 300 }, _count: { _all: 3 } }),
      count: query(1),
      groupBy: query([
        { order_status: "new", _count: { _all: 2 } },
        { order_status: "shipping", _count: { _all: 1 } },
        { order_status: "completed", _count: { _all: 2 } },
      ]),
      findMany: query([]),
    },
    $queryRaw: query([{ product_id: "product", product_name: "Bracelet", product_type: "bracelet", quantity: 3, line_total: 300, costed_line_total: 300, total_cost: 120, has_cost: true }]),
  };
  const route = load("app/api/admin/analytics/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/auth": { auth: async () => session }, "@/lib/prisma": { prisma },
  });
  const result = await route.GET({ url: "http://localhost/api/admin/analytics" });
  assert.equal(result.status, 200);
  assert.equal(queries, 8);
  assert.equal(result.body.kpis.totalOrders, 5);
  assert.equal(result.body.kpis.processingOrders, 1);
  assert.equal(result.body.kpis.totalRevenue, 300);
  assert.equal(result.body.kpis.grossProfit, 180);
  assert.equal(result.body.kpis.lowStockProducts, 1);
  assert.equal(result.body.kpis.outOfStockProducts, 1);
  assert.equal(result.body.paymentSuccessRate, 60);
  for (session of [null, { user: { id: "customer", role: "customer" } }]) {
    assert.equal((await route.GET({ url: "http://localhost/api/admin/analytics" })).status, 403);
    assert.equal(queries, 8);
  }
});
