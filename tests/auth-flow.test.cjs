const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");

const root = path.join(__dirname, "..");
const redirect = url => { throw new Error(`redirect:${url}`); };
const forbidden = () => assert.fail("Protected data must not be accessed before authorization");
const protectedData = new Proxy({}, { get: forbidden });

function load(file, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const defaults = {
    "next/server": { NextRequest, NextResponse },
    "next/navigation": { redirect },
    "next/cache": { revalidatePath: forbidden, revalidateTag: forbidden },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "@/lib/prisma": { prisma: protectedData },
    "@/lib/supabase-storage": { uploadProductImage: forbidden },
    "@/lib/image-validation": { normalizeWebpImage: forbidden },
    "@/lib/db/fileDb": { getAdminAuditLogs: forbidden },
    "@/lib/payment-settlement": { deleteUnpaidOrder: forbidden, settlePaidOrder: forbidden },
    "@payos/node": { PayOS: class { paymentRequests = protectedData; webhooks = protectedData; } },
    bcryptjs: require("bcryptjs"),
    "fs/promises": { readFile: forbidden },
    path,
  };
  const deps = { ...defaults, ...dependencies };
  vm.runInNewContext(code, {
    module, exports: module.exports, Response, Request, URL, Date, FormData, console,
    process: { cwd: () => root, env: { AUTH_GOOGLE_ID: "test", AUTH_GOOGLE_SECRET: "test", PAYOS_CLIENT_ID: "test", PAYOS_API_KEY: "test", PAYOS_CHECKSUM_KEY: "test" } },
    require(name) { if (!(name in deps)) throw new Error(`Missing dependency: ${name}`); return deps[name]; },
  });
  return module.exports;
}

const routing = load("lib/auth-destination.ts");
const customer = { id: "customer-id", role: "customer", destination: "/", isEmailVerified: true };
const sessionFor = user => user ? { user } : null;
const guardFor = user => load("lib/guard.ts", { "@/lib/auth-session": { getSession: async () => sessionFor(user) } });

test("callbacks reject external hosts, backslashes and control characters", () => {
  for (const value of [undefined, null, [], "https://other.example", "//other.example", "/\\other.example", "/\t/other.example", "/\n/other.example", "/ \r/other.example"]) {
    assert.equal(routing.safeCallbackUrl(value), undefined);
  }
  for (const value of ["/", "/buy?page=2", "/buy/item#reviews", "/admin/orders"]) {
    assert.equal(routing.safeCallbackUrl(value), value);
  }
});

test("API guard distinguishes missing login, wrong role and incomplete onboarding", async () => {
  for (const [user, status, redirectTo] of [
    [null, 401],
    [{ ...customer, id: undefined }, 401],
    [{ id: "admin-id", role: "admin" }, 403],
    [{ id: "staff-id", role: "staff" }, 403],
    [{ ...customer, destination: "/complete-profile" }, 403, "/complete-profile"],
    [{ ...customer, destination: "/verify-required", isEmailVerified: false }, 403, "/verify-required"],
  ]) {
    const result = await guardFor(user).requireApiRole("customer");
    assert.equal(result.ok, false);
    assert.equal(result.response.status, status);
    assert.equal((await result.response.json()).redirectTo, redirectTo);
  }
  assert.equal((await guardFor(customer).requireApiRole("customer")).ok, true);
  assert.equal((await guardFor({ id: "admin-id", role: "admin" }).requireApiRole("customer", "admin")).ok, true);
});

const customerRoutes = [
  ["app/api/custom-designs/route.ts", "/api/custom-designs"],
  ["app/api/support/chat/route.ts", "/api/support/chat"],
  ["app/api/payment/cancel/route.ts", "/api/payment/cancel"],
  ["app/api/payment/status/route.ts", "/api/payment/status"],
];

for (const [file, url] of customerRoutes) {
  test(`${url} enforces access even when called without middleware`, async () => {
    const users = [null, { ...customer, destination: "/complete-profile" }, { ...customer, destination: "/verify-required" }, { id: "staff-id", role: "staff" }];
    if (!url.endsWith("/status")) users.push({ id: "admin-id", role: "admin" });
    for (const user of users) {
      const route = load(file, {
        "@/lib/guard": guardFor(user),
        "@/lib/saved-design": load("lib/saved-design.ts"),
      });
      for (const method of ["GET", "POST", "PATCH", "DELETE"].filter(method => route[method])) {
        const request = new NextRequest(`https://usstory.vercel.app${url}?orderId=11111111-1111-1111-1111-111111111111`, { method });
        const response = await route[method](request);
        assert.equal(response.status, user ? 403 : 401, `${method}, role ${user?.role}, destination ${user?.destination}`);
      }
    }
  });
}

