// READ ONLY. GET public Auth settings; OPTIONS CORS probes only. No user/data writes.
import{readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
const c=JSON.parse(await readFile(new URL('../deployment/production.web.public.json',import.meta.url)));
assert.equal(c.backendUrl,'https://decysnpygturutfyjofi.supabase.co');
assert.equal(c.siteOrigin,'https://cleanproof-customer.sintecai26.chatgpt.site');
const results=[];
const s=await fetch(c.backendUrl+'/auth/v1/settings',{method:'GET',headers:{apikey:c.publishableKey},signal:AbortSignal.timeout(20000)});assert.equal(s.status,200);const a=await s.json();
results.push({check:'public Auth settings',emailEnabled:a.external?.email===true,signupEnabled:a.disable_signup===false,confirmEmailOff:a.mailer_autoconfirm===true,googleEnabled:a.external?.google===true});
for(const name of ['photo-transfer','delete-account'])for(const origin of [c.siteOrigin,'https://unrelated.example',c.siteOrigin+'.unrelated.example']){
 const r=await fetch(c.backendUrl+'/functions/v1/'+name,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'},signal:AbortSignal.timeout(20000)});
 const allowed=origin===c.siteOrigin;assert.equal(r.status,allowed?204:403);assert.equal(r.headers.get('access-control-allow-origin'),allowed?c.siteOrigin:null);
 results.push({check:name+' preflight',allowed,status:r.status});
}
console.log(JSON.stringify({scope:'Read-only settings and CORS preflight; not authenticated acceptance',results},null,2));
