const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/transaction-filters.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exportsObject, URLSearchParams });
const { transactionFilters } = exportsObject;
test('search always stays within the signed-in customer and accepts an exact order code', () => {
 const result = transactionFilters('owner', { search: '#123456' });
 assert.equal(result.where.user_id, 'owner');
 assert.equal(result.where.OR[1].orderCode, 123456n);
 const name = transactionFilters('owner', { search: 'Vòng hồng' });
 assert.equal(name.where.OR[0].order_items.some.product_name.contains, 'Vòng hồng');
 assert.equal(name.where.OR[0].order_items.some.product_name.mode, 'insensitive');
 assert.equal(transactionFilters('owner', { search: '9999999999999999999' }).where.OR.length, 1);
});
test('date range includes the entire last day in Vietnam time', () => {
 const { where } = transactionFilters('owner', { dateFrom: '2026-11-01', dateTo: '2026-11-10' });
 assert.equal(where.createdAt.gte.toISOString(), '2026-10-31T17:00:00.000Z');
 assert.equal(where.createdAt.lt.toISOString(), '2026-11-10T17:00:00.000Z');
 assert.ok(transactionFilters('owner', { dateFrom: '2026-11-11', dateTo: '2026-11-10' }).error);
 assert.ok(transactionFilters('owner', { dateFrom: '2026-02-30' }).error);
 assert.ok(transactionFilters('owner', { dateFrom: ['2026-11-01'] }).error);
});
test('pagination preserves filters and a new search starts on the first page', () => {
 const filters = transactionFilters('owner', { search: 'Vòng & hồng', dateTo: '2026-11-10', page: '4' });
 const url = new URL(filters.href(2), 'https://shop.example');
 assert.equal(url.searchParams.get('search'), 'Vòng & hồng');
 assert.equal(url.searchParams.get('dateTo'), '2026-11-10');
 assert.equal(url.searchParams.get('page'), '2');
 assert.ok(!filters.href().includes('page='));
 assert.equal(transactionFilters('owner', {}).active, false);
});
