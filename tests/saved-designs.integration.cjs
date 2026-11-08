const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const { randomUUID, randomInt } = require('node:crypto');
const prisma = new PrismaClient();
function load(file, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, {exports, require: n => deps[n], Response, Request, URL, console});
  return exports;
}
(async () => {
  let user;
  try {
    const bead = await prisma.products.findFirst({where:{type:'bead', status:'active', bead_product_details:{isNot:null}},select:{sku:true}});
    assert.ok(bead, 'An active bead is required');
    user = await prisma.user.create({data:{email:`codex-verification-${randomUUID()}@example.invalid`,phone:`0${randomInt(100000000, 1000000000)}`,fullName:'Integration test',profileCompletedAt:new Date(),emailVerifiedAt:new Date()},select:{id:true}});
    const helpers=load('lib/saved-design.ts');
    const guard=load('lib/guard.ts', {'next/navigation':{redirect:()=>assert.fail('API guard must return JSON')},'@/lib/auth-session':{getSession:async()=>({user:{id:user.id,role:'customer',destination:'/',isEmailVerified:true}})}});
    const api=load('app/api/custom-designs/route.ts', {'@/lib/guard':guard,'@/lib/prisma':{prisma},'@/lib/saved-design':helpers});
    const body={name:'Temporary verification',config:{wristCircumference:160,slots:[{index:0,beadTypeId:bead.sku}]}};
    const call=async(method,data,url='http://localhost/api/custom-designs')=>api[method](new Request(url,{method,...(data?{body:JSON.stringify(data)}:{})}));
    const start=performance.now();
    const responses=await Promise.all(Array.from({length:6},()=>call('POST',body)));
    assert.ok(responses.every(r=>r.ok));
    const results=await Promise.all(responses.map(r=>r.json()));
    assert.equal(new Set(results.map(r=>r.data.id)).size,1);
    assert.equal(await prisma.savedDesign.count({where:{userId:user.id}}),1);
    const saved=results[0].data;
    const rename=await call('PATCH',{id:saved.id,name:'Renamed',renameOnly:true,updatedAt:saved.updatedAt});
    assert.equal(rename.status,200);
    assert.deepEqual((await rename.json()).data.config,saved.config);
    assert.equal((await call('PATCH',{id:saved.id,name:'Stale change',renameOnly:true,updatedAt:saved.updatedAt})).status,409);
    await prisma.savedDesign.createMany({data:Array.from({length:14},(_,i)=>({userId:user.id,name:`Page ${i}`,config:body.config}))});
    const t=performance.now();
    const first=await (await call('GET')).json();
    const pageMs=performance.now()-t;
    assert.equal(first.data.length,12);assert.ok(first.nextCursor);
    const second=await (await call('GET',null,`http://localhost/api/custom-designs?cursor=${first.nextCursor}`)).json();
    assert.equal(second.data.length,3);assert.equal(second.nextCursor,null);
    assert.equal(new Set([...first.data,...second.data].map(d=>d.id)).size,15);
    console.log(JSON.stringify({passed:['6 concurrent saves create exactly one design','rename preserves config','stale edit rejected','pagination without duplicate items'],firstPageApiMs:Math.round(pageMs),totalMs:Math.round(performance.now()-start)}));
  } finally {
    if(user) await prisma.user.delete({where:{id:user.id}});
    await prisma.$disconnect();
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
