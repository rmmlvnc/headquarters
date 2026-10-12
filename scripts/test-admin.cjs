const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const ts=require('typescript');
let role=false;let reads=0;let error=null;
const sandbox={exports:{},require:()=>({requireSupabase:()=>({rpc:async()=>({data:role,error}),from:()=>{reads++;throw new Error('Should not read tables');}})})};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/admin-api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
const api=sandbox.exports;
(async()=>{
 await assert.rejects(api.loadAdmin(),/Access denied/);assert.equal(reads,0);
 role='true';assert.equal(await api.isStaff(),false,'role must be boolean true');
 error=new Error('missing schema');await assert.rejects(api.isStaff(),/setup is missing/);
 const totals=api.financialTotals([{status:'paid',amount:'100'},{status:'pending',amount:999},{status:'failed',amount:999},{status:'refunded',amount:40}]);
 assert.equal(totals.collected,100);assert.equal(totals.refunded,40);
 assert.equal(api.iliganTime('2026-10-14 09:00'),'2026-10-14T01:00:00.000Z');
 assert.throws(()=>api.iliganTime('2026-02-30 09:00'),/valid calendar/);
 assert.throws(()=>api.iliganTime('2026-10-14T09:00'),/YYYY-MM-DD/);
 console.log('9 admin service authorization, reporting, and date checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
