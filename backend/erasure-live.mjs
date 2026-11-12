/** Real staging-only disposable account acceptance. Never run against production. */
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const c=JSON.parse(await readFile(new URL('../deployment/staging.public.json',import.meta.url)));
if(process.env.CLEANPROOF_RUN_STAGING_ACCEPTANCE!=='1'||new URL(c.backendUrl).hostname!=='vmvoeksprlwjiwfxqita.supabase.co')throw Error('Explicit disposable staging acceptance opt-in required');
const results=[],accounts=[];let step='signup';
async function request(path,body,token,method='POST'){
 const r=await fetch(c.backendUrl+path,{method,headers:{apikey:c.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});
 return{status:r.status,data:r.status===204?null:await r.json().catch(()=>null)};
}
async function login(a){const r=await request('/auth/v1/token?grant_type=password',{email:a.email,password:a.password});assert.equal(r.status,200);a.token=r.data.access_token;a.refresh=r.data.refresh_token;}
try{
 for(const label of ['A','B']){
  const a={email:'cp-erasure-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')};
  const r=await request('/auth/v1/signup',{email:a.email,password:a.password});assert.equal(r.status,200);assert.ok(r.data.access_token);a.token=r.data.access_token;a.id=r.data.user.id;
  const company=await request('/rest/v1/rpc/cp_register_company',{request_id:randomUUID(),company_name:'Disposable erasure acceptance '+label,contact_email:a.email,company_timezone:'Europe/London'},a.token);assert.equal(company.status,200);a.company=company.data;accounts.push(a);
 }
 results.push({check:'two new immediate signup sessions and owner companies',status:'passed'});
 const [a,b]=accounts;step='confirmation and service-only privileges';
 assert.equal((await request('/functions/v1/delete-account',{confirm:'incorrect',closeOwnedCompanies:true},a.token)).status,400);
 assert.equal((await request('/rest/v1/rpc/cp_erasure_prepare',{target_user:b.id,close_owned:true},a.token)).status,403);
 assert.equal((await request('/functions/v1/delete-account',{confirm:'DELETE MY ACCOUNT',closeOwnedCompanies:false},a.token)).status,409);
 results.push({check:step,status:'passed'});
 step='live session rejection';await login(b);const old=b.token;assert.equal((await request('/auth/v1/logout?scope=local',undefined,old)).status,204);assert.equal((await request('/functions/v1/delete-account',{confirm:'DELETE MY ACCOUNT',closeOwnedCompanies:true},old)).status,401);await login(b);results.push({check:step,status:'passed'});
 step='real self erasure and other-company isolation';await login(a);const token=a.token,refresh=a.refresh;
 assert.equal((await request('/functions/v1/delete-account',{confirm:'DELETE MY ACCOUNT',closeOwnedCompanies:true},token)).data?.deleted,true);a.deleted=true;
 assert.deepEqual((await request('/rest/v1/cp_companies?id=eq.'+a.company,undefined,token,'GET')).data,[]);
 assert.ok((await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:refresh})).status>=400);
 assert.equal((await request('/auth/v1/token?grant_type=password',{email:a.email,password:a.password})).status,400);
 assert.equal((await request('/rest/v1/cp_companies?id=eq.'+b.company,undefined,b.token,'GET')).data?.length,1);results.push({check:step,status:'passed'});
}catch{results.push({check:step,status:'failed',detail:'Inspect redacted service logs; no credential or raw error is printed.'});process.exitCode=1;}
finally{
 for(const a of accounts.filter(a=>!a.deleted)){try{await login(a);const r=await request('/functions/v1/delete-account',{confirm:'DELETE MY ACCOUNT',closeOwnedCompanies:true},a.token);results.push({check:'disposable cleanup',status:r.data?.deleted?'passed':'failed'});}catch{results.push({check:'disposable cleanup',status:'blocked'});}}
 console.log(JSON.stringify({scope:'Actual Auth/REST/Edge; NOT browser or installed-device acceptance',testedAt:new Date().toISOString(),results},null,2));
}
