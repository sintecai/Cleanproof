import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,users} from './fixture.mjs';
test('deletion intake is authenticated, idempotent and isolated; never erases an account or business records',async()=>{
 const f=await fixture();try{
  await f.db.exec(await readFile(new URL('../../supabase/migrations/202610310001_account_deletion_requests.sql',import.meta.url),'utf8'));
  const before=(await f.db.query('select count(*)::int n from auth.users')).rows[0].n;
  const request=()=>f.as(users.alice,'select cp_request_account_deletion() as result');
  const first=(await request()).rows[0].result,again=(await request()).rows[0].result;
  assert.equal(first.request_id,again.request_id);assert.equal(first.state,'requested');
  assert.equal((await f.as(users.bob,'select * from cp_account_deletion_requests')).rows.length,0);
  await assert.rejects(f.as(users.bob,'insert into cp_account_deletion_requests(user_id) values($1)',[users.alice]),/row-level security/);
  await assert.rejects(f.as(users.alice,"update cp_account_deletion_requests set state='completed'"),/permission denied/);
  await assert.rejects(f.as(null,'select cp_request_account_deletion()'),/permission denied|Authentication required/);
  assert.equal((await f.db.query('select count(*)::int n from auth.users')).rows[0].n,before);
 }finally{await f.db.close();}
});
