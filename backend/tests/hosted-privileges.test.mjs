import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
test('hosted direct default grants cannot expose internal helpers or photo acknowledgements',async()=>{
 const {db}=await fixture();
 try {
  const {rows}=await db.query("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cp_%' and has_function_privilege('anon',p.oid,'EXECUTE')");
  assert.equal(rows.length,0);
  const {rows:[p]}=await db.query("select has_function_privilege('authenticated','public.cp_sync_candidate(uuid,text,text,jsonb)','EXECUTE') as helper,has_function_privilege('authenticated','public.cp_photo_finish(uuid,text,integer)','EXECUTE') as client_ack,has_function_privilege('service_role','public.cp_photo_finish(uuid,text,integer)','EXECUTE') as server_ack,has_function_privilege('authenticated','public.cp_register_company(uuid,text,text,text)','EXECUTE') as onboarding");
  assert.equal(p.helper,false);assert.equal(p.client_ack,false);assert.equal(p.server_ack,true);assert.equal(p.onboarding,true);
 } finally {await db.close();}
});
