// Isolated browser regression: actual UI and WebGL, local mock API, no real account/storage writes.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const temp = process.env.QA_TEMP || os.tmpdir();
const dir = fs.mkdtempSync(path.join(temp, 'bead-editor-'));
const write = (name, body) => fs.writeFileSync(path.join(dir, name), body);
const pause = ms => new Promise(r => setTimeout(r, ms));
const timeout = setTimeout(() => { console.error('Browser test timed out'); process.exit(1); }, 120000);
timeout.unref();

async function main() {
  write('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;`);
  write('dynamic.tsx', "import React,{lazy,Suspense} from 'react';export default function dynamic(f){const C=lazy(f);return p=><Suspense fallback={<p>Loading</p>}><C {...p}/></Suspense>;}");
  write('entry.tsx', `import React from 'react';import{createRoot}from'react-dom/client';import Page from ${JSON.stringify(path.join(root, 'app/(dashboard)/admin/beads/page.tsx').replaceAll('\\', '/'))};createRoot(document.getElementById('root')).render(<Page/>);`);
  const webpack = require('next/dist/compiled/webpack/webpack'); webpack.init();
  await new Promise((resolve, reject) => webpack.webpack({
    mode: 'development', devtool: false, entry: path.join(dir, 'entry.tsx'),
    output: { path: path.join(dir, 'dist'), filename: 'app.js', publicPath: '/' },
    resolve: { extensions: ['.tsx', '.ts', '.js', '.mjs', '.json'], modules: [path.join(root, 'node_modules'), 'node_modules'], alias: { '@': root, 'next/dynamic': path.join(dir, 'dynamic.tsx') } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(dir, 'loader.cjs') }] },
    optimization: { minimize: false },
  }, (err, stats) => err ? reject(err) : stats.hasErrors() ? reject(Error(stats.toString({ all: false, errors: true }))) : resolve()));
  console.log('Isolated UI bundle compiled');
  let model = null, beads = [], failPublish = true;
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const url = new URL(req.url, 'http://localhost');
    const reply = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname.startsWith('/api/')) {
      const raw = Buffer.concat(chunks).toString(); const body = raw ? JSON.parse(raw) : {};
      calls.push({ method: req.method, path: url.pathname, body });
      if (url.pathname === '/api/admin/bead-types' && req.method === 'GET') return reply({ beads });
      if (url.pathname === '/api/admin/bead-types' && req.method === 'POST') { beads = [{ ...body, status: body.draft ? 'draft' : 'active' }]; return reply({ bead: beads[0] }, 201); }
      if (url.pathname.startsWith('/api/admin/bead-types/') && req.method === 'PATCH') return reply({ bead: beads[0] });
      if (url.pathname.startsWith('/api/admin/bead-types/') && req.method === 'PUT') { beads[0].status = 'active'; beads[0].model = model; return reply({ success: true }); }
      if (url.pathname === '/api/admin/bead-models' && req.method === 'GET') return reply({ model, versions: [] });
      if (url.pathname === '/api/admin/bead-models' && req.method === 'POST') return reply({ assetId: 'test-asset', original: { signedUrl: '/upload/original' }, web: { signedUrl: '/upload/web' } });
      if (url.pathname === '/api/admin/bead-models' && req.method === 'PATCH') {
        if (failPublish) { failPublish = false; return reply({ message: 'Simulated upload failure' }, 500); }
        model = { ...body.settings, assetId: 'test-asset', url: `http://127.0.0.1:${server.address().port}/model.glb`, bytes: 100, triangles: 100 }; return reply({ model });
      }
    }
    if (url.pathname.startsWith('/upload/')) return reply({ ok: true });
    if (url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<html><meta charset="utf-8"><style>body{font:14px Arial}form{position:fixed;inset:15px;background:white;overflow:auto;padding:20px}fieldset{border:1px solid #ddd;padding:12px}label{display:inline-block;margin:6px}button{padding:7px;margin:3px}canvas{display:block}div.h-80{height:320px}div.h-72{height:288px}section{border:1px solid #ccc;padding:12px}</style><div id="root"></div><script src="/app.js"></script></html>');
    }
    const file = url.pathname === '/model.glb' ? path.join(root, 'tests/fixtures/cupcake-hong.glb') : path.join(dir, 'dist', path.basename(url.pathname));
    if (fs.existsSync(file)) { res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary'); return fs.createReadStream(file).pipe(res); }
    res.writeHead(404); res.end();
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = spawn(process.env.QA_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', '--user-data-dir=' + path.join(dir, 'chrome'), 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let browserLog = '';
  browser.stderr.on('data', chunk => { browserLog += chunk; });
  let ws;
  try {
    const activePort = path.join(dir, 'chrome', 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(activePort); i++) await pause(100);
    if (!fs.existsSync(activePort)) throw Error('Browser did not start: ' + browserLog);
    const debugPort = fs.readFileSync(activePort, 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
    ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let seq = 0; const pending = new Map(), errors = [];
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description); return r.result.value; };
    const until = async expression => { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(100); } throw Error('Timeout: ' + expression + '\n' + await evaluate('document.body.innerText') + '\n' + errors.join('\n')); };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1250, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
    await until("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Thêm hạt'))");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Thêm hạt')).click()");
    await until("document.querySelector('input[type=file]') !== null");
    await evaluate(`(()=>{const set=(label,value)=>{const el=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith(label)).querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));};set('Tên hạt','QA cupcake');set('Giá vốn','100');set('Tồn kho','5');})()`);
    const doc = await send('DOM.getDocument'); const input = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type=file]' });
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [path.join(root, 'tests/fixtures/cupcake-hong.glb')] });
    await until("document.querySelectorAll('canvas').length === 2"); await pause(1500);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Xoay hướng lỗ').click()");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Xoay model 90° quanh dây').click()");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Hoàn tác').click()");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Làm lại').click()");
    await evaluate("document.querySelector('section').scrollIntoView()");
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(dir, 'preview.png'), Buffer.from(shot.data, 'base64'));
    console.log('Screenshot:', path.join(dir, 'preview.png'));
    await evaluate("document.querySelector('form').requestSubmit()");
    await until("document.body.textContent.includes('Simulated upload failure')");
    assert.equal(beads[0].status, 'draft');
    await pause(300); await evaluate("document.querySelector('form').requestSubmit()");
    await until("document.querySelector('form') === null");
    assert.equal(calls.filter(c => c.path === '/api/admin/bead-types' && c.method === 'POST').length, 1);
    assert.ok(model.thumbnail.startsWith('data:image/')); assert.equal(model.rollDegrees, 90);
    assert.ok(await evaluate("Boolean(document.querySelector('table img'))")); assert.deepEqual(errors, []);
    console.log('PASS: GLB preview, undo/redo, draft on failure, retry without duplicates, model thumbnail.');
    await send('Browser.close');
  } finally { ws?.close(); browser.kill(); server.closeAllConnections(); await new Promise(r => server.close(r)); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
