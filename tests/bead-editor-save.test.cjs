const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function pageHarness(fetch) {
  const slots = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback: fn => fn, useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const deps = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/dynamic': { default: () => 'model-editor' }, '@/components/ui/BeadSwatch': { default: 'swatch' } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('app/(dashboard)/admin/beads/page.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, Error, require: name => { if (!(name in deps)) throw Error(name); return deps[name]; }, fetch, URLSearchParams, window: { location: { search: '' } } });
  return () => { cursor = 0; return exports.default(); };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }

test('single-form save retains its draft after upload failure and retries without creating a second bead', async () => {
  const calls = [];
  const render = pageHarness(async (url, options = {}) => {
    calls.push([options.method ?? 'GET', url, options.body && JSON.parse(options.body)]);
    return { ok: true, json: async () => ({ bead: { id: 'test-bead' }, beads: [] }) };
  });
  nodes(render()).find(n => n.type === 'button' && n.props.children === '+ Thêm hạt').props.onClick();
  let tree = render();
  nodes(tree).find(n => n.type === 'input' && n.props.minLength === 2).props.onChange({ target: { value: 'Test bead' } });
  let attempts = 0;
  const editor = { validate() {}, hasModel: () => true, save: async sku => { assert.equal(sku, 'test-bead'); if (++attempts === 1) throw Error('Upload failed'); } };
  tree = render(); nodes(tree).find(n => n.type === 'model-editor').props.controllerRef.current = editor;
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'POST'); assert.equal(calls[0][2].draft, true);
  tree = render(); assert.ok(nodes(tree).some(n => n.type === 'form'));
  assert.ok(nodes(tree).some(n => n.props?.role === 'alert' && n.props.children.includes('Upload failed')));
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls.map(c => c[0]), ['POST', 'PATCH', 'PUT', 'GET']);
  assert.equal(attempts, 2); assert.ok(!nodes(render()).some(n => n.type === 'form'));
});

test('model validation prevents any product write while preview is not ready', async () => {
  let writes = 0;
  const render = pageHarness(async () => { writes++; throw Error('Unexpected write'); });
  nodes(render()).find(n => n.type === 'button' && n.props.children === '+ Thêm hạt').props.onClick();
  const tree = render();
  nodes(tree).find(n => n.type === 'model-editor').props.controllerRef.current = { validate() { throw Error('Preview not ready'); }, hasModel: () => true };
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(writes, 0);
  assert.ok(nodes(render()).some(n => n.props?.role === 'alert' && n.props.children.includes('Preview not ready')));
});
