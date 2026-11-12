// Actual production BusinessEngine/Storage execution with synthetic data, using host
// SQLite and AES-GCM vault adapters. Not a browser/native-device test.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash,webcrypto} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {AuthConnection} from '../.test-build/src/auth/session.js';
import {NodeDatabase} from '../.test-build/tests/support/nodeDatabase.js';
import {migrate} from '../.test-build/src/storage/migrations.js';
import {initialiseFreshCompany} from '../.test-build/src/application/freshCompany.js';
import {BusinessAccess} from '../.test-build/src/sync/business/access.js';
import {BusinessRepository} from '../.test-build/src/sync/business/repository.js';
import {BusinessEngine,transport} from '../.test-build/src/sync/business/engine.js';
import {Catalogue} from '../.test-build/src/storage/catalogue.js';
import {WorkflowRepository} from '../.test-build/src/storage/workflowRepository.js';
import {InspectionRepository} from '../.test-build/src/storage/inspectionRepository.js';
import {changeResponse} from '../.test-build/src/domain/inspection.js';
import {MediaVault} from '../.test-build/src/media/vault.js';
import {inspectionPdf} from '../.test-build/src/reporting/inspectionPdf.js';
if(process.env.CLEANPROOF_RUN_PRODUCTION_ACCEPTANCE!=='1')throw Error('Explicit production synthetic acceptance opt-in required.');
const config=JSON.parse(await readFile(new URL('../deployment/production.web.public.json',import.meta.url)));assert.equal(new URL(config.backendUrl).hostname,'decysnpygturutfyjofi.supabase.co');
let session=null;const auth=new AuthConnection({url:config.backendUrl,key:config.publishableKey},{load:async()=>session,save:async s=>{session=s;},clear:async()=>{session=null;}});
const email='cp-workflow-'+randomUUID()+'@example.com',password=randomBytes(32).toString('base64url');
const results=[],databases=[];let step='signup';const now=()=>new Date().toISOString();
async function local(company){
 const db=new NodeDatabase(':memory:');databases.push(db);await migrate(db);await initialiseFreshCompany(db,auth,company,'Synthetic workflow inspector',randomUUID);await new BusinessAccess(db).grant(auth);
 const files=new Map(),key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const vault=new MediaVault(db,{write:async(n,b)=>{files.set(n,b.slice());},read:async n=>{if(!files.has(n))throw Error('File unavailable');return files.get(n).slice();},move:async(a,b)=>{files.set(b,files.get(a));files.delete(a);},remove:async n=>{files.delete(n);},exists:n=>files.has(n),list:()=>[...files.keys()]},{seal:async(b,context)=>{const iv=randomBytes(12),sealed=new Uint8Array(await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,b));return new Uint8Array([...iv,...sealed]);},open:async(b,context)=>new Uint8Array(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(0,12),additionalData:new TextEncoder().encode(context)},key,b.slice(12))),hash:async b=>createHash('sha256').update(b).digest('hex')},company,randomUUID,now);
 return {db,vault,catalogue:new Catalogue(db,company,randomUUID,now),workflow:new WorkflowRepository(db,company,randomUUID,now),engine:new BusinessEngine(new BusinessRepository(db,randomUUID),vault,transport(auth))};
}
try{
 assert.equal((await auth.registerImmediately(email,password,'Synthetic workflow inspector')).status,'signed-in');
 const company=await auth.rpc('cp_register_company',{request_id:randomUUID(),company_name:'Synthetic full workflow',contact_email:email,company_timezone:'Europe/London'});
 const a=await local(company);step='customer/site/checklist/draft';
 const customer=await a.catalogue.customer('Synthetic customer',''),site=await a.catalogue.site(customer,'Synthetic mobile site','Synthetic address','Europe/London','');
 const item=randomUUID(),version=await a.catalogue.template('Synthetic cleaning checklist',[{id:item,title:'Washroom cleanliness',section:'Washrooms'}]);
 const inspection=await a.catalogue.newDraft(site,version),context=await a.catalogue.context(inspection);
 const repository=new InspectionRepository(a.db,context.workspace,now,randomUUID),draft=await repository.load();
 await repository.save(changeResponse(draft.draft,item,{result:'fail',note:'Synthetic photograph records a cleaning issue.'},context.workspace),draft.localRevision);
 const fixture=JSON.parse(await readFile(new URL('../tests/fixtures/pdf-report.json',import.meta.url)));
 const photo=await a.vault.add(inspection,item,'photo','Synthetic evidence',new Uint8Array(Buffer.from(fixture.photos[0].base64,'base64')));
 const action=await a.workflow.createAction(inspection,item,'Clean the washroom',auth.session().user.id,now().slice(0,10));await a.workflow.transitionAction(action,1,'resolved','Synthetic issue cleaned and checked.');
 const saved=await repository.load();await a.workflow.complete(inspection,saved.localRevision,'Synthetic workflow inspector',[{id:photo.id,hash:photo.hash}]);results.push({check:step,status:'passed'});
 step='real private photo upload and transaction acknowledgement';await a.engine.run();results.push({check:step,status:'passed'});
 step='independent authorised store projection and photo download';const b=await local(company);step='second store sync';await b.engine.run();step='second store completed report';const restored=await b.workflow.report(inspection);assert.equal(restored.context.workspace.siteName,'Synthetic mobile site');assert.equal(restored.status,'completed');assert.equal(restored.actions[0].status,'resolved');assert.deepEqual(await b.vault.read(photo.id),await a.vault.read(photo.id));results.push({check:step,status:'passed'});
 step='PDF bytes and content from restored inspection';const photos=[{id:photo.id,itemId:item,caption:photo.caption,base64:Buffer.from(await b.vault.read(photo.id)).toString('base64')}];
 const bytes=await inspectionPdf(restored,photos,{regular:new Uint8Array(await readFile('public/fonts/Inter-400.ttf')),bold:new Uint8Array(await readFile('public/fonts/Inter-700.ttf'))});assert.ok(bytes.length>10000);await mkdir('artifacts/release-evidence',{recursive:true});await writeFile('artifacts/release-evidence/production-synthetic-report.pdf',bytes);results.push({check:step,status:'passed',bytes:bytes.length});
 step='second inspection and distinct PDF';const secondSite=await b.catalogue.site(customer,'Synthetic second site','Different synthetic address','Europe/London','');
 const secondInspection=await b.catalogue.newDraft(secondSite,version),secondContext=await b.catalogue.context(secondInspection),secondRepository=new InspectionRepository(b.db,secondContext.workspace,now,randomUUID),secondDraft=await secondRepository.load();
 await secondRepository.save(changeResponse(secondDraft.draft,item,{result:'pass',note:'Second report; no photograph required.'},secondContext.workspace),secondDraft.localRevision);const latest=await secondRepository.load();await b.workflow.complete(secondInspection,latest.localRevision,'Synthetic second inspector',[]);await b.engine.run();
 const second=await b.workflow.report(secondInspection),secondBytes=await inspectionPdf(second,[],{regular:new Uint8Array(await readFile('public/fonts/Inter-400.ttf')),bold:new Uint8Array(await readFile('public/fonts/Inter-700.ttf'))});assert.notEqual(second.draft.id,restored.draft.id);assert.equal(second.context.workspace.siteName,'Synthetic second site');await writeFile('artifacts/release-evidence/production-synthetic-second-report.pdf',secondBytes);results.push({check:step,status:'passed',bytes:secondBytes.length});
 step='logout/login retains real company';await auth.signOut();await auth.signIn(email,password);assert.ok((await auth.memberships()).some(m=>m.company_id===company));results.push({check:step,status:'passed'});
}catch(e){const source=await Promise.all(['src/sync/business/engine.ts','src/sync/business/repository.ts','src/storage/workflowRepository.ts','src/media/vault.ts'].map(p=>readFile(p,'utf8')));const safe=new Set(source.flatMap(s=>[...s.matchAll(/throw Error\(\s*["']([^"']+)["']/g)].map(m=>m[1])));results.push({check:step,status:'failed',errorType:e?.constructor?.name,...(safe.has(e?.message)?{safeDomainError:e.message}:{}),...(e?.diagnostic?{httpStatus:e.diagnostic.httpStatus,serviceCode:e.diagnostic.serviceCode}:{} )});process.exitCode=1;}
finally{try{await auth.signOut();}catch{}for(const db of databases)await db.close();console.log(JSON.stringify({kind:'actual production services with host adapters; NOT browser/device',testedAt:now(),results},null,2));}
