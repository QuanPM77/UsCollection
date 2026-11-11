const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const {randomUUID}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const modules={};const adminId=randomUUID();
function load(path){
  if(modules[path])return modules[path];
  const exports={};modules[path]=exports;
  const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:n=>n==='@/lib/guard'?{requireApiRole:async()=>({ok:true,session:{user:{id:adminId}}})}:n.startsWith('@/')?load(n.slice(2)+'.ts'):require(n),globalThis:{},process,console,Response,Request,URL,TextDecoder,Uint8Array,DataView,Buffer,fetch});return exports;
}
function glb(){
  const bin=Buffer.alloc(36);[0,0,0,.01,0,0,0,.01,0].forEach((v,i)=>bin.writeFloatLE(v,i*4));
  const doc={asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3,min:[0,0,0],max:[.01,.01,0]}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}]};
  let j=Buffer.from(JSON.stringify(doc));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
  const h=Buffer.alloc(20);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+36,8);h.writeUInt32LE(j.length,12);h.writeUInt32LE(0x4e4f534a,16);const b=Buffer.alloc(8);b.writeUInt32LE(36);b.writeUInt32LE(0x004e4942,4);return Buffer.concat([h,j,b,bin]);
}
(async()=>{
  const prisma=load('lib/prisma.ts').prisma;const api=load('app/api/admin/bead-models/route.ts');
  const storage=load('lib/supabase-storage.ts').getStorageClient();
  const sku=`model-test-${randomUUID()}`;let product;const originalPaths=[];const publicPaths=[];
  const call=(method,body)=>api[method](new Request(`http://localhost/api/admin/bead-models?sku=${sku}`,{method,...(method==='GET'?{}:{headers:{origin:'http://localhost'},body:JSON.stringify({sku,...body})})}));
  try{
    product=await prisma.products.create({data:{sku,name:'Temporary GLB verification',type:'bead',status:'draft',price:1,cost_price:0,stock:0,bead_product_details:{create:{material:'glass',color:'#ff0000'}}}});
    const bytes=glb();const start=await call('POST',{originalBytes:bytes.length,webBytes:bytes.length});assert.equal(start.status,201,JSON.stringify(await start.clone().json()));const signed=await start.json();
    for(const file of [signed.original,signed.web]){
      originalPaths.push(file.path);const r=await fetch(file.signedUrl,{method:'PUT',headers:{'Content-Type':'model/gltf-binary'},body:bytes});assert.ok(r.ok);
    }
    const settings=load('lib/bead-model.ts').DEFAULT_MODEL_SETTINGS;
    const published=await call('PATCH',{action:'publish',assetId:signed.assetId,expectedAssetId:null,settings});assert.equal(published.status,200,JSON.stringify(await published.clone().json()));const {model}=await published.json();
    publicPaths.push((await prisma.product_model_assets.findUnique({where:{id:signed.assetId}})).web_path);
    const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
    const parsed=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');assert.ok(parsed.scene.children.length);
    const resolved=await load('lib/model-versions.ts').resolveModelVersions([{id:product.id,sku}],{[sku]:model.assetId});assert.equal(resolved.get(sku).assetId,model.assetId);
    const configured=await call('PATCH',{action:'configure',assetId:model.assetId,expectedAssetId:model.assetId,settings:{...settings,holeAxis:'z',widthMm:15}});assert.equal(configured.status,200);const second=(await configured.json()).model;assert.notEqual(second.assetId,model.assetId);
    assert.equal((await call('PATCH',{action:'restore',assetId:model.assetId,expectedAssetId:model.assetId})).status,409);
    assert.equal((await call('PATCH',{action:'restore',assetId:model.assetId,expectedAssetId:second.assetId})).status,200);
    assert.equal((await call('GET')).status,200);
    assert.equal((await call('PATCH',{action:'reset',expectedAssetId:model.assetId})).status,200);
    assert.equal((await prisma.bead_product_details.findUnique({where:{product_id:product.id}})).model_3d,null);
    console.log('PASS: draft product → signed uploads → server GLB validation → publication → GLTF parse → frozen version resolution → settings version → stale edit rejection → rollback → reset.');
  }finally{
    if(product){
      const assets=await prisma.product_model_assets.findMany({where:{product_id:product.id}});
      for(const a of assets){originalPaths.push(a.original_path,a.candidate_path);if(a.web_path)publicPaths.push(a.web_path);}
      if(originalPaths.length){const r=await storage.storage.from('bead-model-originals').remove([...new Set(originalPaths)]);assert.equal(r.error,null);}
      if(publicPaths.length){const r=await storage.storage.from('bead-models').remove([...new Set(publicPaths)]);assert.equal(r.error,null);}
      await prisma.products.delete({where:{id:product.id}});
      console.log('Temporary draft product, versions and test objects removed.');
    }
    await prisma.$disconnect();
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
