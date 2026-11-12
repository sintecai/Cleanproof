import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './fixture.mjs';
function packet(company,name='Office cleaning inspection',title='Washroom cleanliness',section){
 const id=randomUUID();return {templates:[{id,company_id:company,name,archived:0}],template_versions:[{id:randomUUID(),company_id:company,template_id:id,version:1,name,items_json:JSON.stringify([{id:'washroom',title,...(section===undefined?{}:{section})}])}]};
}
test('server constraint accepts valid boundaries and optional section; rejects invalid names/items without exposing a helper RPC',async()=>{
 const f=await fixture();try{
  for(const [name,title,section] of [['Office cleaning inspection','Washroom cleanliness',undefined],['a'.repeat(120),'a'.repeat(240),'s'.repeat(120)],['Office','Évier propre','  ']]){
   const data=packet(f.a,name,title,section);await f.db.query("insert into cp_packets values($1,'template',$2,null,$1,$3,1,1)",[f.a,data.templates[0].id,data]);
  }
  for(const [name,title,section] of [['','Washroom',undefined],[' \t\n','Washroom',undefined],['\u00a0','Washroom',undefined],['a'.repeat(121),'Washroom',undefined],['Office','  ',undefined],['Office','---',undefined],['Office','a'.repeat(241),undefined],['Office','Washroom','s'.repeat(121)]]){
   const data=packet(f.a,name,title,section);await assert.rejects(f.db.query("insert into cp_packets values($1,'template',$2,null,$1,$3,1,1)",[f.a,data.templates[0].id,data]),/cp_packets_checklist_fields/);
  }
  assert.equal((await f.db.query("select has_function_privilege('anon','public.cp_checklist_fields_valid(jsonb)','execute') a,has_function_privilege('authenticated','public.cp_checklist_fields_valid(jsonb)','execute') b")).rows[0].a,false);
 }finally{await f.db.close();}
});
