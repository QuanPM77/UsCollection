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

test('free anchor rotation keeps any bore on the cord and its picked point at the origin', () => {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(.02, .03, .01));
  mesh.position.set(.006, -.004, .002); scene.add(mesh);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(.4, -.7, 1.2));
  for (const attachment of ['bead', 'pendant']) for (const angle of [0, .8, 2.1, -Math.PI/2]) {
    const s = {...settings.DEFAULT_MODEL_SETTINGS, widthMm:20, attachment, holeCenter:[2,7,-1], anchorRotation:q.toArray(), rollDegrees:35};
    const tr = transforms.modelTransform(scene,s,angle);
    const axis = new THREE.Vector3(1,0,0).applyQuaternion(q).applyQuaternion(tr.rotation);
    const tangent = new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
    if (attachment === 'pendant') tangent.negate();
    assert.ok(axis.distanceTo(tangent) < 1e-6);
    const point = mesh.position.clone().multiplyScalar(tr.scale).add(new THREE.Vector3(...s.holeCenter).divideScalar(10)).add(tr.offset).applyQuaternion(tr.rotation);
    assert.ok(point.length() < 1e-6);
  }
});

test('pendant front faces outwards, bead front faces up, preserving legacy axis settings', () => {
  const scene = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
  for(const attachment of ['bead','pendant']) for(const angle of [0,1,2]) {
    const s={...settings.DEFAULT_MODEL_SETTINGS,attachment};
    const tr=transforms.modelTransform(scene,s,angle);
    const front=new THREE.Vector3(0,0,1).applyQuaternion(tr.rotation);
    const expected=attachment==='bead'?new THREE.Vector3(0,1,0):new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
    assert.ok(front.distanceTo(expected)<1e-6);
    if(attachment==='pendant') assert.ok(new THREE.Vector3(0,-1,0).applyQuaternion(tr.rotation).distanceTo(new THREE.Vector3(0,-1,0))<1e-6);
  }
});

test('anchor and thumbnail validation reject invalid rotations and unsafe image sources', () => {
  for(const anchorRotation of [[0,0,0,0],[0,0,0,2],[0,NaN,0,1],[0,0,1]]) assert.throws(()=>settings.validateModelSettings({...settings.DEFAULT_MODEL_SETTINGS,anchorRotation}));
  for(const thumbnail of ['javascript:alert(1)','data:image/svg+xml;base64,AA==','https://example.com/a.png','data:image/png;base64,'+'a'.repeat(200000)]) assert.throws(()=>settings.validateModelSettings({...settings.DEFAULT_MODEL_SETTINGS,thumbnail}));
  const value=settings.validateModelSettings({...settings.DEFAULT_MODEL_SETTINGS,anchorRotation:[0,0,0,1],thumbnail:'data:image/webp;base64,AAAA'});
  assert.equal(value.thumbnail,'data:image/webp;base64,AAAA');
  assert.equal(JSON.stringify(value.anchorRotation),'[0,0,0,1]');
});

test('new model beads stay draft and cannot activate until the model is published', async () => {
  const {NextResponse}=require('next/server');
  let created, status='draft', savedModel=null;
  const prisma={products:{
    create:async({data})=>{created=data;return {...data,bead_product_details:data.bead_product_details.create};},
    findFirst:async()=>({status,bead_product_details:{model_3d:savedModel}}),
    updateMany:async({data})=>{status=data.status;return {count:1};}
  }};
  const deps={'next/server':{NextResponse},'@/auth':{auth:async()=>({user:{id:'admin',role:'admin'}})},'@/lib/prisma':{prisma},'@/lib/bead-model':settings};
  const create=load('app/api/admin/bead-types/route.ts',deps);
  const input={id:'new-model',name:'New model',material:'glass',color:'#ffffff',metalness:0,roughness:.5,price:100,costPrice:50,stock:3,diameter:8,description:'',draft:true};
  const response=await create.POST(new Request('http://localhost',{method:'POST',body:JSON.stringify(input)}));
  assert.equal(response.status,201); assert.equal(created.status,'draft');
  const api=load('app/api/admin/bead-types/[id]/route.ts',deps);
  const context={params:Promise.resolve({id:'new-model'})};
  assert.equal((await api.PUT(new Request('http://localhost'),context)).status,409);
  assert.equal(status,'draft');
  savedModel={...settings.DEFAULT_MODEL_SETTINGS,assetId:'saved',url:'https://example.com/bead.glb',bytes:100,triangles:1};
  assert.equal((await api.PUT(new Request('http://localhost'),context)).status,200);
  assert.equal(status,'active');
});

test('permanent bead deletion removes the product and stock history, without changing status', async () => {
  const {NextResponse}=require('next/server'); const calls=[];
  const tx={products:{findFirst:async()=>({id:'product'}),delete:async args=>{calls.push(['delete',args.where.id]);}},
    $queryRaw:async()=>[], order_items:{count:async()=>0}, bracelet_product_beads:{count:async()=>0},
    inventory_movements:{deleteMany:async args=>{calls.push(['inventory',args.where.product_id]);}}};
  const api=load('app/api/admin/bead-types/[id]/route.ts',{'next/server':{NextResponse},'@/auth':{auth:async()=>({user:{id:'admin',role:'admin'}})},'@/lib/prisma':{prisma:{$transaction:async fn=>fn(tx)}},'@/lib/bead-model':settings});
  const result=await api.DELETE(new Request('http://localhost/api/admin/bead-types/cat',{method:'DELETE'}),{params:Promise.resolve({id:'cat'})});
  assert.equal(result.status,200); assert.equal((await result.json()).success,true);
  assert.deepEqual(calls,[['inventory','product'],['delete','product']]);
});

test('permanent deletion reports missing or referenced beads without mutating them',async()=>{
  const {NextResponse}=require('next/server');
  for(const scenario of [{missing:true,orders:0,bracelets:0,expected:404},{orders:1,bracelets:0,expected:409},{orders:0,bracelets:1,expected:409}]){
    const forbidden=()=>assert.fail('Referenced/missing products must not be changed');
    const tx={products:{findFirst:async()=>scenario.missing?null:{id:'product'},delete:forbidden},$queryRaw:async()=>[],
      order_items:{count:async()=>scenario.orders},bracelet_product_beads:{count:async()=>scenario.bracelets},inventory_movements:{deleteMany:forbidden}};
    const api=load('app/api/admin/bead-types/[id]/route.ts',{'next/server':{NextResponse},'@/auth':{auth:async()=>({user:{id:'admin',role:'admin'}})},'@/lib/prisma':{prisma:{$transaction:async fn=>fn(tx)}},'@/lib/bead-model':settings});
    const result=await api.DELETE(new Request('http://localhost/api/admin/bead-types/cat',{method:'DELETE'}),{params:Promise.resolve({id:'cat'})});
    assert.equal(result.status,scenario.expected);assert.equal((await result.json()).success,false);
  }
});

test('cross-origin permanent deletion is rejected before database access',async()=>{
  const {NextResponse}=require('next/server');
  const api=load('app/api/admin/bead-types/[id]/route.ts',{'next/server':{NextResponse},'@/auth':{auth:async()=>({user:{id:'admin',role:'admin'}})},'@/lib/prisma':{prisma:{$transaction:()=>assert.fail('Unexpected delete')}},'@/lib/bead-model':settings});
  const result=await api.DELETE(new Request('http://localhost/api/admin/bead-types/cat',{method:'DELETE',headers:{origin:'https://other.test'}}),{params:Promise.resolve({id:'cat'})});
  assert.equal(result.status,403);
});
