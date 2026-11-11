const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => deps[name] ?? require(name), Response, Request, URL, TextDecoder, Uint8Array, DataView, console });
  return exports;
}
const validation = load('lib/glb-validation.ts');
const settings = load('lib/bead-model.ts');
const transforms = load('lib/model-transform.ts', { '@/lib/bead-model': settings });
const THREE = require('three');
function fixture(change = () => {}) {
  const bin = Buffer.alloc(36);
  [0,0,0,1,0,0,0,1,0].forEach((v,i) => bin.writeFloatLE(v,i*4));
  const doc = { asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0 };
  change(doc,bin);
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,bh,bin]);
}
test('validates real binary geometry and rejects malformed/external resources', () => {
  assert.equal(validation.validateGlb(fixture()).triangles,1);
  for (const edit of [d=>d.buffers[0].uri='https://evil.test/a', d=>d.bufferViews[0].byteLength=400,
    d=>d.accessors[0].count=500000, (d,b)=>b.writeFloatLE(NaN), d=>d.nodes[0].children=[0],
    d=>d.extensionsUsed=['KHR_draco_mesh_compression'], d=>d.images=[{uri:'data:image/png;base64,AA=='}]]) {
    assert.throws(()=>validation.validateGlb(fixture(edit)));
  }
  assert.throws(()=>validation.validateGlb(fixture().subarray(0,30)));
  assert.throws(()=>validation.validateGlb(fixture(),20));
});
test('model settings use spacing independently of appearance', () => {
  assert.equal(settings.beadSpacing({diameter:8,model:{spacingMm:20}}),20);
  assert.equal(settings.beadSpacing({diameter:8}),8);
  for(const update of [{widthMm:NaN},{holeAxis:'q'},{holeCenter:[0,Infinity,0]},{spacingMm:0}]) {
    assert.throws(()=>settings.validateModelSettings({...settings.DEFAULT_MODEL_SETTINGS,...update}));
  }
});
test('all bore axes follow the ring tangent and attachment point lands on string', () => {
  const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(.02,.015,.01)));
  for(const holeAxis of ['x','y','z']) for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]) {
    const s={...settings.DEFAULT_MODEL_SETTINGS,widthMm:20,holeAxis,holeCenter:[2,3,1]};
    const tr=transforms.modelTransform(scene,s,angle);
    const axis=new THREE.Vector3(...(holeAxis==='x'?[1,0,0]:holeAxis==='y'?[0,1,0]:[0,0,1])).applyQuaternion(tr.rotation);
    assert.ok(axis.distanceTo(new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle)))<1e-6);
    const point=new THREE.Vector3(.002,.003,.001).multiplyScalar(tr.scale).add(tr.offset).applyQuaternion(tr.rotation);
    assert.ok(point.length()<1e-6);
    assert.ok(Math.abs(tr.scale-100)<.001);
  }
});
function apiSetup(access, extra={}) {
  let calls=0;
  const prisma={products:{findFirst:async()=>{calls++;return {id:'product',bead_product_details:{model_3d:null}}}},product_model_assets:{findFirst:async()=>null},...extra};
  const api=load('app/api/admin/bead-models/route.ts',{'@/lib/guard':{requireApiRole:async()=>access},'@/lib/prisma':{prisma},'@/lib/bead-model':settings,'@/lib/glb-validation':validation,'@/lib/model-storage':{}});
  return {api,calls:()=>calls};
}
test('upload and publish endpoints require admin before database access',async()=>{
  const {api,calls}=apiSetup({ok:false,response:Response.json({}, {status:403})});
  for(const method of ['GET','POST','PATCH'])assert.equal((await api[method](new Request('http://localhost/api/admin/bead-models',{method,...(method==='GET'?{}:{body:'{}'})}))).status,403);
  assert.equal(calls(),0);
});
test('rejects cross-origin uploads, excessive sizes, foreign assets and stale activation',async()=>{
  const {api}=apiSetup({ok:true,session:{user:{id:'admin'}}});
  const req=(body,method='PATCH',headers={})=>new Request('http://localhost/api/admin/bead-models',{method,headers,body:JSON.stringify({sku:'cat',...body})});
  assert.equal((await api.POST(req({},'POST',{origin:'https://evil.test'}))).status,403);
  assert.equal((await api.POST(req({originalBytes:100000000,webBytes:100},'POST'))).status,400);
  assert.equal((await api.PATCH(req({action:'restore',assetId:'foreign'}))).status,404);
  assert.equal((await api.PATCH(req({action:'reset',expectedAssetId:'old'}))).status,409);
});
