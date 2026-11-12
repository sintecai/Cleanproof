// Deliberately opt-in: synthetic records only in the existing staging project.
// No passwords, access/refresh tokens, callback links or personal accounts are logged.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {AuthConnection} from '../.test-build/src/auth/session.js';
if(process.env.CLEANPROOF_RUN_STAGING_ACCEPTANCE!=='1')throw Error('Opt in to synthetic staging mutations.');
const config=JSON.parse(await readFile(new URL('../deployment/staging.public.json',import.meta.url),'utf8'));
assert.equal(config.backendUrl,'https://vmvoeksprlwjiwfxqita.supabase.co');
const results=[];let step='initialise';const accounts=[];
function client(saved){return new AuthConnection({url:config.backendUrl,key:config.publishableKey},saved);}
async function account(label){
 let value=null;const storage={load:async()=>value,save:async s=>{value=s;},clear:async()=>{value=null;}};
 const auth=client(storage),email='cp-release-'+randomUUID()+'@example.com',password=randomBytes(32).toString('base64url');accounts.push(auth);
 step=label+' signup';const created=await auth.registerImmediately(email,password,'Synthetic release tester');assert.equal(created.status,'signed-in');assert.ok(auth.session()?.user.id);results.push({check:step,status:'passed'});
 step=label+' company onboarding';const body={request_id:randomUUID(),company_name:'Synthetic release '+label,contact_email:email,company_timezone:'Europe/London'};
 const company=await auth.rpc('cp_register_company',body);assert.equal(await auth.rpc('cp_register_company',body),company);assert.ok((await auth.memberships()).some(m=>m.company_id===company&&m.role==='owner'));results.push({check:step,status:'passed'});
 return {auth,storage,email,password,company};
}
try{
 const a=await account('A'),b=await account('B');
 const op=(kind,payload,extra={})=>({protocol:1,companyId:a.company,operationId:randomUUID(),entityId:randomUUID(),kind,payload,expectedRevision:0,siteId:null,parentId:null,deleted:false,...extra});
 step='real customer and site records';const customer=op('customer',{name:'Synthetic release office'});await a.auth.rpc('cp_apply_operation',{operation:customer});const site=op('site',{name:'Synthetic release site'},{parentId:customer.entityId});site.siteId=site.entityId;await a.auth.rpc('cp_apply_operation',{operation:site});results.push({check:step,status:'passed'});
 step='cross-company denial';await assert.rejects(b.auth.companyProfile(a.company));await assert.rejects(b.auth.rpc('cp_apply_operation',{operation:op('customer',{name:'Denied'})}));results.push({check:step,status:'passed'});
 step='logout and login same credentials';await a.auth.signOut();assert.equal(await a.storage.load(),null);await a.auth.signIn(a.email,a.password);assert.equal((await a.auth.memberships())[0].company_id,a.company);results.push({check:step,status:'passed'});
 step='new Auth client persisted session restore';const reopened=client(a.storage);await reopened.restore();assert.ok((await reopened.memberships()).some(m=>m.company_id===a.company));await reopened.signOut();results.push({check:step,status:'passed'});
 step='wrong password';await assert.rejects(a.auth.signIn(a.email,randomBytes(24).toString('base64url')),e=>e?.diagnostic?.serviceCode==='invalid_credentials');results.push({check:step,status:'passed'});
}catch(e){results.push({check:step,status:'failed',...(e?.diagnostic?{httpStatus:e.diagnostic.httpStatus,serviceCode:e.diagnostic.serviceCode}:{} )});process.exitCode=1;}
finally{for(const auth of accounts)try{await auth.signOut();}catch{}console.log(JSON.stringify({kind:'actual staging Auth/REST execution; NOT browser/device acceptance',testedAt:new Date().toISOString(),results},null,2));}
