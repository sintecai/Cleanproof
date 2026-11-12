import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {NodeDatabase} from './support/nodeDatabase.ts';
import {migrate} from '../src/storage/migrations.ts';
import {Catalogue} from '../src/storage/catalogue.ts';
import {InspectionRepository} from '../src/storage/inspectionRepository.ts';
import {WorkflowRepository} from '../src/storage/workflowRepository.ts';
import {changeResponse} from '../src/domain/inspection.ts';
const now=()=>new Date().toISOString();
async function setup(){const db=new NodeDatabase(':memory:');await migrate(db);const company=randomUUID(),c=new Catalogue(db,company,randomUUID,now);const customer=await c.customer('Synthetic client','');const site=await c.site(customer,'Belfast (synthetic)','','Europe/London','');await db.runAsync('INSERT INTO company_settings VALUES(?,?,?)',company,'Synthetic cleaning','');return {db,company,c,customer,site};}
test('empty, missing-version and archived checklists are explained; publication becomes selectable',async()=>{
 const {db,company,c,site}=await setup();
 assert.deepEqual((await c.inspectionOptions()).checklists,[]);const template=randomUUID();
 await db.runAsync('INSERT INTO templates(id,company_id,name) VALUES(?,?,?)',template,company,'New checklist');
 assert.equal((await c.inspectionOptions()).incomplete,1);
 const version=await c.template('New checklist',[{id:'floor',title:'Floor clean'}],template);
 const choices=await c.inspectionOptions();assert.equal(choices.incomplete,0);assert.equal(choices.sites[0]?.id,site);assert.equal(choices.checklists[0]?.id,version);assert.equal(choices.checklists[0]?.itemCount,1);
 await c.archive('templates',template);const archived=await c.inspectionOptions();assert.equal(archived.archived,1);assert.equal(archived.checklists.length,0);await assert.rejects(c.newDraft(site,version));await db.close();
});
test('publication retries and concurrent draft clicks are idempotent without changing snapshots',async()=>{
 const {db,c,site}=await setup();const template=randomUUID(),version=randomUUID(),draftId=randomUUID(),items=[{id:'floor',title:'Original wording'}];
 await c.template('Daily',items,template,version);await c.template('Daily',items,template,version);
 assert.equal((await c.versions()).length,1);await assert.rejects(c.template('Changed',items,template,version));
 const ids=await Promise.all([c.newDraft(site,version,draftId),c.newDraft(site,version,draftId)]);assert.deepEqual(ids,[draftId,draftId]);
 assert.equal((await c.history()).length,1);const events=await db.getFirstAsync<{n:number}>("SELECT count(*) n FROM local_events WHERE kind='draft_created_v1'");assert.equal(events?.n,1);
 await c.template('Daily revised',[{id:'floor',title:'New wording'}],template);assert.equal((await c.context(draftId)).workspace.items[0]?.title,'Original wording');
 await assert.rejects(c.newDraft(randomUUID(),version,draftId));await db.close();
});
test('company-scoped selector rejects foreign versions/sites and inspector cannot publish',async()=>{
 const {db,c,company,site,customer}=await setup();const version=await c.template('Local',[{id:'floor',title:'Floor'}]);const foreign=new Catalogue(db,randomUUID(),randomUUID,now);
 assert.equal((await foreign.inspectionOptions()).sites.length,0);assert.equal((await foreign.inspectionOptions()).checklists.length,0);await assert.rejects(foreign.newDraft(site,version));
 await db.runAsync('INSERT INTO business_binding VALUES(1,?,?,?,?,?,?,?)',randomUUID(),company,company,'https://example.supabase.co','inspector',0,now());
 assert.equal((await c.inspectionOptions()).canCreate,false);await assert.rejects(c.template('Forbidden',[{id:'x',title:'X'}]),/owner/);
 await db.runAsync('UPDATE customers SET archived=1 WHERE id=?',customer);assert.equal((await c.inspectionOptions()).sites.length,0);await assert.rejects(c.newDraft(site,version));await db.close();
});
test('unreadable latest version is not silently replaced by an older version',async()=>{
 const {db,c,company}=await setup();const version=await c.template('Daily',[{id:'floor',title:'Floor'}]);const template=(await c.versions()).find(v=>v.id===version)!.template_id;
 await db.runAsync('INSERT INTO template_versions VALUES(?,?,?,?,?,?)',randomUUID(),company,template,2,'Broken','[]');
 const choices=await c.inspectionOptions();assert.equal(choices.invalid,1);assert.equal(choices.checklists.length,0);await db.close();
});
test('published checklist creates draft, saves Pass Fail NA, reopens and completes into history',async()=>{
 const {db,c,company,site}=await setup();const version=await c.template('Inspection',[{id:'floor',title:'Floor'},{id:'sink',title:'Sink'},{id:'stock',title:'Stock'}]);
 const id=await c.newDraft(site,version,randomUUID()),context=await c.context(id),repo=new InspectionRepository(db,context.workspace,now,randomUUID);
 let draft=(await repo.load()).draft;for(const [item,result,note] of [['floor','pass','Checked'],['sink','fail','Sink needs cleaning'],['stock','na','No supplies included']] as const)draft=changeResponse(draft,item,{result,note},context.workspace);
 await repo.save(draft,0);const reopened=new InspectionRepository(db,(await c.context(id)).workspace,now,randomUUID);assert.equal((await reopened.load()).draft.responses.sink?.note,'Sink needs cleaning');
 const owner=randomUUID();await db.runAsync('INSERT INTO local_people(id,company_id,name) VALUES(?,?,?)',owner,company,'Synthetic inspector');const workflow=new WorkflowRepository(db,company,randomUUID,now);
 await workflow.createAction(id,'sink','Clean sink',owner,'2026-12-01');await workflow.complete(id,1,'Synthetic inspector',[]);
 assert.equal((await workflow.lifecycle(id)).status,'completed');assert.ok((await workflow.history()).some(h=>h.id===id&&h.status==='completed'));assert.equal((await c.context(id)).workspace.templateVersionId,version);await db.close();
});