const adminRoutes = fs.readdirSync(path.join(root, "app/api/admin"), { recursive: true })
  .filter(file => file.endsWith("route.ts"))
  .map(file => path.join("app/api/admin", file));
adminRoutes.push("app/api/db/backup/route.ts");

for (const file of adminRoutes) {
  test(`${file} denies guests, customers and staff before accessing data`, async () => {
    for (const user of [null, customer, { id: "staff-id", role: "staff" }]) {
      const route = load(file, { "@/auth": { auth: async () => sessionFor(user) } });
      for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"].filter(method => route[method])) {
        const request = new NextRequest("https://usstory.vercel.app/api/admin/test", { method });
        const response = await route[method](request, { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) });
        assert.ok([401, 403].includes(response.status), `${method}, role ${user?.role}`);
      }
    }
  });
}

test("verification page routes incomplete and legacy profiles without loops", async () => {
  const completed = { email: "customer@example.com", emailVerifiedAt: new Date(), profileCompletedAt: new Date(), phone: "0912345678" };
  for (const [record, expected] of [[null, "/login"], [{ ...completed, phone: null }, "/complete-profile"], [{ ...completed, profileCompletedAt: null }, "/complete-profile"], [completed, "/post-login"]]) {
    const page = load("app/verify-required/page.tsx", {
      "@/lib/auth-session": { getSession: async () => sessionFor(customer) },
      "@/lib/prisma": { prisma: { user: { findUnique: async () => record } } },
      "./EmailVerificationForm": "form",
    });
    await assert.rejects(page.default(), { message: `redirect:${expected}` });
  }
  const page = load("app/verify-required/page.tsx", {
    "@/lib/auth-session": { getSession: async () => sessionFor(customer) },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => ({ ...completed, email: null }) } } },
    "./EmailVerificationForm": "form",
  });
  assert.equal((await page.default()).props.email, "");
});

function authConfig(prisma) {
  let captured;
  class CredentialsSignin extends Error {}
  load("auth.ts", {
    "next-auth": { __esModule: true, default: config => { captured = config; return {}; }, CredentialsSignin },
    "next-auth/providers/credentials": options => options,
    "next-auth/providers/google": options => options,
    jose: { createRemoteJWKSet: () => ({}), jwtVerify: async () => { throw new Error("Invalid token"); } },
    "@/lib/prisma": { prisma },
    "@/lib/auth-destination": routing,
    "@/lib/token": { hashToken: value => `hash:${value}` },
    "@/lib/ratelimit": { clientIp: () => "test", clearLimit: async () => {}, progressiveFailureLimit: async () => ({ ok: true }), recordProgressiveFailure: async () => {} },
  });
  return captured;
}

test("existing sessions lose access after account deletion or locking", async () => {
  for (const user of [null, { status: "locked", role: "admin" }]) {
    const config = authConfig({ user: { findUnique: async () => user } });
    assert.equal(await config.callbacks.jwt({ token: { uid: "user-id", role: "admin" } }), null);
  }
});

test("session refresh uses current role and profile state instead of old token claims", async () => {
  const config = authConfig({ user: { findUnique: async () => ({ role: "customer", status: "active", phone: null, profileCompletedAt: null, email: "google@example.com", emailVerifiedAt: new Date() }) } });
  const token = await config.callbacks.jwt({ token: { uid: "user-id", role: "admin", destination: "/admin", picture: "large-image" } });
  assert.equal(token.role, "customer");
  assert.equal(token.destination, "/complete-profile");
  assert.equal(token.emailVerified, true);
  assert.equal(token.picture, undefined);
});

