import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareEmailLink,readEmailCallback,hasAuthFragment,emailCallback} from '../src/auth/emailLinks.ts';
import {AuthConnection,type SessionStorage,type Session} from '../src/auth/session.ts';
import {ProtectedBrowserAuth,ProtectedBrowserSession,type AuthRecordStore} from '../src/auth/protectedBrowserAuth.ts';
const origin='https://cleanproof.example',backend='https://staging.supabase.co';
const config={url:backend,key:'sb_publishable_synthetic'};
const memory=()=>({load:async()=>null,save:async(_:Session)=>{},clear:async()=>{}} satisfies SessionStorage);
test('signup, resend and recovery explicitly request exact HTTPS PKCE callbacks',async()=>{
 const calls:{url:string;body:any}[]=[];
 const auth=new AuthConnection(config,memory(),async(url,init)=>{calls.push({url,body:JSON.parse(String(init?.body))});return new Response('{}',{status:200});});
 const p=await prepareEmailLink(origin,backend,'signup','/sites',1000);
 const opt={redirectTo:emailCallback(origin,'signup'),challenge:p.challenge};
 await auth.signUp('synthetic@example.test','synthetic-password','Synthetic',opt);await auth.resendSignup('synthetic@example.test',opt);
 await auth.requestReset('synthetic@example.test',{...opt,redirectTo:emailCallback(origin,'recovery')});
 for(const [i,c] of calls.entries()){
  assert.equal(new URL(c.url).searchParams.get('redirect_to'),origin+(i===2?'/reset-password.html':'/email-callback.html'));
  assert.equal(c.body.code_challenge,p.challenge);assert.equal(c.body.code_challenge_method,'s256');assert.equal(c.body.token,undefined);
 }
 assert.throws(()=>emailCallback('http://localhost:3000','signup'));
 await assert.rejects(auth.signUp('synthetic@example.test','synthetic-password','Synthetic',{...opt,redirectTo:origin+'/email-callback.html?next=https://evil.example'}));
 assert.equal(calls.length,3);
});
test('email callback rejects replay/missing verifier, cross-service, expired, wrong purpose and implicit tokens',async()=>{
 const p=await prepareEmailLink(origin,backend,'signup','/sites',1000);
 assert.equal(readEmailCallback(p,origin,backend,'signup',new URLSearchParams('code=synthetic'),1001).destination,'/sites');
 for(const v of [null,{...p,origin:'https://other.example'},{...p,backend:'https://other.supabase.co'},{...p,purpose:'recovery'},{...p,verifier:'bad'},{...p,created:2000}])assert.throws(()=>readEmailCallback(v,origin,backend,'signup',new URLSearchParams('code=synthetic'),1001));
 assert.throws(()=>readEmailCallback(p,origin,backend,'signup',new URLSearchParams('code=synthetic'),86401001));
 for(const q of ['code=a&code=b','error=access_denied','token_hash=synthetic','refresh_token=synthetic'])assert.throws(()=>readEmailCallback(p,origin,backend,'signup',new URLSearchParams(q),1001));
 assert.equal(hasAuthFragment('#access_token=synthetic&refresh_token=synthetic'),true);
 assert.equal(hasAuthFragment('#section'),false);
});
function records(){const values=new Map<string,any>();const store:AuthRecordStore={read:async k=>values.get(k),write:async(k,v)=>{values.set(k,v);},claim:async(k,v)=>{if(!values.has(k))values.set(k,v);return values.get(k);}};return {values,store};}
const session:Session={access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_at:9000,user:{id:'00000000-0000-4000-8000-000000000001'}};
test('browser session and mail transaction survive reopen encrypted, then clear without deleting workspace data',async()=>{
 const r=records();r.values.set('workspace','acknowledged');const a=new ProtectedBrowserAuth(r.store,backend);const storage=new ProtectedBrowserSession(a);
 await storage.save(session);await a.write('email-signup',{verifier:'synthetic'});
 const envelope=r.values.get(backend+':session');assert.ok(envelope.sealed instanceof ArrayBuffer);assert.ok(!JSON.stringify(envelope).includes('synthetic-access'));
 const key=r.values.get('key:'+backend);assert.equal(key.extractable,false);
 const again=new ProtectedBrowserSession(new ProtectedBrowserAuth(r.store,backend));assert.deepEqual(await again.load(),session);
 await again.clear();assert.equal(await again.load(),null);assert.equal(r.values.get('workspace'),'acknowledged');
});
test('missing/corrupt browser auth key and cross-record substitution fail closed without a reset',async()=>{
 const r=records();const a=new ProtectedBrowserAuth(r.store,backend);await new ProtectedBrowserSession(a).save(session);
 const envelope=r.values.get(backend+':session');r.values.set(backend+':email-signup',envelope);
 await assert.rejects(a.read('email-signup'));r.values.delete('key:'+backend);
 await assert.rejects(a.read('session'));assert.equal(r.values.get(backend+':session'),envelope);
});
test('browser auth write failures cannot report persisted success',async()=>{
 const r=records();const a=new ProtectedBrowserAuth({...r.store,write:async()=>{throw Error('storage full');}},backend);
 await assert.rejects(new ProtectedBrowserSession(a).save(session),/storage full/);
});

test('invalid recovery links expose only static recovery guidance, never callback values',async()=>{
 const {EmailLinkError}=await import('../src/auth/emailLinks.ts');
 const query=new URLSearchParams({error:'access_denied',error_description:'sensitive-provider-description',code:'sensitive-one-use-code'});
 assert.throws(()=>readEmailCallback(null,'https://cleanproof.example','https://example.supabase.co','recovery',query),e=>e instanceof EmailLinkError&&/expired/.test(e.message)&&!e.message.includes('sensitive'));
 assert.throws(()=>readEmailCallback(null,'https://cleanproof.example','https://example.supabase.co','recovery',new URLSearchParams()),e=>e instanceof EmailLinkError&&/request a new recovery link here/.test(e.message));
});
