import type { AuthConnection } from '../auth/session.ts';
import { validateSession, uuid } from '../auth/session.ts';
import type { TransactionalDatabase } from '../storage/contracts.ts';
/** Initialise ONLY an independently encrypted empty target. Does not select a profile,
 * copy old records/files/keys, extend an offline lease, or acknowledge server delivery. */
export async function initialiseFreshCompany(
  db: TransactionalDatabase, auth: AuthConnection, company: string, displayName: string,
  newId: () => string, now = () => new Date().toISOString(),
) {
  if (!uuid(company) || !displayName.trim() || displayName.trim().length > 120) throw Error('Company reference and owner display name are required.');
  const generation=auth.revision(),user=auth.session()?.user.id;
  if(!user)throw Error('Sign in before preparing a company workspace.');
  const memberships=await auth.memberships();
  const membership=memberships.find(m=>m.company_id===company&&m.active);
  if(!membership)throw Error('Company setup requires verified membership.');
  const profile=await auth.companyProfile(company);
  const remote=await auth.rpc('cp_sync_pull',{c:company,after_cursor:0,known_epoch:null});
  if(remote?.protocol!==2||!Number.isSafeInteger(remote.head)||remote.head<0)throw Error('The authorised workspace snapshot could not be checked. Existing work is preserved.');
  const receiving=remote.head>0||membership.role!=='owner';
  const session=validateSession(auth.session());
  return db.transaction(async tx=>{
    if(auth.revision()!==generation||auth.session()?.user.id!==user)throw Error('Account access changed; workspace preparation cancelled.');
    const bound=await tx.getFirstAsync<{user_id:string;company:string;local_company:string;origin:string}>('SELECT * FROM business_binding');
    if(bound){
      if(bound.user_id!==user||bound.company!==company||bound.local_company!==company||bound.origin!==auth.config.url)throw Error('Target belongs to another account or company. Existing work preserved.');
      return {company,user,origin:auth.config.url,alreadyPrepared:true};
    }
    for(const table of ['customers','sites','templates','template_versions','inspection_drafts','local_people','company_settings','media_journal','outbox','local_events','auth_sessions']){
      // Table names are internal constants, never caller input.
      const row=await tx.getFirstAsync<{n:number}>(`SELECT count(*) n FROM ${table}`);
      if(row?.n)throw Error('Target is not empty. Use a new encrypted workspace; existing work is preserved.');
    }
    if(!receiving)await tx.runAsync('INSERT INTO company_settings VALUES(?,?,?)',company,profile.name,profile.contact);
    if(!receiving)await tx.runAsync('INSERT INTO local_people(id,company_id,name) VALUES(?,?,?)',user,company,displayName.trim());
    await tx.runAsync('INSERT INTO business_binding VALUES(1,?,?,?,?,?,?,?)',user,company,company,auth.config.url,membership.role,receiving?1:0,now());
    await tx.runAsync('INSERT INTO business_identity VALUES(?,?,?,?)','branding',company,company,company);
    await tx.runAsync('INSERT INTO business_identity VALUES(?,?,?,?)','person',user,company,user);
    await tx.runAsync("INSERT INTO local_secrets VALUES('backend-public-settings',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",JSON.stringify(auth.config));
    await tx.runAsync('INSERT INTO auth_sessions VALUES(?,?)',auth.config.url,JSON.stringify(session));
    if(!receiving&&membership.role==='owner'){await tx.runAsync('INSERT INTO local_events VALUES(?,?,?,?,?,?)',newId(),company,company,'branding_saved_v1',JSON.stringify({name:profile.name,contact:profile.contact}),now());
    await tx.runAsync('INSERT INTO local_events VALUES(?,?,?,?,?,?)',newId(),company,user,'local_person_created_v1',JSON.stringify({id:user,name:displayName.trim()}),now());}
    if(auth.revision()!==generation||auth.session()?.user.id!==user)throw Error('Account access changed; workspace preparation cancelled.');
    return {company,user,origin:auth.config.url,alreadyPrepared:false};
  });
}

/** Durable target checkpoint lives in the old encrypted DB; only the platform's
 * final activation changes selection. Failed/restarted attempts reuse the target. */
export async function openFreshCompany(
  source: {db:TransactionalDatabase}, auth:AuthConnection, company:string, displayName:string,
  newId:()=>string,
  create:(profile:string)=>Promise<{access:{grant(auth:AuthConnection):Promise<void>};connection():AuthConnection|null;close():Promise<void>;activate():Promise<void>}>,
) {
  const user=auth.session()?.user.id,generation=auth.revision();
  if(!user||!uuid(company)||!displayName.trim()||displayName.trim().length>120)throw Error('Sign in, choose a company and enter your display name.');
  const checkpoint='fresh-company:'+user+':'+company;
  const profile=await source.db.transaction(async tx=>{
    const binding=await tx.getFirstAsync<{user_id:string;company:string;origin:string}>('SELECT user_id,company,origin FROM business_binding');
    if(binding&&(binding.user_id!==user||binding.origin!==auth.config.url))throw Error('Use the identity already bound to this workspace. Existing work is preserved.');
    // Reopening the current company must never fork a new, apparently empty workspace.
    if(binding?.company===company)return null;
    const row=await tx.getFirstAsync<{value:string}>('SELECT value FROM local_secrets WHERE name=?',checkpoint);
    if(row){if(!uuid(row.value))throw Error('Workspace checkpoint is invalid; preserve it for recovery.');return row.value;}
    const id=newId();if(!uuid(id))throw Error('Invalid workspace identifier.');
    await tx.runAsync('INSERT INTO local_secrets VALUES(?,?)',checkpoint,id);return id;
  });
  if(profile===null){
    const fresh=await auth.memberships();
    if(auth.revision()!==generation||auth.session()?.user.id!==user||!fresh.some(m=>m.company_id===company&&m.role==='owner'&&m.active))throw Error('Company access changed. Your existing work remains protected.');
    return;
  }
  const next=await create(profile);
  try{
    const targetAuth=next.connection();if(!targetAuth)throw Error('Authorised backend configuration is required.');
    await targetAuth.restore();await next.access.grant(targetAuth);
    const fresh=await auth.memberships();
    if(auth.revision()!==generation||auth.session()?.user.id!==user||!fresh.some(m=>m.company_id===company&&m.role==='owner'&&m.active))throw Error('Account access changed before activation. Target remains protected.');
    await next.activate();
  }finally{await next.close();}
}