test("Google rejects unverified emails and invalid native ID tokens", async () => {
  const config = authConfig(protectedData);
  const account = { provider: "google", providerAccountId: "google-id" };
  const user = { email: "google@example.com" };
  assert.equal(await config.callbacks.signIn({ account, user, profile: { email_verified: false } }), "/login?error=GoogleEmailUnverified");
  assert.equal(await config.callbacks.jwt({ token: {}, account, user, profile: { email_verified: false } }), null);
  assert.equal(await config.providers.find(provider => provider.id === "google-native").authorize({ idToken: "invalid" }), null);
});

test("email verification tokens reject locked, non-customer and Google-linked accounts", async () => {
  for (const user of [null, { id: "user-id", role: "admin", status: "active", passwordHash: "hash" }, { id: "user-id", role: "customer", status: "locked", passwordHash: "hash" }, { id: "user-id", role: "customer", status: "active", googleId: "google-id", passwordHash: "hash" }]) {
    const transaction = {
      emailVerificationToken: { findFirst: async () => ({ id: "token-id", userId: "user-id", email: "customer@example.com" }), deleteMany: forbidden },
      user: { findUnique: async () => user, update: forbidden },
    };
    const config = authConfig({ $transaction: callback => callback(transaction) });
    assert.equal(await config.providers.find(provider => provider.id === "email-verification").authorize({ token: "test" }), null);
  }
});

test("payment creation checks the current account before creating an order", async () => {
  for (const [user, account, status] of [
    [null, null, 401],
    [{ id: "admin-id", role: "admin" }, null, 403],
    [{ id: "staff-id", role: "staff" }, null, 403],
    [customer, null, 403],
    [customer, { status: "locked" }, 403],
    [customer, { status: "active", profileCompletedAt: null, phone: "0912345678" }, 403],
    [customer, { status: "active", profileCompletedAt: new Date(), phone: null }, 403],
    [customer, { status: "active", profileCompletedAt: new Date(), phone: "0912345678", email: "customer@example.com", emailVerifiedAt: null }, 403],
  ]) {
    const route = load("app/api/payment/create/route.ts", {
      "@/auth": { auth: async () => sessionFor(user) },
      "@/lib/prisma": { prisma: { user: { findUnique: async () => account } } },
      "node:crypto": require("node:crypto"),
      "@prisma/client": { Prisma: {} },
    });
    assert.equal((await route.POST(new NextRequest("https://usstory.vercel.app/api/payment/create", { method: "POST" }))).status, status);
  }
});

test("profile completion validates required fields before any write", async () => {
  const valid = { fullName: "Customer Name", phone: "0912345678", street: "123 Street", province: "Test Province", ward: "Test Ward" };
  for (const [field, value, message] of [
    ["fullName", "", "Họ tên cần từ 2 đến 100 ký tự."],
    ["phone", "bad-phone", "Nhập số điện thoại Việt Nam hợp lệ."],
    ["street", "", "Vui lòng nhập số nhà và tên đường."],
    ["ward", "invalid", "Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ."],
  ]) {
    const action = load("app/complete-profile/actions.ts", {
      "@/auth": { auth: async () => sessionFor({ ...customer, destination: "/complete-profile" }) },
      "@/lib/prisma": { prisma: { user: { findUnique: async () => ({ phone: null }), findFirst: async () => null }, $transaction: forbidden } },
      "@/lib/vietnam-addresses": { isValidVietnamWard: (province, ward) => province === valid.province && ward === valid.ward },
    });
    const form = new FormData();
    for (const [key, input] of Object.entries({ ...valid, [field]: value })) form.set(key, input);
    await assert.rejects(action.completeProfile(form), { message });
  }
});

