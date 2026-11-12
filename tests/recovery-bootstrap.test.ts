import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recoveryBootstrap} from '../src/auth/recoveryBootstrap.ts';
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
test('native recovery effect replay exchanges once and delivers the session to replacement mount',async()=>{
 let exchanges=0,retired=0;let complete!:(v:{retire():void})=>void;
 const pending=new Promise<{retire():void}>(resolve=>{complete=resolve;});
 const flow=recoveryBootstrap(()=>{exchanges++;return pending;});
 const stale:unknown[]=[],active:unknown[]=[];
 const off=flow.subscribe(r=>stale.push(r));off();
 const finish=flow.subscribe(r=>active.push(r));
 await tick();assert.equal(exchanges,1);assert.equal(retired,0);
 complete({retire(){retired++;}});await tick();
 assert.equal(stale.length,0);assert.equal(active.length,1);assert.equal(retired,0);
 finish();await tick();assert.equal(retired,1);
});
test('late exchange after screen closes retires private session without notifying an unmounted view',async()=>{
 let complete!:(v:{retire():void})=>void,retired=0,notified=0;
 const flow=recoveryBootstrap(()=>new Promise<{retire():void}>(resolve=>{complete=resolve;}));
 const off=flow.subscribe(()=>{notified++;});await tick();off();await tick();
 complete({retire(){retired++;}});await tick();
 assert.equal(notified,0);assert.equal(retired,1);
});
test('exchange errors are safe and recoverable, never tokens or raw server errors',async()=>{
 const flow=recoveryBootstrap(async()=>{throw Error('synthetic-private-detail');});let result:unknown;
 const off=flow.subscribe(r=>{result=r;});await tick();assert.deepEqual(result,{error:true});off();await tick();
});
