/** Read-only/denied-anonymous checks. Public client config arrives on stdin, never logs. */
import assert from 'node:assert/strict';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>4096)throw Error('Invalid public configuration.');}
let config;try{config=JSON.parse(input);}catch{input='';throw Error('Invalid public configuration.');}input='';
if(config?.url!=='https://decysnpygturutfyjofi.supabase.co'||typeof config.key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.key))throw Error('Only intended production public client configuration is allowed.');
const request=async(path,body)=>{
 const response=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const data=await response.json();return {response,data};
};
const results=[];
try{
 const {response,data}=await request('/auth/v1/settings');
 assert.equal(response.ok,true);
 results.push({check:'public Auth settings',status:'passed',httpStatus:response.status,emailEnabled:data.external?.email===true,signupEnabled:data.disable_signup===false,autoConfirm:data.mailer_autoconfirm===true,googleEnabled:data.external?.google===true});
 const zero='00000000-0000-4000-8000-000000000000';
 for(const [rpc,body] of [['cp_erasure_prepare',{target_user:zero,close_owned:false}],['cp_erasure_session_active',{target_user:zero,target_session:zero}],['cp_sync_register',{c:zero,lc:zero}]]){
  const {response,data}=await request('/rest/v1/rpc/'+rpc,body);
  const denied=[401,403].includes(response.status)&&data.code==='42501';
  results.push({check:'anonymous '+rpc,status:denied?'passed':'failed',httpStatus:response.status,serviceCode:typeof data.code==='string'?data.code:undefined});
 }
}catch{results.push({check:'transport/settings/probe',status:'failed'});}
console.log(JSON.stringify({kind:'Real production anonymous HTTP checks; no login, account creation, deletion or session testing',results},null,2));
process.exitCode=results.some(r=>r.status==='failed')?1:0;