test("password reset rejects expired, replayed and newly locked account requests", async () => {
  const form = new FormData();
  form.set("token", "test-token");
  form.set("password", "new-password");
  form.set("confirm", "new-password");
  for (const scenario of ["expired", "replayed", "locked", "google", "valid"]) {
    let writes = 0;
    const transaction = {
      passwordResetToken: { deleteMany: async () => ({ count: scenario === "replayed" ? 0 : 1 }) },
      user: { updateMany: async args => {
        if (args.data.passwordHash) {
          assert.equal(args.where.status, "active");
          assert.equal(args.where.googleId, null);
          if (scenario === "locked" || scenario === "google") return { count: 0 };
        }
        writes++;
        return { count: 1 };
      } },
    };
    const action = load("app/(auth)/reset-password/actions.ts", {
      "next/headers": { headers: async () => new Headers() },
      "@/lib/prisma": { prisma: {
        passwordResetToken: { findUnique: async () => ({ id: "token-id", userId: "user-id", expiresAt: new Date(Date.now() + (scenario === "expired" ? -60000 : 60000)) }) },
        $transaction: callback => callback(transaction),
      } },
      bcryptjs: { hash: async () => "password-hash" },
      "@/lib/token": { hashToken: value => value },
      "@/lib/ratelimit": { clientIp: () => "test", rateLimit: async () => ({ ok: true }), limitError: () => null },
    });
    if (scenario === "valid") {
      await assert.rejects(action.resetPassword({}, form), { message: "redirect:/login?reset=1" });
      assert.equal(writes, 2);
    } else {
      assert.ok((await action.resetPassword({}, form)).error);
      assert.equal(writes, 0);
    }
  }
});

test("forgot password reports Google and missing accounts as unregistered without sending mail", async () => {
  for (const user of [null, { id: "google-id", googleId: "google-sub", status: "active" }]) {
    const action = load("app/(auth)/forgot-password/actions.ts", {
      "next/headers": { headers: async () => new Headers() },
      "@/lib/prisma": { prisma: { user: { findUnique: async () => user }, passwordResetToken: protectedData, $transaction: forbidden } },
      "@/lib/form": { isEmail: () => true },
      "@/lib/mail": { sendMail: forbidden },
      "@/lib/token": { newToken: forbidden, hashToken: forbidden },
      "@/lib/email-template": { createActionEmail: forbidden },
      "@/lib/ratelimit": { clientIp: () => "test", progressiveFailureLimit: async () => ({ ok: true }), recordProgressiveFailure: async () => {}, limitError: () => null, clearLimit: forbidden },
    });
    const form = new FormData();
    form.set("email", "google@example.com");
    assert.equal((await action.requestReset({}, form)).error, "Tài khoản này chưa được đăng ký.");
  }
});

test("Google customers cannot change password directly or during a concurrent account link", async () => {
  for (const linked of [true, false]) {
    const action = load("app/(dashboard)/customer/actions.ts", {
      "@/lib/guard": { requireRole: async () => sessionFor(customer) },
      "@/lib/prisma": { prisma: { user: {
        findUnique: async () => ({ googleId: linked ? "google-sub" : null, passwordHash: "old-hash" }),
        updateMany: async ({ where }) => {
          assert.equal(where.googleId, null);
          assert.equal(where.status, "active");
          assert.equal(where.passwordHash, "old-hash");
          return { count: 0 };
        },
      } } },
      bcryptjs: { compare: linked ? forbidden : async () => true, hash: linked ? forbidden : async () => "new-hash" },
      "@/lib/supabase-storage": {}, "@/lib/vietnam-addresses": {}, "@/lib/verify": {},
      "next/headers": {}, "@/lib/ratelimit": {},
    });
    const form = new FormData();
    form.set("currentPassword", "old-password");
    form.set("newPassword", "new-password");
    form.set("confirmPassword", "new-password");
    await assert.rejects(action.changePassword(form), { message: `redirect:/customer?passwordError=${linked ? "google" : "changed"}` });
  }
});

test("forgot password still sends a reset link for an active password account", async () => {
  let sent = 0, created = 0;
  const action = load("app/(auth)/forgot-password/actions.ts", {
    "next/headers": { headers: async () => new Headers() },
    "@/lib/prisma": { prisma: {
      user: { findUnique: async () => ({ id: "local-id", googleId: null, status: "active" }) },
      passwordResetToken: {
        deleteMany: async () => ({}),
        create: async ({ data }) => { assert.equal(data.userId, "local-id"); created++; },
      },
      $transaction: queries => Promise.all(queries),
    } },
    "@/lib/form": { isEmail: () => true },
    "@/lib/mail": { sendMail: async email => { assert.equal(email, "local@example.com"); sent++; } },
    "@/lib/token": { newToken: () => "test-token", hashToken: () => "hash" },
    "@/lib/email-template": { createActionEmail: () => ({ html: "", text: "" }) },
    "@/lib/ratelimit": { clientIp: () => "test", progressiveFailureLimit: async () => ({ ok: true }), recordProgressiveFailure: async () => {}, limitError: () => null, clearLimit: async () => {} },
  });
  const form = new FormData();
  form.set("email", "LOCAL@example.com");
  assert.equal((await action.requestReset({}, form)).ok, true);
  assert.equal(created, 1);
  assert.equal(sent, 1);
});

