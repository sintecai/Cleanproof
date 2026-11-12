import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eraseAccount,recentPasswordAuthentication} from '../supabase/functions/_shared/accountErasure.ts';
test('erasure waits for private files and data before deleting Auth; failed stages remain retryable',async()=>{
 const order:string[]=[];let paths=['company/photo'];let fail=true;
 const service={prepare:async()=>{order.push('prepare');},paths:async()=>paths,removeFiles:async()=>{order.push('files');if(fail)throw Error('synthetic interruption');paths=[];},removeData:async()=>{order.push('data');},deleteAuthUser:async()=>{order.push('auth');}};
 await assert.rejects(eraseAccount('synthetic-user',true,service),/interruption/);assert.deepEqual(order,['prepare','files']);fail=false;order.length=0;
 await eraseAccount('synthetic-user',true,service);assert.deepEqual(order,['prepare','files','data','auth']);
});
test('recent password authentication cannot be replaced by a refreshed token timestamp',()=>{
 assert.equal(recentPasswordAuthentication({iat:1000,amr:[{method:'password',timestamp:999}]},1000),true);
 for(const value of [{iat:1000},{amr:[{method:'password',timestamp:600}]},{amr:[{method:'oauth',timestamp:999}]},{amr:[{method:'password',timestamp:1001}]}])assert.equal(recentPasswordAuthentication(value,1000),false);
});
