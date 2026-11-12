import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,webcrypto} from 'node:crypto';
import {openAccountDevice,type DeviceStore,type DeviceRecord} from '../src/auth/accountDevice.ts';
const crypto=webcrypto as unknown as Crypto;
function store(){
 const rows=new Map<string,DeviceRecord>();
 const api:DeviceStore={read:async scope=>rows.get(scope)??null,create:async(scope,value)=>{if(!rows.has(scope))rows.set(scope,value);return rows.get(scope)!;}};
 return {rows,api};
}
test('account device wrapping persists a non-exportable key, isolates identities and converges concurrent first opens',async()=>{
 const {api,rows}=store(),origin='https://fixture.supabase.co',user=randomUUID();
 const [a,b]=await Promise.all([openAccountDevice(api,origin,user,crypto),openAccountDevice(api,origin,user,crypto)]);
 assert.equal(a.profile,b.profile);assert.equal(a.passphrase,b.passphrase);assert.equal(rows.size,1);
 assert.equal(rows.get(a.scope)!.key.extractable,false);
 await assert.rejects(crypto.subtle.exportKey('raw',rows.get(a.scope)!.key));
 assert.notEqual((await openAccountDevice(api,origin,randomUUID(),crypto)).passphrase,a.passphrase);
 assert.equal((await openAccountDevice(api,origin,user,crypto)).passphrase,a.passphrase);
});
test('missing/corrupt device keys and cross-scope ciphertext never reset acknowledged storage',async()=>{
 const {api,rows}=store(),origin='https://fixture.supabase.co',user=randomUUID();
 const a=await openAccountDevice(api,origin,user,crypto),r=rows.get(a.scope)!;
 rows.set(a.scope,{...r,sealed:new ArrayBuffer(10)});
 await assert.rejects(openAccountDevice(api,origin,user,crypto),/preserved/);
 assert.equal(rows.size,1);assert.equal(rows.get(a.scope)!.profile,a.profile);
 const other=randomUUID();rows.set(origin+':'+other,r);
 await assert.rejects(openAccountDevice(api,origin,other,crypto),/preserved/);
 await assert.rejects(openAccountDevice(api,'http://fixture.supabase.co',user,crypto),/HTTPS/);
});
test('failed initial device-key persistence cannot report a ready workspace',async()=>{
 const api:DeviceStore={read:async()=>null,create:async()=>{throw Error('Quota exceeded');}};
 await assert.rejects(openAccountDevice(api,'https://fixture.supabase.co',randomUUID(),crypto),/Quota/);
});
