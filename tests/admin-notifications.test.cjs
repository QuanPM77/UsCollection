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
  const { GET } = load('app/api/admin/notifications/route.ts', {
    'next/server': { NextResponse }, '@/auth': { auth: async () => ({ user: { id: 'admin', role: 'admin' } }) },
    '@/lib/prisma': { prisma: {
      store_settings: { findUnique: async () => null },
      products: { findMany: async () => Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: 'Bead', type: 'bead', stock: 0, updated_at: new Date() })) },
      order: { findMany: async () => [], count: async query => { countQuery = query; return 27; } },
    } },
  });
  const response = await GET(); const result = await response.json();
  assert.equal(result.pendingOrderCount, 27);
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
