/** Fail closed before a restore can lose account-erasure bookkeeping. */
export const restoreSchemas=Object.freeze(['auth','public','cp_private']);
export const schemaArguments=restoreSchemas.map(schema=>'--schema='+schema);
export function verifyErasureDump(toc){
 if(typeof toc!=='string'||!/^\s*\d+;.*\bTABLE DATA cp_private account_erasure_jobs\s/m.test(toc))
  throw Error('Snapshot omits account-erasure history. Preserve it for review; do not restore or unfreeze this target.');
}
export function verifyEmptyRestoreTarget(counts){
 if(!counts||counts.authUsers!==0||counts.erasureJobs!==0)
  throw Error('Restore target already has identities or erasure history. Use an independently provisioned disposable stack.');
}
