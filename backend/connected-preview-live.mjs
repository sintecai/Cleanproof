// Real staging HTTP acceptance with generated synthetic credentials in memory.
// Adds the browser Origin to the existing host workflow's authenticated photo requests.
// This is not browser or native-device acceptance.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../deployment/staging.public.json',import.meta.url)));
assert.equal(config.backendUrl,'https://vmvoeksprlwjiwfxqita.supabase.co');
const origin='https://cleanproof-release-connected.sintecai26.chatgpt.site';
const endpoint=config.backendUrl+'/functions/v1/photo-transfer';
const request=globalThis.fetch;
const checks=[];
for(const candidate of [origin,'https://unrelated.example',origin+'.unrelated.example']){
 const response=await request(endpoint,{method:'OPTIONS',headers:{Origin:candidate,'Access-Control-Request-Method':'POST'},signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,candidate===origin?204:403);
 assert.equal(response.headers.get('access-control-allow-origin'),candidate===origin?origin:null);
 checks.push({kind:'preflight',allowed:candidate===origin,status:response.status});
}
const denied=await request(endpoint,{method:'GET',headers:{Origin:origin,apikey:config.publishableKey,Authorization:'Bearer invalid-synthetic-check'},signal:AbortSignal.timeout(20000)});
assert.equal(denied.status,401);checks.push({kind:'invalid JWT rejected',status:denied.status});
let authenticatedPhotoRequests=0;
globalThis.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(!url.startsWith(endpoint))return request(input,init);
 const headers=new Headers(init?.headers);headers.set('Origin',origin);
 const result=await request(input,{...init,headers});
 assert.equal(result.headers.get('access-control-allow-origin'),origin);
 if(result.ok)authenticatedPhotoRequests++;
 return result;
};
try{await import('./customer-workflow-live.mjs');assert.ok(authenticatedPhotoRequests>=2);console.log(JSON.stringify({kind:'actual allowed-Origin upload/download, host workflow; NOT browser',checks,authenticatedPhotoRequests}));}
finally{globalThis.fetch=request;}
