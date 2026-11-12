import{test}from'node:test';import assert from'node:assert/strict';
import{schemaArguments,verifyErasureDump,verifyEmptyRestoreTarget}from'../paired-restore-policy.mjs';
test('restore retains private erasure jobs alongside identities and company data',()=>{
 assert.deepEqual(schemaArguments,['--schema=auth','--schema=public','--schema=cp_private']);
 assert.doesNotThrow(()=>verifyErasureDump('3321; 0 17405 TABLE DATA cp_private account_erasure_jobs postgres\n'));
 for(const toc of ['', '3321; 0 17405 TABLE DATA public account_erasure_jobs postgres\n','-- TABLE DATA cp_private account_erasure_jobs postgres\n'])
  assert.throws(()=>verifyErasureDump(toc),/omits account-erasure/);
});
test('business-empty destination must not already contain identities or erasure history',()=>{
 assert.doesNotThrow(()=>verifyEmptyRestoreTarget({authUsers:0,erasureJobs:0}));
 for(const counts of [null,{}, {authUsers:1,erasureJobs:0},{authUsers:0,erasureJobs:1},{authUsers:'0',erasureJobs:0}])
  assert.throws(()=>verifyEmptyRestoreTarget(counts),/already has identities/);
});
