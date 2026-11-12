import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execute, selectDevice, redact } from './android-device-handoff.mjs';
test('ambiguous and unauthorised devices are refused', () => {
 assert.throws(() => selectDevice('List of devices attached\na\tunauthorized\n'));
 assert.throws(() => selectDevice('a\tdevice\nb\tdevice\n'));
 assert.equal(selectDevice('a\tdevice\nb\tdevice\n','b'),'b');
});
test('changed APK or mismatched installed certificate never invokes installation or launch', () => {
 const folder=mkdtempSync(join(tmpdir(),'cp-handoff-'));const apk=join(folder,'fixture.apk');writeFileSync(apk,'synthetic APK code fixture');
 const identity={package:'com.synthetic.fixture',sha256:createHash('sha256').update('synthetic APK code fixture').digest('hex'),certificate:'a'.repeat(64)};
 const calls=[];const runner=(tool,args)=>{
  calls.push(args);
  if(tool==='java')return {code:0,text:'Signer #1 certificate SHA-256 digest: '+(args.at(-1)===apk?'a':'b').repeat(64)};
  if(args[0]==='devices')return {code:0,text:'one\tdevice\n'};
  if(args.includes('getprop'))return {code:0,text:args.at(-1)==='ro.product.cpu.abilist'?'arm64-v8a':args.at(-1)==='ro.build.version.sdk'?'35':'synthetic'};
  if(args.includes('path'))return {code:0,text:'package:/data/app/fixture/base.apk'};
  if(args.includes('pull')){writeFileSync(args.at(-1),'synthetic installed code');return {code:0,text:''};}
  throw Error('Unexpected command');
 };
 try {
  assert.throws(()=>execute({apk,apksigner:'fixture.jar',install:true,launch:true,syntheticTestDevice:true},runner,identity),/Installed signing identity differs/);
  assert.equal(calls.some(a=>a.includes('install')||a.includes('start')),false);
  let touched=false;
  assert.throws(()=>execute({apk},()=>{touched=true;}, {...identity,sha256:'0'.repeat(64)}),/APK hash differs/);
  assert.equal(touched,false);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
test('log redaction omits credentials and email lines',()=>{
 const s=redact('Authorization: Bearer private\nemail demo@example.test\nRefreshToken=private\nordinary error');
 assert.ok(!s.includes('private'));assert.ok(!s.includes('demo@example.test'));assert.ok(s.includes('ordinary error'));
});
test('retained package data blocks installation; lost launch preserves the installer acknowledgement',()=>{
 const folder=mkdtempSync(join(tmpdir(),'cp-handoff-'));const apk=join(folder,'fixture.apk');writeFileSync(apk,'synthetic fixture');
 const identity={package:'com.synthetic.fixture',sha256:createHash('sha256').update('synthetic fixture').digest('hex'),certificate:'a'.repeat(64)};
 let retained=true,installs=0;const records=[];
 const runner=(tool,args)=>{
  if(tool==='java')return {code:0,text:'V2 Signer: certificate SHA-256 digest: '+'a'.repeat(64)};
  if(args[0]==='devices')return {code:0,text:'one\tdevice\n'};
  if(args.includes('getprop'))return {code:0,text:args.at(-1)==='ro.product.cpu.abilist'?'arm64-v8a':args.at(-1)==='ro.build.version.sdk'?'35':'synthetic'};
  if(args.includes('path'))return {code:installs?0:1,text:installs?'package:/data/app/fixture/base.apk':''};
  if(args.includes('pull')){writeFileSync(args.at(-1),'synthetic fixture');return {code:0,text:''};}
  if(args.includes('packages'))return {code:0,text:retained?'package:com.synthetic.fixture':''};
  if(args.includes('install')){installs++;return {code:0,text:'Success\n'};}
  if(args.includes('start'))return {code:1,text:'activity failed'};
  throw Error('Unexpected command');
 };
 try {
  const options={apk,apksigner:'fixture.jar',install:true,launch:true,syntheticTestDevice:true,record:e=>records.push(structuredClone(e))};
  assert.throws(()=>execute(options,runner,identity),/retained installation/);assert.equal(installs,0);
  retained=false;
  assert.throws(()=>execute(options,runner,identity),/Local command failed/);
  assert.equal(installs,1);assert.match(records.at(-1).install,/installer returned Success/);assert.equal(records.at(-1).nativeWorkflow,'Not run: manual observations required');
 }finally{rmSync(folder,{recursive:true,force:true});}
});
test('same certificate cannot label a different installed APK as the exact acceptance target',()=>{
 const folder=mkdtempSync(join(tmpdir(),'cp-handoff-'));const apk=join(folder,'fixture.apk');writeFileSync(apk,'new code');
 const identity={package:'com.synthetic.fixture',sha256:createHash('sha256').update('new code').digest('hex'),certificate:'a'.repeat(64)};let starts=0;
 const runner=(tool,args)=>{
  if(tool==='java')return {code:0,text:'Signer #1 certificate SHA-256 digest: '+'a'.repeat(64)};
  if(args[0]==='devices')return {code:0,text:'one\tdevice\n'};
  if(args.includes('getprop'))return {code:0,text:args.at(-1)==='ro.product.cpu.abilist'?'arm64-v8a':args.at(-1)==='ro.build.version.sdk'?'35':'synthetic'};
  if(args.includes('path'))return {code:0,text:'package:/data/app/fixture/base.apk'};
  if(args.includes('pull')){writeFileSync(args.at(-1),'old code');return {code:0,text:''};}
  if(args.includes('install'))return {code:0,text:'Success\n'};
  if(args.includes('start')){starts++;throw Error('Must never launch');}
  throw Error('Unexpected command');
 };
 try {
  assert.throws(()=>execute({apk,apksigner:'fixture.jar',launch:true,syntheticTestDevice:true},runner,identity),/older signed build/);
  assert.throws(()=>execute({apk,apksigner:'fixture.jar',install:true,launch:true,syntheticTestDevice:true},runner,identity),/Installed code differs/);
  assert.equal(starts,0);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
