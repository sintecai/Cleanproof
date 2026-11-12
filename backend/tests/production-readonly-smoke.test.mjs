import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const path=new URL('../production-readonly-smoke.mjs',import.meta.url);
const privilegedFixture=['sb','secret','synthetic_NEVER_ECHO'].join('_');
test('production smoke rejects privileged or foreign configuration without echoing values',()=>{
 for(const input of [JSON.stringify({url:'https://decysnpygturutfyjofi.supabase.co',key:privilegedFixture}),JSON.stringify({url:'https://foreign.invalid/private-synthetic-value',key:'sb_publishable_fixture'})]){
  const r=spawnSync(process.execPath,[path.pathname],{input,encoding:'utf8'});assert.notEqual(r.status,0);assert.ok(!r.stderr.includes(privilegedFixture));assert.ok(!r.stderr.includes('private-synthetic-value'));assert.equal(r.stdout,'');
 }
});
test('malformed public configuration never appears in parse diagnostics',()=>{
 const r=spawnSync(process.execPath,[path.pathname],{input:'{"key":"synthetic_NEVER_ECHO",',encoding:'utf8'});assert.notEqual(r.status,0);assert.ok(!r.stderr.includes('synthetic_NEVER_ECHO'));assert.equal(r.stdout,'');
});
