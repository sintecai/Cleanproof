import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseNativeProfile} from '../src/application/nativeWorkspaceSelection.ts';
import {NativeSessionStorage} from '../src/auth/nativeSessionStorage.ts';
import {AuthConnection,type Session} from '../src/auth/session.ts';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',c='20000000-0000-4000-8000-000000000001';
const identity={user_id:a,company:c,origin:'https://example.supabase.co'};
test('native workspace selection reuses UUID identity, never another account or environment',()=>{
 const candidates=[{profile:'legacy',binding:identity},{profile:'other',binding:{...identity,user_id:b}}];
 assert.equal(chooseNativeProfile(candidates,identity,null),'legacy');
 assert.equal(chooseNativeProfile(candidates,{...identity,user_id:b},null),'other');
 assert.equal(chooseNativeProfile(candidates,{...identity,origin:'https://other.supabase.co'},null),null);
 assert.throws(()=>chooseNativeProfile(candidates,{...identity,user_id:b},'legacy'),/preserved/);
 assert.throws(()=>chooseNativeProfile([...candidates,{profile:'duplicate',binding:identity}],identity,null),/More than one/);
 assert.equal(chooseNativeProfile([...candidates,{profile:'duplicate',binding:identity}],identity,'legacy'),'legacy');
});
test('native session adapter validates tokens, clears session only and retains workspace material',async()=>{
 const data=new Map([['workspace-key','protected-key'],['unsent-queue','protected-queue']]);
 const storage=new NativeSessionStorage({read:async k=>data.get(k)??null,write:async(k,v)=>{data.set(k,v);},remove:async k=>{data.delete(k);}},'session');
 const session:Session={access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_at:9999999999,user:{id:a}};
 await storage.save(session);assert.deepEqual(await storage.load(),session);await storage.clear();assert.equal(await storage.load(),null);assert.equal(data.get('workspace-key'),'protected-key');assert.equal(data.get('unsent-queue'),'protected-queue');
 data.set('session','{}');await assert.rejects(storage.load(),/preserved/);
});
test('native recovery accepts exact approved release callbacks and rejects arbitrary redirects',async()=>{
 let requests=0;const storage={load:async()=>null,save:async()=>{},clear:async()=>{}};
 const auth=new AuthConnection({url:'https://example.supabase.co',key:'sb_publishable_synthetic'},storage,async(url,init)=>{requests++;assert.equal(new URL(url).searchParams.get('redirect_to'),'cleanproof-staging://reset-password');assert.equal(JSON.parse(String(init?.body)).code_challenge_method,'s256');return Response.json({});});
 await auth.requestReset('synthetic@example.test',{redirectTo:'cleanproof-staging://reset-password',challenge:'a'.repeat(43)});
 for(const bad of ['cleanproof-staging://reset-password?next=evil','evil://reset-password','cleanproof://other'])await assert.rejects(auth.requestReset('synthetic@example.test',{redirectTo:bad,challenge:'a'.repeat(43)}));
 assert.equal(requests,1);
});
