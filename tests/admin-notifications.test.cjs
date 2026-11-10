const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: name => deps[name], URL });
  return exports;
}
test('notification badge counts all actionable orders independently of the ten-item preview', async () => {
  let countQuery;
  let stockQuery;
  let stockCount = 15;
  const { GET } = load('app/api/admin/notifications/route.ts', {
    'next/server': { NextResponse }, '@/auth': { auth: async () => ({ user: { id: 'admin', role: 'admin' } }) },
    '@/lib/prisma': { prisma: {
      store_settings: { findUnique: async () => null },
      products: { count: async query => { stockQuery = query; return stockCount; }, findMany: async () => Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: 'Bead', type: 'bead', stock: 0, updated_at: new Date() })) },
      order: { findMany: async () => [], count: async query => { countQuery = query; return 27; } },
    } },
  });
  const response = await GET(); const result = await response.json();
  assert.equal(result.pendingOrderCount, 27);
  assert.equal(result.lowStockCount, 15);
  assert.equal(result.totalCount, 42);
  assert.equal(stockQuery.where.status, "active");
  assert.equal(stockQuery.where.stock.lte, 5);
  stockCount = 0;
  assert.equal((await (await GET()).json()).totalCount, 27);
  assert.equal(result.notifications.length, 10);
  assert.equal(countQuery.where.paymentStatus, 'paid');
  assert.equal(JSON.stringify(countQuery.where.order_status.notIn), JSON.stringify(['completed', 'cancelled']));
  assert.equal(JSON.stringify(countQuery.where.OR), JSON.stringify([{ order_status: 'new' }, { inventoryReviewRequired: true }]));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
test('order details return product image and tolerate missing products on old orders', async () => {
  const order = { id: 'order', orderCode: 123n, createdAt: new Date(), updatedAt: new Date(), braceletConfig: { kind: 'catalog_product' }, order_items: [
    { product_name: 'Bracelet', product_type: 'bracelet', products: { images: ['catalog/bracelet.webp'] } },
    { product_name: 'Old bracelet', product_type: 'bracelet', products: null },
  ] };
  const { GET } = load('app/api/admin/orders/[id]/route.ts', {
    'next/server': { NextResponse }, '@/auth': { auth: async () => ({ user: { id: 'admin', role: 'admin' } }) },
    '@/lib/prisma': { prisma: { order: { findUnique: async () => order } } },
    '@/lib/supabase-storage': { productImageDisplayUrl: async path => `https://images.example/${path}` },
    '@payos/node': { PayOS: class {} },
  });
  const response = await GET(null, { params: Promise.resolve({ id: 'order' }) });
  const body = await response.json();
  assert.equal(body.items[0].imageUrl, 'https://images.example/catalog/bracelet.webp');
  assert.equal(body.items[1].imageUrl, null);
});

test('toast expires after ten seconds even when notification polling restarts', async () => {
  const states = [], refs = [], effects = [];
  let cursor = 0, pathname = '/admin', poll, timerId = 0;
  const timers = new Map();
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; const previous = effects[i]; if (!previous || deps.some((d, n) => d !== previous.deps[n])) { previous?.cleanup?.(); effects[i] = { deps, fn, pending: true }; } },
  };
  const deps = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': 'link',
    'lucide-react': { Menu: 'menu', Bell: 'bell', ChevronRight: 'chevron' },
    'next/navigation': { usePathname: () => pathname },
    '@/lib/visible-polling': { startVisiblePolling: fn => { poll = fn; return () => {}; } },
  };
  let notifications = [];
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('components/admin/layout/AdminHeader.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => deps[name],
    fetch: async () => ({ ok: true, json: async () => ({ notifications, pendingOrderCount: 0, lowStockCount: 1 }) }),
    window: { addEventListener() {}, removeEventListener() {} },
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  function render() { cursor = 0; const tree = exports.AdminHeader({ onMenuToggle() {} }); for (const effect of effects) if (effect?.pending) { effect.pending = false; effect.cleanup = effect.fn(); } return tree; }
  function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
  render(); await poll(); render();
  notifications = [{ id: 'stock:1', title: 'Sắp hết hàng', message: 'Vòng tay', href: '/admin/products' }];
  await poll();
  assert.ok(nodes(render()).some(n => n.props?.role === 'status'));
  assert.equal(timers.size, 1);
  const timer = [...timers.values()][0]; assert.equal(timer.ms, 10000);
  pathname = '/admin/orders'; render();
  assert.equal(timers.size, 1, 'navigation must not cancel the toast timer');
  const bell = nodes(render()).find(n => n.type === 'button' && n.props['aria-label']?.startsWith('Thông báo'));
  bell.props.onClick(); render();
  assert.equal(timers.size, 1, 'opening the bell must not cancel the toast timer');
  timer.fn();
  assert.ok(!nodes(render()).some(n => n.props?.role === 'status'));
});
