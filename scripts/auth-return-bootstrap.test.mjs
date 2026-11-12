import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {authReturnBootstrap} from './auth-return-bootstrap.mjs';
const script=authReturnBootstrap.match(/<script>([\s\S]*)<\/script>/)[1];
test('pre-bundle callback capture scrubs implicit tokens without storing or reflecting them',()=>{
 const secret='synthetic-NEVER-PRINT';const w={};let replaced;
 vm.runInNewContext(script,{window:w,location:{pathname:'/email-callback/',search:'?error_description='+secret,hash:'#access_token='+secret+'&refresh_token='+secret},URLSearchParams,history:{replaceState:(_,__,v)=>{replaced=v;}}});
 assert.equal(replaced,'/email-callback/');assert.equal(w.__cleanproofAuthReturn.unsupported,true);assert.equal(JSON.stringify(w).includes(secret),false);
});
test('pre-bundle callback capture retains one code only in transient memory and removes URL values',()=>{
 const w={};let replaced;vm.runInNewContext(script,{window:w,location:{pathname:'/email-callback',search:'?code=synthetic',hash:''},URLSearchParams,history:{replaceState:(_,__,v)=>{replaced=v;}}});
 assert.equal(replaced,'/email-callback');assert.equal(w.__cleanproofAuthReturn.code,'synthetic');
});

test('explicit HTML callback avoids directory redirects while preserving error and code handling',()=>{
 const w={};let replaced;vm.runInNewContext(script,{window:w,location:{pathname:'/reset-password.html',search:'?error_code=otp_expired&error_description=synthetic-secret',hash:''},URLSearchParams,history:{replaceState:(_,__,v)=>{replaced=v;}}});
 assert.equal(replaced,'/reset-password');assert.equal(w.__cleanproofAuthReturn.path,'/reset-password');assert.equal(w.__cleanproofAuthReturn.error,'rejected');assert.equal(JSON.stringify(w).includes('synthetic-secret'),false);
});

test('unexpected credential parameters and off-route codes are scrubbed without being captured',()=>{
 for(const [pathname,search,hash] of [['/sites','?create=1&password=synthetic-secret',''],['/sites','?code=synthetic-secret',''],['/settings','','#code=synthetic-secret'],['/email-callback','?code=synthetic-secret&client_secret=synthetic-secret','']]){
  const w={};let replaced;vm.runInNewContext(script,{window:w,location:{pathname,search,hash},URLSearchParams,history:{replaceState:(_,__,v)=>{replaced=v;}}});
  assert.ok(replaced);assert.equal(JSON.stringify(w).includes('synthetic-secret'),false);assert.ok(!replaced.includes('synthetic-secret'));
 }
});
