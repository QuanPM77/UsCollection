const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require: n => { if (!(n in deps)) throw Error(n); return deps[n]; }, URL, process: { env: { NODE_ENV: 'production' } } });
  return exports;
}
function cookies() {
  let saved;
  return { get: () => saved && { value: saved.value }, set: (name, value, options) => { saved = { name, value, options }; }, delete: () => { saved = undefined; }, saved: () => saved };
}
test('purchase destination survives onboarding and is consumed exactly once', async () => {
  const jar = cookies();
  const { rememberCheckout } = load('lib/checkout-return.ts', { 'next/headers': { cookies: async () => jar } });
  await rememberCheckout('/checkout/product/item-123');
  assert.equal(jar.saved().options.httpOnly, true);
  assert.equal(jar.saved().options.secure, true);
  let user = { role: 'customer', destination: '/complete-profile' };
  const { GET } = load('app/auth/continue/route.ts', { 'next/headers': { cookies: async () => jar }, 'next/server': { NextResponse }, '@/lib/auth-session': { getSession: async () => ({ user }) } });
  const visit = () => GET(new Request('https://shop.example/auth/continue'));
  assert.equal((await visit()).headers.get('location'), 'https://shop.example/complete-profile');
  assert.ok(jar.saved());
  user = { role: 'customer', destination: '/verify-required' };
  assert.equal((await visit()).headers.get('location'), 'https://shop.example/verify-required');
  assert.ok(jar.saved());
  user = { role: 'customer', destination: '/' };
  assert.equal((await visit()).headers.get('location'), 'https://shop.example/checkout/product/item-123');
  assert.equal(jar.saved(), undefined);
  assert.equal((await visit()).headers.get('location'), 'https://shop.example/');
});
test('purchase return rejects external URLs and auth loops', async () => {
  const jar = cookies();
  const { rememberCheckout } = load('lib/checkout-return.ts', { 'next/headers': { cookies: async () => jar } });
  for (const value of ['//evil.example', '/checkout/../admin', '/auth/continue', '/checkout?redirect=https://evil.example', '/\\evil.example']) {
    await rememberCheckout(value); assert.equal(jar.saved(), undefined);
  }
});
function renderer(file, deps) {
  const state = []; let cursor = 0; let effects = [];
  const jsx = (type, props) => ({ type, props });
  const react = { useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], v => { state[index] = typeof v === 'function' ? v(state[index]) : v; }]; }, useMemo: fn => fn(), useEffect: fn => effects.push(fn) };
  const Component = load(file, { ...deps, react, 'react/jsx-runtime': { jsx, jsxs: jsx } }).default;
  return props => { cursor = 0; effects = []; const tree = Component(props); effects.forEach(fn => fn()); return tree; };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
function text(tree) { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); if (!tree) return ''; if (Array.isArray(tree)) return tree.map(text).join(''); return text(tree.props?.children); }
test('catalog matches Vietnamese without accents and reset restores all products', () => {
  const render = renderer('app/(shop)/buy/ProductCatalog.tsx', { '@/components/ProductImage': 'image', 'next/link': 'link', '@/lib/product-styles': { PRODUCT_STYLES: [] }, './FavoriteButton': 'favorite' });
  const props = { products: [{ id: 'a', name: 'Vòng Đá Thạch Anh', price: 100, averageRating: null }, { id: 'b', name: 'Ngọc Trai', price: 200, averageRating: null }] };
  let tree = render(props);
  nodes(tree).find(n => n.props?.type === 'search').props.onChange({ target: { value: 'vong da thach anh' } });
  tree = render(props);
  assert.equal(nodes(tree).filter(n => n.type === 'article').length, 1);
  assert.ok(text(tree).includes('Tìm: vong da thach anh'));
  nodes(tree).find(n => n.type === 'button' && text(n) === 'Xóa tất cả bộ lọc').props.onClick();
  assert.equal(nodes(render(props)).filter(n => n.type === 'article').length, 2);
});
test('clear-all undo restores bead order and is discarded after a new design starts', () => {
  const original = [{ index: 0, beadTypeId: 'pink' }, { index: 1, beadTypeId: 'blue' }];
  const store = { slots: original, wristCircumference: 160, beadCatalog: [], totalPrice: () => 100, filledCount: () => store.slots.length, clearAll: () => { store.slots = []; } };
  const useStore = () => store; useStore.setState = value => Object.assign(store, value);
  const render = renderer('components/ui/BraceletControls.tsx', { '@/lib/store': { useBraceletStore: useStore }, '@/lib/beadData': { formatPrice: String }, 'next/link': 'link', '@/components/LoginPromptProvider': { useLoginPrompt: () => ({ isAuthenticated: true }) } });
  const click = (tree, label) => nodes(tree).find(n => n.type === 'button' && text(n) === label).props.onClick();
  render(); click(render(), 'Xóa tất cả');
  assert.equal(store.slots.length, 0);
  click(render(), 'Hoàn tác');
  assert.equal(JSON.stringify(store.slots), JSON.stringify(original));
  click(render(), 'Xóa tất cả');
  store.slots = [{ index: 0, beadTypeId: 'new' }]; render();
  store.slots = [];
  assert.ok(!text(render()).includes('Hoàn tác'));
});

test('registration preserves checkout through the success redirect', async () => {
  const routing = load('lib/auth-destination.ts', {});
  const { registerUser } = load('app/(auth)/register/actions.ts', {
    '@/lib/auth-destination': routing,
    bcryptjs: { hash: async () => 'hash' },
    'next/headers': { headers: async () => ({}) },
    'next/navigation': { redirect: url => { throw new Error(url); } },
    '@/lib/prisma': { prisma: { user: { findFirst: async () => null, create: async () => ({ id: 'new' }) } } },
    '@/lib/ratelimit': { clientIp: () => 'test', progressiveFailureLimit: async () => ({ ok: true }), recordProgressiveFailure: async () => {}, clearLimit: async () => {} },
  });
  for (const destination of ['/checkout/product/item-123', '//evil.example']) {
    const fd = new FormData();
    for (const [key, value] of Object.entries({ phone: '0912345678', password: 'password123', confirm: 'password123', callbackUrl: destination })) fd.set(key, value);
    await assert.rejects(registerUser(undefined, fd), error => {
      const url = new URL(error.message, 'https://shop.example');
      assert.equal(url.pathname, '/login');
      assert.equal(url.searchParams.get('callbackUrl'), destination.startsWith('//') ? null : destination);
      return true;
    });
  }
});
