// Explicit live-storage smoke test. Creates only uniquely named temporary files,
// checks private/public boundaries, and removes its own files in finally.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const modules={};
function load(path) {
  if(modules[path]) return modules[path];
  const exports={};modules[path]=exports;
  const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),process,console,Uint8Array,DataView,TextDecoder,Buffer,URL,fetch});
  return exports;
}
(async()=>{
  const storage=load('lib/model-storage.ts');
  const client=load('lib/supabase-storage.ts').getStorageClient();
  const folder=`smoke-test/${randomUUID()}`;const original=`${folder}/original.glb`;const published=`${folder}/model.glb`;
  const bytes=Buffer.from('storage smoke test');
  try {
    await storage.ensureModelBuckets();
    const signed=await storage.signModelUpload(original);
    const sent=await fetch(signed.signedUrl,{method:'PUT',headers:{'Content-Type':'model/gltf-binary','x-upsert':'false'},body:bytes});
    assert.ok(sent.ok,`Signed upload failed: ${sent.status}`);
    assert.deepEqual(Buffer.from(await storage.downloadModel(original,bytes.length)),bytes);
    const publicOriginal=client.storage.from(storage.ORIGINAL_BUCKET).getPublicUrl(original).data.publicUrl;
    assert.equal((await fetch(publicOriginal)).ok,false,'Original file must remain private');
    const url=await storage.publishModel(published,bytes);
    assert.deepEqual(Buffer.from(await (await fetch(url)).arrayBuffer()),bytes);
    console.log('PASS: signed upload, size verification, private original and public derivative.');
    // Exercise the same signed-token TUS headers used by uploads over 6 MB.
    const largePath=`${folder}/resumable.glb`;const tusSigned=await storage.signModelUpload(largePath);
    const origin=new URL(tusSigned.signedUrl).origin;
    const headers={'Tus-Resumable':'1.0.0','x-signature':tusSigned.token,'x-upsert':'false'};
    if(tusSigned.publicKey)headers.apikey=tusSigned.publicKey;
    const metadata={bucketName:storage.ORIGINAL_BUCKET,objectName:largePath,contentType:'model/gltf-binary',cacheControl:'3600'};
    const created=await fetch(`${origin}/storage/v1/upload/resumable/sign`,{method:'POST',headers:{...headers,'Upload-Length':String(bytes.length),'Upload-Metadata':Object.entries(metadata).map(([k,v])=>`${k} ${Buffer.from(v).toString('base64')}`).join(',')}});
    assert.ok(created.ok,`TUS creation failed: ${created.status} ${await created.text()}`);
    const target=new URL(created.headers.get('location'),origin);
    const part=await fetch(target,{method:'PATCH',headers:{...headers,'Content-Type':'application/offset+octet-stream','Upload-Offset':'0'},body:bytes});
    assert.ok(part.ok,`TUS patch failed: ${part.status} ${await part.text()}`);
    const head=await fetch(target,{method:'HEAD',headers});
    assert.equal(Number(head.headers.get('upload-offset')),bytes.length);
    console.log('PASS: signed TUS creation, chunk upload and resume offset.');
  } finally {
    const a=await client.storage.from(storage.ORIGINAL_BUCKET).remove([original,`${folder}/resumable.glb`]);
    const b=await client.storage.from(storage.MODEL_BUCKET).remove([published]);
    if(a.error||b.error)throw new Error('Temporary storage cleanup failed');
    console.log('Temporary test objects removed.');
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
