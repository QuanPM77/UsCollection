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
