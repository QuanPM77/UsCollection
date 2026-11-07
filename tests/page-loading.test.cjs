const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, ...globals,
    require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
  });
  return module.exports;
}

const pagination = load("lib/pagination.ts");
test("page input cannot produce fractional, negative or overflowing DB offsets", () => {
  for (const value of [undefined, "", "-1", "0", "1.5", "Infinity", "1e9", "1000001", ["2"]]) {
    assert.equal(pagination.pageNumber(value), 1);
  }
  assert.equal(pagination.pageNumber("2"), 2);
});

test("transaction history reads only the requested page for the authenticated user", async () => {
  let listQuery, countQuery;
  const jsx = (type, props) => ({ type, props });
  const page = load("app/(shop)/transactions/page.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": {}, "@/components/SiteHeader": {},
    "@/lib/guard": { requireRole: async role => { assert.equal(role, "customer"); return { user: { id: "customer-a" } }; } },
    "@/lib/pagination": pagination,
    "@/lib/prisma": { prisma: { order: {
      findMany: async query => { listQuery = query; return []; },
      count: async query => { countQuery = query; return 45; },
    } } },
  });
  await page.default({ searchParams: Promise.resolve({ page: "2" }) });
  assert.equal(listQuery.where.user_id, "customer-a");
  assert.equal(countQuery.where.user_id, "customer-a");
  assert.equal(listQuery.take, 20);
  assert.equal(listQuery.skip, 20);
  assert.equal(listQuery.select.order_items.select.product_name, true);
});

test("simultaneous bead consumers share a request, later visits refresh data", async () => {
  let calls = 0, finish;
  const catalog = load("lib/bead-catalog-request.ts", {}, {
    fetch: () => { calls++; return new Promise(resolve => { finish = resolve; }); },
  });
  const a = catalog.fetchBeadCatalog(), b = catalog.fetchBeadCatalog();
  assert.equal(a, b);
  assert.equal(calls, 1);
  finish({ ok: true, json: async () => ({ data: [{ id: "bead" }] }) });
  assert.equal((await a)[0].id, "bead");
  const next = catalog.fetchBeadCatalog();
  assert.equal(calls, 2);
  finish({ ok: true, json: async () => ({ data: [] }) });
  await next;
});

test("a failed shared bead request can be retried", async () => {
  let calls = 0;
  const catalog = load("lib/bead-catalog-request.ts", {}, {
    fetch: async () => ({ ok: ++calls > 1, json: async () => ({ data: [] }) }),
  });
  await assert.rejects(catalog.fetchBeadCatalog());
  await catalog.fetchBeadCatalog();
  assert.equal(calls, 2);
});

test("role guard retains login, role and onboarding checks without another DB read", async () => {
  let session;
  const guard = load("lib/guard.ts", {
    "next/navigation": { redirect: url => { throw Error(url); } },
    "@/lib/auth-session": { getSession: async () => session },
  });
  await assert.rejects(guard.requireRole("customer"), { message: "/login" });
  session = { user: { role: "customer", destination: "/complete-profile" } };
  await assert.rejects(guard.requireRole("admin"), { message: "/customer" });
  await assert.rejects(guard.requireRole("customer"), { message: "/complete-profile" });
  session.user.destination = "/verify-required";
  await assert.rejects(guard.requireRole("customer"), { message: "/verify-required" });
  session.user.destination = "/";
  assert.equal(await guard.requireRole("customer"), session);
});
