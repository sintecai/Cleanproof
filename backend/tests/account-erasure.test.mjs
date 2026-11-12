import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,users} from './fixture.mjs';
test('actual erasure coordinator blocks sole-owner abandonment and deletes only explicitly closed companies',async()=>{
 const f=await fixture();try{
  await f.db.exec(await readFile(new URL('../../supabase/migrations/20261031052502_account_erasure_lifecycle.sql',import.meta.url),'utf8'));
  const c=(await f.db.query("insert into cp_companies(name) values('Synthetic deletion company') returning id")).rows[0].id;
  await f.db.query("insert into cp_memberships values($1,$2,'owner',true),($1,$3,'inspector',true)",[c,users.alice,users.inspector]);
  await assert.rejects(f.as(users.alice,'select cp_erasure_prepare($1,true)',[users.bob]),/permission denied/);
  await assert.rejects(f.db.query('select cp_erasure_prepare($1,true)',[users.alice]),/Transfer company ownership/);
  assert.equal((await f.db.query('select active from cp_memberships where user_id=$1',[users.alice])).rows[0].active,true);
  await f.db.query('update cp_memberships set active=false where user_id=$1',[users.inspector]);
  await assert.rejects(f.db.query('select cp_erasure_prepare($1,false)',[users.alice]),/Transfer company ownership/);
  await f.db.exec('set role service_role');
  const prepared=(await f.db.query('select cp_erasure_prepare($1,true) as result',[users.alice])).rows[0].result;
  await f.db.exec('reset role');
  assert.ok(prepared.companies.includes(c));assert.ok(!prepared.companies.includes(f.b));
  await f.db.query("insert into storage.objects values(gen_random_uuid(),$1,'cleanproof-private')",[c+'/synthetic.jpg']);
  await assert.rejects(f.db.query('select cp_erasure_remove_data($1)',[users.alice]),/Private files/);
  await f.db.query("delete from storage.objects where name=$1",[c+'/synthetic.jpg']);
  await f.db.exec('set role service_role');await f.db.query('select cp_erasure_remove_data($1)',[users.alice]);await f.db.query('select cp_erasure_remove_data($1)',[users.alice]);await f.db.exec('reset role');
  assert.equal((await f.db.query('select * from cp_companies where id=$1',[c])).rows.length,0);
  // Real hosted execution deletes via the Auth Admin API. Fixture proves FK compatibility only.
  await f.db.query('delete from auth.users where id=$1',[users.alice]);
  assert.equal((await f.db.query('select * from auth.users where id=$1',[users.bob])).rows.length,1);
 }finally{await f.db.close();}
});
test('co-owned company survives personal account erasure and historical author FK is anonymised',async()=>{
 const f=await fixture();try{
  await f.db.exec(await readFile(new URL('../../supabase/migrations/20261031052502_account_erasure_lifecycle.sql',import.meta.url),'utf8'));
  await f.db.query("insert into cp_memberships values($1,$2,'owner',true)",[f.a,users.bob]);
  const plan=(await f.db.query('select cp_erasure_prepare($1,false) as result',[users.alice])).rows[0].result;assert.deepEqual(plan.companies,[]);
  await f.db.query('select cp_erasure_remove_data($1)',[users.alice]);await f.db.query('delete from auth.users where id=$1',[users.alice]);
  const records=(await f.as(users.bob,'select actor_id from cp_records where company_id=$1',[f.a])).rows;assert.ok(records.length>0);assert.ok(records.every(r=>r.actor_id===null));
  assert.equal((await f.db.query('select * from cp_companies where id=$1',[f.a])).rows.length,1);
 }finally{await f.db.close();}
});
test('service erasure guard rejects another user, expired and revoked sessions; completion requires Auth removal',async()=>{
 const f=await fixture();try{
  await f.db.exec('create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz)');
  await f.db.exec(await readFile(new URL('../../supabase/migrations/20261031052502_account_erasure_lifecycle.sql',import.meta.url),'utf8'));
  await f.db.exec(await readFile(new URL('../../supabase/migrations/20261031102941_erasure_session_guard.sql',import.meta.url),'utf8'));
  const session='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  await f.db.query('insert into auth.sessions values($1,$2,null)',[session,users.alice]);
  await assert.rejects(f.as(users.alice,'select cp_erasure_session_active($1,$2)',[users.alice,session]),/permission denied/);
  await f.db.exec('set role service_role');
  const active=async u=>(await f.db.query('select cp_erasure_session_active($1,$2) as active',[u,session])).rows[0].active;
  assert.equal(await active(users.alice),true);assert.equal(await active(users.bob),false);
  await assert.rejects(f.db.query('select cp_erasure_finish($1)',[users.alice]),/not acknowledged/);
  await f.db.exec('reset role');await f.db.query("update auth.sessions set not_after=now()-interval '1 second'");await f.db.exec('set role service_role');assert.equal(await active(users.alice),false);
  await f.db.exec('reset role');await f.db.exec('delete from auth.sessions');await f.db.exec('set role service_role');assert.equal(await active(users.alice),false);
 }finally{await f.db.close();}
});
