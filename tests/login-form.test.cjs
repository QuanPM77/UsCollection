const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the actual form handlers without making requests to real accounts.
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../app/(auth)/login/LoginForm.tsx"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function setup(signIn, native = false) {
  const state = [];
  let stateIndex = 0;
  const destinations = [];
  let refreshes = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    "@/lib/checkout-return": { rememberCheckout: async () => {} },
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (index === state.length) state.push(initial);
        return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
      },
      useRef: current => ({ current }),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/link": "link",
    "lucide-react": { Eye: "eye", EyeOff: "eye-off", LockKeyhole: "lock", Phone: "phone" },
    "next-auth/react": { signIn },
    "./actions": { loginWithPassword: (phone, password) => signIn("credentials", { phone, password }) },
    "next/navigation": { useRouter: () => ({ replace: url => destinations.push(url), refresh: () => { refreshes++; } }) },
    "@/components/AuthShell": { Notice: "notice" },
    "@capacitor/core": { Capacitor: { isNativePlatform: () => native } },
    "@capgo/capacitor-social-login": { SocialLogin: {
      initialize: async () => {},
      login: async () => ({ provider: "google", result: { responseType: "online", idToken: "test-token" } }),
    } },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    exports: module.exports, module,
    require(name) { if (!(name in dependencies)) throw Error(name); return dependencies[name]; },
    FormData: class { get(key) { return key === "phone" ? "0912 345 678" : "test-password"; } },
  });
  const render = () => {
    stateIndex = 0;
    return module.exports.default({ googleEnabled: true, googleClientId: "test-client" });
  };
  const tree = render();
  const form = tree.props.children[0];
  const google = tree.props.children[2].props.children[1];
  return { state, destinations, render, refreshes: () => refreshes, submit: () => form.props.onSubmit({ preventDefault() {}, currentTarget: {} }), google: () => google.props.onClick() };
}

test("password is masked by default and can be shown and hidden", () => {
  const { render } = setup(async () => assert.fail("Visibility should not submit the form"));
  function passwordField() {
    const [, input, button] = render().props.children[0].props.children[1].props.children;
    assert.equal(button.props.type, "button");
    return { input: input.props, toggle: button.props.onClick };
  }
  const masked = passwordField();
  assert.equal(masked.input.type, "password");
  masked.toggle();
  const visible = passwordField();
  assert.equal(visible.input.type, "text");
  assert.equal(visible.input.name, masked.input.name);
  visible.toggle();
  assert.equal(passwordField().input.type, "password");
});

test("successful login navigates once and stays pending until unmount", async () => {
  let calls = 0;
  const form = setup(async (_, options) => { calls++; assert.equal(options.phone, "0912345678"); return { ok: true, destination: "/admin" }; });
  await form.submit();
  await form.submit();
  await form.google();
  assert.equal(calls, 1);
  assert.deepEqual(form.destinations, ["/admin"]);
  assert.equal(form.refreshes(), 0);
  assert.equal(form.state[1], true);
});

for (const result of [undefined, { ok: false }, { ok: false, error: "CredentialsSignin" }, { ok: false, code: "account_locked" }, { ok: false, code: "rate_limited_90" }]) {
  test(`failed response permits retry without navigation: ${JSON.stringify(result)}`, async () => {
    let calls = 0;
    const form = setup(async () => { calls++; return result; });
    await form.submit();
    assert.equal(form.state[1], false);
    assert.ok(form.state[0]);
    assert.deepEqual(form.destinations, []);
    await form.submit();
    assert.equal(calls, 2);
  });
}

test("network failure clears pending", async () => {
  const form = setup(async () => { throw Error("offline"); });
  await form.submit();
  assert.equal(form.state[1], false);
  assert.ok(form.state[0]);
});

test("concurrent submissions and Google clicks share one request lock", async () => {
  let resolve, calls = 0;
  const form = setup(() => { calls++; return new Promise(done => { resolve = done; }); });
  const pending = form.submit();
  await form.submit();
  await form.google();
  assert.equal(calls, 1);
  resolve({ ok: true });
  await pending;
});

test("web Google redirect keeps the form pending", async () => {
  const form = setup(async provider => { assert.equal(provider, "google"); });
  await form.google();
  assert.equal(form.state[1], true);
  assert.deepEqual(form.destinations, []);
});

test("native Google requires a successful auth response", async () => {
  const form = setup(async () => undefined, true);
  await form.google();
  assert.equal(form.state[1], false);
  assert.ok(form.state[0]);
  assert.deepEqual(form.destinations, []);
});
