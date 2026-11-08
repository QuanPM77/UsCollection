const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../app/api/payment/status/route.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function setup({ owner = "customer-a", status = "pending", syncedStatus = "PAID" } = {}) {
  let reads = 0;
  let settlement = null;
  const order = {
    user_id: owner, orderCode: 1234567890, totalPrice: 200000,
    paymentStatus: status, inventoryReviewRequired: false,
    braceletConfig: {}, order_items: [{ product_type: "bracelet" }],
  };
  const dependencies = {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/guard": { requireApiRole: async () => ({ ok: true, session: { user: { id: "customer-a", role: "customer", destination: "/" } } }) },
    "@/lib/prisma": { prisma: { order: { findUnique: async () => {
      reads++;
      if (settlement === "deleted") return null;
      return { ...order, paymentStatus: settlement === "paid" ? "paid" : status };
    } } } },
    "@payos/node": { PayOS: class {
      paymentRequests = { get: async () => ({ status: syncedStatus, amount: 200000 }) };
    } },
    "@/lib/payment-settlement": {
      settlePaidOrder: async () => { settlement = "paid"; },
      deleteUnpaidOrder: async () => { settlement = "deleted"; },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
    process: { env: { PAYOS_CLIENT_ID: "test", PAYOS_API_KEY: "test", PAYOS_CHECKSUM_KEY: "test" } },
    console,
  });
  return {
    reads: () => reads,
    get: (sync = false) => module.exports.GET({
      nextUrl: new URL("http://localhost/api/payment/status?orderId=11111111-1111-1111-1111-111111111111" + (sync ? "&syncPayOS=1" : "")),
    }),
  };
}

test("ordinary polling preserves pending status with one order read", async () => {
  const api = setup();
  const result = await api.get();
  assert.equal(result.status, 200);
  assert.equal(result.body.paymentStatus, "pending");
  assert.equal(result.body.orderType, "catalog_product");
  assert.equal(api.reads(), 1);
});

test("a customer cannot read another customer's payment", async () => {
  const api = setup({ owner: "customer-b" });
  assert.equal((await api.get()).status, 403);
  assert.equal(api.reads(), 1);
});

test("PayOS synchronization rereads the settled order", async () => {
  const api = setup();
  assert.equal((await api.get(true)).body.paymentStatus, "paid");
  assert.equal(api.reads(), 2);
});

test("a cancelled order removed during synchronization returns failed", async () => {
  const api = setup({ syncedStatus: "CANCELLED" });
  assert.equal((await api.get(true)).body.paymentStatus, "failed");
  assert.equal(api.reads(), 2);
});
