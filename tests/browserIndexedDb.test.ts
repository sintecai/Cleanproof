import test from 'node:test';import assert from 'node:assert/strict';import{openBrowserRecords}from'../src/storage/browserIndexedDb.js';
test('blocked or timed-out IndexedDB opens reject and close a late connection',async()=>{
 let closed=0;const request:any={result:{close:()=>closed++,objectStoreNames:{contains:()=>true}}};const factory={open:()=>request} as unknown as IDBFactory;
 const open=openBrowserRecords(factory,5);await assert.rejects(open,/did not open/);request.onsuccess();assert.equal(closed,1);
 const blocked=openBrowserRecords(factory,50);request.onblocked();await assert.rejects(blocked,/Another tab/);request.onsuccess();assert.equal(closed,2);
});
