/** Public-config-only deployed negative checks. Never creates/deletes accounts or reads customer files. */
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>4096)throw Error('Invalid public configuration.');}
let config;try{config=JSON.parse(input);}catch{input='';throw Error('Invalid public configuration.');}input='';
if(config?.url!=='https://decysnpygturutfyjofi.supabase.co'||typeof config.key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.key))throw Error('Only intended production public client configuration is allowed.');
const results=[];
async function call(path,options={}){return fetch(config.url+path,{...options,headers:{apikey:config.key,...options.headers},signal:AbortSignal.timeout(20000)});}
try{
 const settings=await call('/auth/v1/settings');if(!settings.ok)throw Error();const s=await settings.json();
 results.push({check:'production public Auth settings',status:'passed',emailEnabled:s.external?.email===true,signupEnabled:s.disable_signup===false,autoConfirm:s.mailer_autoconfirm===true,googleEnabled:s.external?.google===true});
 for(const name of ['photo-transfer','delete-account']){
  for(const mode of ['missing','invalid']){
   const r=await call('/functions/v1/'+name,{method:name==='delete-account'?'POST':'GET',headers:mode==='invalid'?{Authorization:'Bearer invalid-synthetic-check'}:{}});
   results.push({check:name+' '+mode+' JWT rejection',status:r.status===401?'passed':'failed',httpStatus:r.status});await r.body?.cancel();
  }
  for(const origin of ['https://cleanproof-mobile-tab-preview.sintecai26.chatgpt.site','http://localhost:8081']){
   const r=await call('/functions/v1/'+name,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
   results.push({check:name+' unconfigured '+(origin.startsWith('http:')?'loopback':'staging')+' browser origin',status:r.status===403&&!r.headers.get('access-control-allow-origin')?'passed':'failed',httpStatus:r.status,corsOriginReturned:!!r.headers.get('access-control-allow-origin')});await r.body?.cancel();
  }
 }
}catch{results.push({check:'production transport/settings',status:'failed'});}
console.log(JSON.stringify({kind:'Real deployed negative permission/CORS checks, not authenticated customer acceptance',results},null,2));process.exitCode=results.some(r=>r.status==='failed')?1:0;
