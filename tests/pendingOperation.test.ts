import test from 'node:test';import assert from 'node:assert/strict';import{PendingOperation}from'../src/auth/pendingOperation.js';
test('hung opening reaches timeout, permits retry and cannot later publish stale access',async()=>{
 const gate=new PendingOperation();let finish!:()=>void;let published=false;
 const old=gate.run(async check=>{await new Promise<void>(r=>finish=r);check();published=true;},5,'Opening timed out; retry');
 await assert.rejects(old,/timed out/);assert.equal(await gate.run(async check=>{check();return 'reopened';},50,'timeout'),'reopened');
 finish();await new Promise(r=>setImmediate(r));assert.equal(published,false);
});
test('unmount/sign-out fences late opening results without mutating saved credentials',async()=>{
 const gate=new PendingOperation();let finish!:()=>void;const storage={session:'protected-saved-session'};let published=false;
 const pending=gate.run(async check=>{await new Promise<void>(r=>finish=r);check();published=true;},50,'timeout');gate.invalidate();finish();await assert.rejects(pending,/superseded/);assert.equal(published,false);assert.equal(storage.session,'protected-saved-session');
});
