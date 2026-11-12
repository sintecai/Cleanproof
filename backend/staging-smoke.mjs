import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
const c=JSON.parse(await readFile(new URL('../deployment/staging.public.json',import.meta.url),'utf8'));
if(c.backendUrl!=='https://vmvoeksprlwjiwfxqita.supabase.co')throw Error('This harness is restricted to the authorised synthetic staging project.');
const results=[];
async function probe(name,path,options={},expected){
 const response=await fetch(c.backendUrl+path,{...options,headers:{apikey:c.publishableKey,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});
 let body;try{body=await response.json();}catch{body=null;}
 const pass=expected?expected(response,body):null;
 results.push({name,status:response.status,result:pass===null?'observed':pass?'passed':'failed',...(body?.error_code?{errorCode:body.error_code}:{}),...(body?.code?{code:body.code}:{})});
 return {response,body};
}
const settings=await probe('Immediate-signup Auth policy','/auth/v1/settings',{},(r,b)=>r.ok&&b.external?.email===true&&b.mailer_autoconfirm===true);
await probe('Incorrect credentials rejected','/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:'cleanproof-nonexistent@example.test',password:randomBytes(24).toString('hex')})},(r,b)=>r.status===400&&b.error_code==='invalid_credentials');
await probe('Invalid synthetic token rejected','/auth/v1/user',{headers:{Authorization:'Bearer invalid-synthetic-token'}},r=>r.status===401||r.status===403);
await probe('Unauthenticated company creation denied','/rest/v1/rpc/cp_register_company',{method:'POST',body:JSON.stringify({request_id:randomUUID(),company_name:'Synthetic denied company',contact_email:'owner@example.test',company_timezone:'Europe/London'})},r=>[401,403,404].includes(r.status));
await probe('Internal helper cannot be called anonymously','/rest/v1/rpc/cp_sync_candidate',{method:'POST',body:JSON.stringify({c:randomUUID(),k:'inspection',i:randomUUID(),records:[]})},r=>[401,403,404].includes(r.status));
await probe('Anonymous listing returns no object data; populated-object isolation pending','/storage/v1/object/list/cleanproof-private',{method:'POST',body:JSON.stringify({prefix:'',limit:1})},(r,b)=>[400,401,403,404].includes(r.status)||r.ok&&Array.isArray(b)&&b.length===0);
await probe('Edge denies unauthenticated photo request','/functions/v1/photo-transfer',{},r=>r.status===401);
await probe('Edge authorised-origin preflight','/functions/v1/photo-transfer',{method:'OPTIONS',headers:{Origin:c.siteOrigin}},r=>r.status===204&&r.headers.get('access-control-allow-origin')===c.siteOrigin);
await probe('Edge rejects unrelated browser origin','/functions/v1/photo-transfer',{method:'OPTIONS',headers:{Origin:'https://unrelated.example.test'}},r=>r.status===403);
const output={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),testedAt:new Date().toISOString(),project:'vmvoeksprlwjiwfxqita',results};
if(process.env.CLEANPROOF_STAGING_EVIDENCE_PATH)await writeFile(process.env.CLEANPROOF_STAGING_EVIDENCE_PATH,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
if(results.some(r=>r.result==='failed'))process.exitCode=1;
