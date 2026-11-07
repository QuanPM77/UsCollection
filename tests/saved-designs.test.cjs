const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => deps[name], Response, Request, URL, console });
  return exports;
}
const helpers = load('lib/saved-design.ts');
const config = { wristCircumference: 160, slots: [{ index: 9, beadTypeId: 'pink' }, { index: 1, beadTypeId: 'blue' }] };
test('validates names and geometry while preserving bead order', () => {
  const result = helpers.validateDesignInput({ name: '  Pastel  ', config });
  assert.equal(result.name, 'Pastel');
  assert.equal(result.config.slots[0].index, 0);
  assert.equal(result.config.slots[0].beadTypeId, 'pink');
  for (const name of ['', '   ', 'x'.repeat(81)]) assert.equal(helpers.validateDesignInput({ name, config }), null);
  for (const invalid of [{ ...config, wristCircumference: 99 }, { ...config, slots: [] }, { ...config, slots: [null] }]) assert.equal(helpers.validateDesignInput({ name: 'Test', config: invalid }), null);
  assert.notEqual(helpers.designFingerprint(config), helpers.designFingerprint({ ...config, slots: [...config.slots].reverse() }));
});
function setup(session) {
  const calls = [];
  const prisma = {
    user: { findUnique: async () => ({ status: 'active' }) },
    savedDesign: {
      findMany: async args => { calls.push(args); return []; },
      findFirst: async args => { calls.push(args); return null; },
      deleteMany: async () => { throw new Error('Must not delete another user design'); },
      updateMany: async () => { throw new Error('Must not edit another user design'); },
    },
  };
  return { calls, api: load('app/api/custom-designs/route.ts', { '@/lib/auth-session': { getSession: async () => session }, '@/lib/prisma': { prisma }, '@/lib/saved-design': helpers }) };
}
test('requires login', async () => {
  const { api } = setup(null);
  assert.equal((await api.GET(new Request('http://localhost/api/custom-designs'))).status, 401);
});
test('lists only the signed-in user designs with no caching', async () => {
  const { api, calls } = setup({ user: { id: 'owner' } });
  const response = await api.GET(new Request('http://localhost/api/custom-designs'));
  assert.equal(response.status, 200);
  assert.equal(calls[0].where.userId, 'owner');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});
test('blocks editing and deleting designs owned by another user', async () => {
  for (const method of ['PATCH', 'DELETE']) {
    const { api, calls } = setup({ user: { id: 'owner' } });
    const response = await api[method](new Request('http://localhost/api/custom-designs', { method, body: JSON.stringify({ id: '12345678-1234-1234-1234-123456789abc', name: 'Changed', config }) }));
    assert.equal(response.status, 404);
    assert.equal(calls[0].where.userId, 'owner');
  }
});
test('rejects requests from another origin', async () => {
  const { api } = setup({ user: { id: 'owner' } });
  const response = await api.POST(new Request('http://localhost/api/custom-designs', { method: 'POST', headers: { origin: 'https://other.example' }, body: '{}' }));
  assert.equal(response.status, 403);
});
