import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import * as LocalAuthentication from 'expo-local-authentication';
import {BusinessEngine,transport} from '../sync/business/engine';
import {Directory} from 'expo-file-system';
import {type AuthConnection} from '../auth/session';
import {chooseNativeProfile,type ProfileCandidate} from '../application/nativeWorkspaceSelection';
import {openDemoWorkspace,inspectNativeWorkspaceProfile} from './expoWorkspace';
const options={keychainAccessible:SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY};
/** Reuse a verified (origin,user UUID,company UUID) database. Discovery never
 * creates databases; keys/files from old versions remain in their original paths. */
export async function openNativeCustomerWorkspace(auth:AuthConnection,company:string,name:string,offline=false){
 const user=auth.session()?.user.id;if(!user)throw Error('Sign in before opening your workspace.');
 const identity={user_id:user,company,origin:auth.config.url};
 const scope=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,JSON.stringify(identity));
 const registry='cleanproof.customer.profile.'+scope;
 const remembered=await SecureStore.getItemAsync(registry,options);
 const dir=new Directory(SQLite.defaultDatabaseDirectory);
 const profiles=dir.exists?dir.list().flatMap(entry=>entry.name==='cleanproof-demo-cp001.db'?['legacy']:/^cleanproof-profile-[a-f0-9-]{36}\.db$/.test(entry.name)?[entry.name.slice(19,-3)]:[]):[];
 const candidates:ProfileCandidate[]=[];let inaccessible=false;
 for(const profile of profiles){try{candidates.push({profile,binding:await inspectNativeWorkspaceProfile(profile)});}catch{inaccessible=true;}}
 let profile=chooseNativeProfile(candidates,identity,remembered);
 if(!profile&&inaccessible)throw Error('An earlier encrypted workspace could not be inspected. Your files and keys are preserved. Resolve access before creating a replacement.');
 if(!profile&&offline)throw Error('Reconnect before creating or selecting a company workspace. Existing work has been preserved.');
 if(!profile)profile=Crypto.randomUUID();
 const existing=candidates.some(c=>c.profile===profile);
 const handle=await openDemoWorkspace(undefined,{profile,seed:false,empty:true,auth,...(!existing?{fresh:{auth,company,name}}:{})});
 try{
  const localAuth=handle.connection();if(!localAuth)throw Error('Account services are unavailable.');
  if(offline){const unlocked=await LocalAuthentication.authenticateAsync({promptMessage:'Open saved CleanProof work offline',disableDeviceFallback:false});if(!unlocked.success)throw Error('Device authentication was cancelled.');await handle.access.offline(user);}else await handle.access.grant(localAuth);
  if(auth.session()?.user.id!==user)throw Error('Account changed while opening saved work.');
  await SecureStore.setItemAsync(registry,profile,options);
  const accountScope=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,auth.config.url+':'+user);
  await SecureStore.setItemAsync('cleanproof.customer.last-company.'+accountScope,company,options);
  await SecureStore.setItemAsync('cleanproof.active-profile',profile,options);
  // Do not show an empty new-device company before its acknowledged records
  // have projected. A failed transfer preserves this profile for a safe retry.
  if(!offline)await new BusinessEngine(handle.business,(await handle.media()).vault,transport(auth)).run();
  return handle;
 }catch(error){await handle.close();throw error;}
}

export async function lastNativeCompany(auth:AuthConnection){
 const user=auth.session()?.user.id;if(!user)return null;
 const scope=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,auth.config.url+':'+user);
 return SecureStore.getItemAsync('cleanproof.customer.last-company.'+scope,options);
}
