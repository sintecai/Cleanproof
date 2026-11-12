export interface AccountHintsStore{clear(name:string):Promise<void>}
/** Remove only obsolete display hints. Sessions, device keys, databases and queues are untouched. */
export async function removeRememberedAccounts(store:AccountHintsStore){
 await store.clear('remembered-accounts-v1');
}
