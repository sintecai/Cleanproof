import{test}from'node:test';import assert from'node:assert/strict';
import{planProductionMigrations}from'../production-migration-plan.mjs';
const sources=['foundation','private_storage','sync','sync_hardening'].map((n,i)=>({file:`20261021000${i+1}_${n}.sql`,sql:'select '+i}));
const base={projectRef:'decysnpygturutfyjofi',status:'ACTIVE_HEALTHY',applicationTables:['cp_companies'],history:sources.slice(0,3).map((s,i)=>({version:'2026110111305'+i,name:s.file.replace(/^\d+_/,'').replace('.sql','')}))};
test('plans only missing migrations despite hosted timestamp aliases',()=>{const p=planProductionMigrations(base,sources);assert.equal(p.applied,3);assert.deepEqual(p.missing.map(x=>x.name),['sync_hardening']);assert.match(p.missing[0].sha256,/^[a-f0-9]{64}$/);assert.equal(p.requiresRenewedApproval,true);});
test('unready, unavailable, drifted and non-prefix histories fail closed',()=>{
 for(const change of [{status:'COMING_UP',history:[]},{history:null},{history:[]},{projectRef:'vmvoeksprlwjiwfxqita'},{history:[...base.history,base.history[0]]},{history:[{version:'1',name:'unknown'}]},{history:[base.history[2]]}])assert.throws(()=>planProductionMigrations({...base,...change},sources));
});
test('a verified empty isolated project can be planned without applying anything',()=>{const p=planProductionMigrations({...base,applicationTables:[],history:[]},sources);assert.equal(p.missing.length,4);assert.equal(p.readOnly,true);});
