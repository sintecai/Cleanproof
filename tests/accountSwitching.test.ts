import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AuthConnection,type Session} from '../src/auth/session.ts';
import {removeRememberedAccounts} from '../src/auth/rememberedAccounts.ts';
const make=(id=randomUUID()):Session=>({user:{id,email:id+'@example.test'},access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_at:9999999999});
test('obsolete identity hints are removed without touching sessions, keys or saved work',async()=>{
 const records=new Map<string,unknown>([['remembered-accounts-v1',[{email:'synthetic@example.test'}]],['session','protected-session'],['key','protected-key'],['work','encrypted-work']]);
 await removeRememberedAccounts({clear:async(k)=>{records.set(k,null);}});
 assert.equal(records.get('remembered-accounts-v1'),null);
 assert.equal(records.get('session'),'protected-session');assert.equal(records.get('key'),'protected-key');assert.equal(records.get('work'),'encrypted-work');
 await removeRememberedAccounts({clear:async(k)=>{records.set(k,null);}});assert.equal(records.get('work'),'encrypted-work');
});
test('retired account cannot restore another account session or issue subsequent sync requests',async()=>{
 let saved:Session|null=make();const storage={load:async()=>saved,save:async(s:Session)=>{saved=s;},clear:async()=>{saved=null;}};
 let calls=0;const a=new AuthConnection({url:'https://example.supabase.co',key:'sb_publishable_synthetic'},storage,async()=>{calls++;return new Response('{}');});
 await a.restore();const external=new AbortController();a.trackRequest(external);
 a.retire();assert.equal(external.signal.aborted,true);const b=make();saved=b;
 await assert.rejects(a.restore(),/session has ended/);await assert.rejects(a.token(),/session has ended/);await assert.rejects(a.rpc('cp_sync_pull',{}));await assert.rejects(a.signIn('test@example.test','synthetic-password'));
 assert.equal(calls,0);assert.equal(saved,b);assert.equal(a.session(),null);
});
test('logout aborts an interrupted old request, clears durable session and fences a late response',async()=>{
 let saved:Session|null=make(),respond!:(r:Response)=>void,signal:AbortSignal|undefined;
 const storage={load:async()=>saved,save:async(s:Session)=>{saved=s;},clear:async()=>{saved=null;}};
 const a=new AuthConnection({url:'https://example.supabase.co',key:'sb_publishable_synthetic'},storage,async(url,options)=>{
  if(url.includes('/logout'))return new Response(null,{status:204});
  signal=options?.signal as AbortSignal;return new Promise<Response>(resolve=>{respond=resolve;});
 });
 await a.restore();const pending=a.rpc('cp_sync_pull',{});await new Promise(r=>setImmediate(r));
 const leaving=a.signOut();assert.equal(signal?.aborted,true);respond(new Response('{}'));await assert.rejects(pending,/cancelled/);await leaving;a.retire();
 assert.equal(saved,null);assert.equal(a.session(),null);
});
