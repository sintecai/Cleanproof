import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SingleFlight} from '../src/auth/singleFlight.ts';
test('remount shares pending session restoration; retry is allowed after failure',async()=>{
 const owner=new SingleFlight<number>();let calls=0;let finish!:(n:number)=>void;
 const task=()=>{calls++;return new Promise<number>(resolve=>{finish=resolve;});};
 const a=owner.run(task),b=owner.run(task);assert.equal(a,b);await Promise.resolve();assert.equal(calls,1);finish(4);assert.equal(await b,4);await a;
 await assert.rejects(owner.run(async()=>{throw Error('interrupted');}));
 assert.equal(await owner.run(async()=>5),5);
});
