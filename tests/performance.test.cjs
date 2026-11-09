const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, deps = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, ...globals, require: name => {
    if (!(name in deps)) throw Error(name);
    return deps[name];
  } });
  return module.exports;
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("background polling pauses, serializes slow requests and aborts on cleanup", async () => {
  const listeners = new Map(), timers = new Map();
  let timerId = 0, calls = 0, finish, signal;
  const events = { addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  const document = { ...events, visibilityState: "hidden" };
  const navigator = { onLine: true };
  const { startVisiblePolling } = load("lib/visible-polling.ts", {}, {
    document, window: events, navigator, AbortController,
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  const stop = startVisiblePolling(s => { calls++; signal = s; return new Promise(resolve => { finish = resolve; }); }, 30000);
  assert.equal(calls, 0);
  document.visibilityState = "visible";
  listeners.get("visibilitychange")();
  listeners.get("online")();
  assert.equal(calls, 1);
  assert.equal(timers.size, 0);
  finish(); await flush();
  assert.equal(timers.values().next().value.delay, 30000);
  document.visibilityState = "hidden";
  listeners.get("visibilitychange")();
  assert.equal(timers.size, 0);
  navigator.onLine = false;
  document.visibilityState = "visible";
  listeners.get("visibilitychange")();
  assert.equal(calls, 1);
  navigator.onLine = true;
  listeners.get("online")();
  assert.equal(calls, 2);
  stop(); finish(); await flush();
  assert.equal(signal.aborted, true);
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
});

test("reviews read 12 rows while totals and own review include the entire product history", async () => {
  const pagination = load("lib/pagination.ts");
  let listQuery, ownQuery, summaryQuery;
  const { getProductReviews } = load("lib/product-reviews.ts", {
    "@/lib/pagination": pagination,
    "@/lib/prisma": { prisma: { productReview: {
      aggregate: async q => { summaryQuery = q; return { _avg: { rating: 4.6 }, _count: { _all: 125 } }; },
      findUnique: async q => { ownQuery = q; return { rating: 3, comment: "Old review outside this page" }; },
      findMany: async q => { listQuery = q; return []; },
    } } },
  });
  const result = await getProductReviews("product-a", "2", "customer-a");
  assert.equal(listQuery.take, 12);
  assert.equal(listQuery.skip, 12);
  assert.equal(listQuery.where.productId, "product-a");
  assert.equal(summaryQuery.where.productId, "product-a");
  assert.equal(ownQuery.where.productId_userId.userId, "customer-a");
  assert.equal(result.total, 125);
  assert.equal(result.averageRating, 4.6);
  assert.equal(result.myReview.rating, 3);
  ownQuery = null;
  assert.equal((await getProductReviews("product-a", "999999")).page, 11);
  assert.equal(listQuery.skip, 120);
  assert.equal(ownQuery, null);
});

test("3D hover animation settles and stops requesting frames when auto-rotation is off", () => {
  const three = require("three");
  const mesh = new three.Mesh();
  mesh.scale.setScalar(1.15);
  let frame, requests = 0;
  const component = load("components/3d/BeadMesh.tsx", {
    three,
    react: { useRef: () => ({ current: mesh }), useState: () => [false, () => {}] },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
    "@react-three/fiber": { useFrame: callback => { frame = callback; } },
    "@react-three/drei": {},
    "@/lib/store": { useBraceletStore: selector => selector({}) },
  });
  component.default({ position: [0, 0, 0], slotIndex: 0, beadType: null });
  const state = { invalidate: () => { requests++; } };
  frame(state, 1 / 60);
  assert.equal(requests, 1);
  for (let i = 0; i < 120; i++) frame(state, 1 / 60);
  assert.equal(mesh.scale.x, 1);
  const settled = requests;
  frame(state, 1 / 60);
  assert.equal(requests, settled);
});
