import test from 'node:test';import assert from 'node:assert/strict';import {AuthAttemptGate} from '../src/auth/attemptGate.ts';
test('device attempt windows bound repeated calls without storing account identifiers and expire',()=>{
 let now=0;const g=new AuthAttemptGate(()=>now);for(let i=0;i<5;i++)g.take('signin');assert.throws(()=>g.take('signin'),/Wait one minute/);g.take('signup');now=60000;g.take('signin');
});
