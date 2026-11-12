import {serviceCors} from '../_shared/previewCors.ts';
import {eraseAccount,recentPasswordAuthentication} from '../_shared/accountErasure.ts';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function handler(req:Request){
 let cors:Record<string,string>|null;try{cors=serviceCors(url,req.headers.get('Origin'),Deno.env.get('CP_ALLOWED_WEB_ORIGINS')??'');}catch{return new Response('Origin not permitted',{status:403});}
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...(cors??{}),'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors??{}});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'Sign in again'},401);
  const checked=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:authorization},signal:AbortSignal.timeout(15000)});
  if(!checked.ok)return reply({error:'Sign in again'},401);const user=await checked.json();
  // Read claims only after GoTrue verified this exact token. No bearer/key is logged.
  const encoded=authorization.slice(7).split('.')[1];const claims=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
  if(claims.sub!==user.id||!recentPasswordAuthentication(claims,Date.now()/1000))return reply({error:'Sign out and sign in again before deleting your account.'},401);
  const request=async(path:string,body:unknown,method='POST')=>{const response=await fetch(url+path,{method,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Deletion step failed');return response.status===204?null:response.json();};
  if(typeof claims.session_id!=='string'||!await request('/rest/v1/rpc/cp_erasure_session_active',{target_user:user.id,target_session:claims.session_id}))return reply({error:'Sign in again before deleting your account.'},401);
  const reader=req.body?.getReader();if(!reader)return reply({error:'Invalid request'},400);let text='';const decoder=new TextDecoder();try{let size=0;for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>512)return reply({error:'Invalid request'},400);text+=decoder.decode(next.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel();}const input=JSON.parse(text);
  if(input.confirm!=='DELETE MY ACCOUNT'||typeof input.closeOwnedCompanies!=='boolean')return reply({error:'Confirm account deletion explicitly.'},400);
  await eraseAccount(user.id,input.closeOwnedCompanies,{
   prepare:async(id,close)=>{await request('/rest/v1/rpc/cp_erasure_prepare',{target_user:id,close_owned:close});},
   paths:id=>request('/rest/v1/rpc/cp_erasure_paths',{target_user:id}),
   removeFiles:async paths=>{await request('/storage/v1/object/cleanproof-private',{prefixes:paths},'DELETE');},
   removeData:async id=>{await request('/rest/v1/rpc/cp_erasure_remove_data',{target_user:id});},
   deleteAuthUser:async id=>{await request('/auth/v1/admin/users/'+id,{should_soft_delete:false},'DELETE');await request('/rest/v1/rpc/cp_erasure_finish',{target_user:id});},
  });return reply({deleted:true});
 }catch{return reply({error:'Deletion could not finish. Ownership transfer, private-file cleanup or service retry may be required. Contact support; do not reset your app.'},409);}
}
Deno.serve(handler);
