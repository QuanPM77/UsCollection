const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/idle-preload.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function environment({ readyState = "complete", visibilityState = "visible", connection, idleSupported = true } = {}) {
  const timers = new Map(), idle = new Map(), listeners = new Map();
  let id = 0;
  const events = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
  };
  const document = { ...events, readyState, visibilityState };
  const navigator = { onLine: true, connection };
  const window = { ...events, location: { origin: "https://usstory.vercel.app" } };
  class Element {
    constructor(link) { this.link = link; }
    closest() { return this.link; }
  }
  if (idleSupported) {
    window.requestIdleCallback = fn => { idle.set(++id, fn); return id; };
    window.cancelIdleCallback = id => idle.delete(id);
  }
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, window, document, navigator, Element,
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  async function tick(queue) {
    const [key, item] = queue.entries().next().value;
    queue.delete(key);
    (item.fn ?? item)();
    await new Promise(resolve => setImmediate(resolve));
  }
  return { schedule: module.exports.scheduleIdlePreloads, links: module.exports.scheduleLinkPreloads, Element, document, navigator, timers, idle, listeners,
    timer: () => tick(timers), runIdle: () => tick(idle), emit: (event, value) => listeners.get(event)?.(value) };
}

test("waits for page load, delay and idle; warms one module at a time", async () => {
  const env = environment({ readyState: "loading" });
  const loaded = [];
  const stop = env.schedule([async () => { loaded.push("charts"); }, async () => { loaded.push("3d"); }]);
  assert.equal(env.timers.size, 0);
  env.document.readyState = "complete";
  env.emit("load");
  assert.equal(env.timers.values().next().value.delay, 1500);
  await env.timer();
  assert.equal(loaded.length, 0);
  await env.runIdle();
  assert.deepEqual(loaded, ["charts"]);
  await env.timer(); await env.runIdle();
  assert.deepEqual(loaded, ["charts", "3d"]);
  stop();
  assert.equal(env.listeners.size, 0);
});

test("heavy modules stay unloaded until a matching local link is hovered or focused", async () => {
  const env = environment();
  let loaded = 0;
  const stop = env.links({ "/customizer": async () => { loaded++; } });
  assert.equal(env.timers.size, 0);
  env.emit("pointerover", { target: new env.Element({ origin: "https://external.test", pathname: "/customizer" }) });
  env.emit("focusin", { target: new env.Element({ origin: "https://usstory.vercel.app", pathname: "/buy" }) });
  assert.equal(env.timers.size, 0);
  const target = new env.Element({ origin: "https://usstory.vercel.app", pathname: "/customizer" });
  env.emit("focusin", { target });
  env.emit("pointerover", { target });
  assert.equal(env.timers.size, 1);
  await env.timer(); await env.runIdle();
  assert.equal(loaded, 1);
  stop();
  assert.equal(env.listeners.size, 0);
});

test("skips data saver and slow connections", () => {
  for (const connection of [{ saveData: true }, { effectiveType: "2g" }, { effectiveType: "3g" }, { effectiveType: "slow-2g" }]) {
    const env = environment({ connection });
    env.schedule([async () => assert.fail("should not import")]);
    assert.equal(env.timers.size, 0);
  }
});

test("rechecks visibility and connection before importing", async () => {
  const env = environment();
  let loaded = false;
  env.schedule([async () => { loaded = true; }]);
  await env.timer();
  env.document.visibilityState = "hidden";
  await env.runIdle();
  assert.equal(loaded, false);
  env.document.visibilityState = "visible";
  env.emit("visibilitychange");
  await env.timer();
  env.navigator.connection = { saveData: true };
  await env.runIdle();
  assert.equal(loaded, false);
});

test("navigation cancels timers and queued idle work", async () => {
  const env = environment();
  const stop = env.schedule([async () => assert.fail("cancelled")]);
  await env.timer();
  assert.equal(env.idle.size, 1);
  stop();
  assert.equal(env.idle.size, 0);
  assert.equal(env.timers.size, 0);
  assert.equal(env.listeners.size, 0);
});

test("navigation during import prevents scheduling the next module", async () => {
  const env = environment();
  let finish;
  const stop = env.schedule([() => new Promise(resolve => { finish = resolve; }), async () => assert.fail("cancelled")]);
  await env.timer(); await env.runIdle();
  stop(); finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(env.timers.size, 0);
});

test("unsupported browsers use delayed fallback and ignore preload failures", async () => {
  const env = environment({ idleSupported: false });
  let loaded = false;
  const stop = env.schedule([async () => { throw Error("network"); }, async () => { loaded = true; }]);
  await env.timer();
  assert.equal(env.timers.values().next().value.delay, 1000);
  await env.timer();
  await env.timer(); await env.timer();
  assert.equal(loaded, true);
  stop();
});