test("customer profile hides the password form for Google accounts", async () => {
  const changePassword = () => {};
  const pageFor = googleId => load("app/(dashboard)/customer/page.tsx", {
    "next/link": "link", "@/components/SiteHeader": { default: "header" },
    "@/auth": { signOut: forbidden }, "@/lib/auth-session": { getSession: async () => sessionFor(customer) },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => ({ googleId, addresses: [], createdAt: new Date(), updatedAt: new Date(), status: "active" }) } } },
    "./AvatarEditor": "avatar", "@/components/AddressFields": "address", "./EmailVerifyButton": "verify",
    "@/lib/supabase-storage": { avatarDisplayUrl: async () => null },
    "./actions": { changePassword },
  });
  function hasPasswordForm(node) {
    if (!node || typeof node !== "object") return false;
    if (Array.isArray(node)) return node.some(hasPasswordForm);
    return node.props?.action === changePassword || hasPasswordForm(node.props?.children);
  }
  assert.equal(hasPasswordForm(await pageFor("google-sub").default({ searchParams: Promise.resolve({}) })), false);
  assert.equal(hasPasswordForm(await pageFor(null).default({ searchParams: Promise.resolve({}) })), true);
});

test("onboarding email action cannot replace a verified email or skip required profile fields", async () => {
  for (const account of [
    { email: "old@example.com", emailVerifiedAt: new Date(), profileCompletedAt: new Date(), phone: "0912345678" },
    { email: null, emailVerifiedAt: null, profileCompletedAt: new Date(), phone: null },
    { email: null, emailVerifiedAt: null, profileCompletedAt: null, phone: "0912345678" },
  ]) {
    const action = load("app/verify-required/actions.ts", {
      "next/headers": { headers: async () => new Headers() },
      "@/auth": { auth: async () => sessionFor(customer) },
      "@/lib/prisma": { prisma: { user: { findUnique: async () => account, findFirst: async () => null, update: forbidden } } },
      "@/lib/form": { isEmail: () => true },
      "@/lib/verify": { sendVerificationEmail: forbidden },
      "@/lib/ratelimit": { clientIp: () => "test", rateLimit: async () => ({ ok: true }), limitError: () => null },
    });
    const form = new FormData();
    form.set("email", "new@example.com");
    assert.ok((await action.requestVerificationEmail({}, form)).error);
  }
});

test("onboarding email update rechecks account state atomically before sending mail", async () => {
  for (const outcome of ["updated", "changed", "duplicate"]) {
    let sent = 0;
    const action = load("app/verify-required/actions.ts", {
      "next/headers": { headers: async () => new Headers() },
      "@/auth": { auth: async () => sessionFor(customer) },
      "@/lib/prisma": { prisma: { user: {
        findUnique: async () => ({ email: null, emailVerifiedAt: null, profileCompletedAt: new Date(), phone: "0912345678" }),
        findFirst: async () => null,
        updateMany: async ({ where }) => {
          assert.equal(where.id, customer.id);
          assert.equal(where.status, "active");
          assert.equal(where.googleId, null);
          assert.equal(where.profileCompletedAt.not, null);
          assert.equal(where.phone.not, null);
          assert.equal(JSON.stringify(where.OR), JSON.stringify([{ email: null }, { emailVerifiedAt: null }]));
          if (outcome === "duplicate") throw Object.assign(new Error("Duplicate email"), { code: "P2002" });
          return { count: outcome === "updated" ? 1 : 0 };
        },
      } } },
      "@/lib/form": { isEmail: () => true },
      "@/lib/verify": { sendVerificationEmail: async () => { sent++; } },
      "@/lib/ratelimit": { clientIp: () => "test", rateLimit: async () => ({ ok: true }), limitError: () => null },
    });
    const form = new FormData();
    form.set("email", "new@example.com");
    const result = await action.requestVerificationEmail({}, form);
    assert.equal(Boolean(result.ok), outcome === "updated");
    assert.equal(sent, outcome === "updated" ? 1 : 0);
  }
});
