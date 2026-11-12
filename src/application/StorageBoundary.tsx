import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState,KeyboardAvoidingView,Modal,Platform,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Stack,usePathname} from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import {Brand} from './Brand';
import {NativeReportHost} from '../reporting/NativeReportHost';
import {closeNativeReport} from '../reporting/pdfExport';
import {Button,Field,ui} from './ui';
import {NativeWorkspaceContext} from './NativeWorkspaceContext';
import {nativeAccountServices,replaceNativeAccountServices} from './nativeAccountServices';
import {setNativeCustomer,setNativeDestination} from './nativeCustomerState';
import {openNativeCustomerWorkspace,lastNativeCompany} from '../storage/nativeCustomerWorkspace';
import {ConnectionError,type AuthConnection} from '../auth/session';
import {storageErrorMessage,type WorkspaceHandle} from '../storage/expoWorkspace';
import {StorageGateError} from '../storage/encryption';
import {clearTransient} from '../media/nativeMedia';
import {AuthAttemptGate} from '../auth/attemptGate';
const Unlock=createContext<(()=>void)|undefined>(undefined);
export function useStorageUnlock(){return useContext(Unlock);}
function messageFor(error:unknown){if(error instanceof StorageGateError)return storageErrorMessage(error);return error instanceof ConnectionError?error.kind==='network'?'Account services are unavailable. Please retry.':error.message.replace(/\s*\[CP_[A-Z_]+\]/g,''):error instanceof Error?error.message:'Unable to open saved work. Please retry.';}
/** Native auth-first owner above the navigator. Ordinary route changes never
 * recreate the session, choose a profile, reopen SQLite or discard its queues. */
export function StorageBoundary({children}:{children:ReactNode}){
 const path=usePathname(),isRecovery=path==='/reset-password',[auth,setAuth]=useState<AuthConnection|null>(()=>{try{return nativeAccountServices();}catch{return null;}});
 const [phase,setPhase]=useState<'restoring'|'signed-out'|'company'|'opening'|'ready'|'error'>('restoring');
 const [mode,setMode]=useState<'signin'|'signup'|'recovery'>('signin'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[menu,setMenu]=useState(false);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[name,setName]=useState(''),[company,setCompany]=useState(''),[timezone,setTimezone]=useState('Europe/London');
 const [members,setMembers]=useState<Array<Awaited<ReturnType<AuthConnection['memberships']>>[number]&{name?:string}>>([]),[handle,setHandle]=useState<WorkspaceHandle|null>(null);
 const current=useRef<WorkspaceHandle|null>(null),generation=useRef(0),running=useRef(false),alive=useRef(true),attempts=useRef(new AuthAttemptGate());
 const request=useRef<string|undefined>(undefined),selected=useRef<string|null>(null);
 function clearPasswords(){setPassword('');setConfirm('');}
 async function open(companyId:string,ticket:number,offline=false){
  if(!auth)return;
  if(current.current){const binding=await current.current.business.binding();if(binding?.company===companyId&&binding.user_id===auth.session()?.user.id){await current.current.access.grant(auth);setHandle(current.current);setNativeCustomer(true,()=>void signOut());setNativeDestination('/');setPhase('ready');return;}auth.lock();await auth.restore();await current.current.close();current.current=null;setHandle(null);}
  setPhase('opening');selected.current=companyId;
  const h=await openNativeCustomerWorkspace(auth,companyId,name.trim()||auth.session()?.user.email||'Inspector',offline);
  if(!alive.current||ticket!==generation.current){await h.close();return;}
  current.current=h;setHandle(h);setNativeCustomer(true,()=>void signOut());setNativeDestination('/');setPhase('ready');
 }
 async function identity(ticket:number){
  if(!auth?.session())throw Error('Sign in to continue.');
  let rows:Awaited<ReturnType<AuthConnection['memberships']>>;
  try{rows=await auth.memberships();}catch(e){if(e instanceof ConnectionError&&e.kind==='network'){const saved=await lastNativeCompany(auth);if(saved){await open(saved,ticket,true);setNotice('Working offline. New changes remain on this device until acknowledged by the server.');return;}}throw e;}
  if(!alive.current||ticket!==generation.current)return;
  const named=await Promise.all(rows.map(async row=>({...row,name:(await auth.companyProfile(row.company_id)).name})));
  if(!alive.current||ticket!==generation.current)return;
  setMembers(named);setPhase('company');
  if(rows.length===1)await open(rows[0]!.company_id,ticket);
 }
 async function perform(task:(ticket:number)=>Promise<void>){
  if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');const ticket=generation.current;
  try{await task(ticket);}catch(e){if(alive.current&&ticket===generation.current){setError(messageFor(e));setPhase(auth?.session()?'error':'signed-out');}}finally{running.current=false;if(alive.current){setBusy(false);clearPasswords();}}
 }
 async function signOut(){
  if(running.current)return;running.current=true;setBusy(true);++generation.current;setNativeCustomer(false);setMenu(false);setHandle(null);setPhase('signed-out');clearPasswords();setEmail('');setMembers([]);setName('');setCompany('');request.current=undefined;selected.current=null;
  const previous=current.current;current.current=null;
  try{
   // Fence queued network work first, invalidate offline access, then close SQLite.
   auth?.lock();closeNativeReport();await previous?.access.signOut();
   const outcome=await auth?.signOut();await previous?.close();clearTransient();
   setAuth(replaceNativeAccountServices());
   setNotice(outcome?.serverRevoked?'Signed out. Saved work is protected.':'Signed out on this device. Server session revocation could not be confirmed.');
  }catch{setError('Sign-out could not finish safely. Retry; do not clear app storage.');setPhase('error');current.current=previous;}
  finally{running.current=false;setBusy(false);}
 }
 useEffect(()=>{alive.current=true;const ticket=generation.current;
  if(!isRecovery){setPhase('restoring');setHandle(null);}if(!isRecovery)void perform(async()=>{if(!auth)throw Error('Account services are unavailable.');const session=await auth.restore();if(!session){setPhase('signed-out');return;}await identity(ticket);});
  const sub=AppState.addEventListener('change',state=>{if(state!=='active'){clearPasswords();return;}if(current.current&&!running.current)void perform(async()=>{try{await auth!.token();await current.current!.access.grant(auth!);}catch(e){if(e instanceof ConnectionError&&e.kind==='network'&&auth!.session()){await current.current!.access.offline(auth!.session()!.user.id);return;}throw e;}});});
  return()=>{alive.current=false;++generation.current;setNativeCustomer(false);sub.remove();auth?.lock();void current.current?.close();current.current=null;};
 },[isRecovery,auth]);
 // A recovery session is deliberately independent of the ordinary workspace.
 if(isRecovery)return <Stack screenOptions={{headerShown:false}}/>;
 if(phase==='ready'&&handle&&current.current===handle)return <Unlock.Provider value={()=>void signOut()}><NativeWorkspaceContext.Provider value={handle}><View style={{flex:1}}><View style={{paddingHorizontal:12,paddingVertical:6,backgroundColor:'#f7f8f5',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text style={[ui.muted,{flex:1}]} numberOfLines={1}>{auth?.session()?.user.email}</Text><Button secondary label="Account" onPress={()=>setMenu(true)}/></View>{children}<NativeReportHost/><Modal visible={menu} transparent animationType="none" onRequestClose={()=>setMenu(false)}><SafeAreaView style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#0b1c3060'}}><View style={ui.card}><Text style={ui.h}>Your account</Text><Text style={ui.body}>{auth?.session()?.user.email}</Text><Text style={ui.muted}>Switching accounts signs out this account. Encrypted records and unsent work remain protected on this device.</Text><Button label="Choose company" onPress={()=>{setMenu(false);setPhase('company');}}/><Button secondary label="Switch account" disabled={busy} onPress={()=>void signOut()}/><Button secondary label="Log out" disabled={busy} onPress={()=>void signOut()}/><Button secondary label="Close" onPress={()=>setMenu(false)}/></View></SafeAreaView></Modal></View></NativeWorkspaceContext.Provider></Unlock.Provider>;
 return <SafeAreaView style={{flex:1}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,padding:20,gap:16,justifyContent:'center',maxWidth:480,width:'100%',alignSelf:'center'}}><View style={{padding:20,backgroundColor:'#0b1c30',borderRadius:20}}><Brand dark/></View>
 {process.env.EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT!=='production'&&<Text style={ui.muted}>Staging · synthetic testing</Text>}
 <View style={ui.card}><Text style={ui.title}>{phase==='restoring'?'Restoring your session':phase==='opening'?'Opening your saved work':phase==='company'?'Your company workspace':mode==='signup'?'Create account':mode==='recovery'?'Forgot password':'Welcome back'}</Text>
 {!!error&&<Text accessibilityRole="alert" style={ui.body}>{error}</Text>}{!!notice&&<Text accessibilityRole="alert" style={ui.muted}>{notice}</Text>}
 {(phase==='restoring'||phase==='opening')&&<Text style={ui.muted}>Your existing records and keys remain protected.</Text>}
 {(phase==='signed-out'||phase==='error'&&!auth?.session())&&<>
 {mode==='signup'&&<Field label="Full name" value={name} onChange={setName} disabled={busy} max={120}/>}
 <Field label="Email address" value={email} onChange={setEmail} keyboardType="email-address" max={254} disabled={busy}/>
 {mode!=='recovery'&&<Field label="Password" value={password} onChange={setPassword} secure disabled={busy} max={256}/>}
 {mode==='signup'&&<Field label="Confirm password" value={confirm} onChange={setConfirm} secure disabled={busy} max={256}/>}
 <Button label={busy?'Please wait…':mode==='signup'?'Create account':mode==='recovery'?'Send password-reset email':'Sign in'} disabled={busy||!auth} onPress={()=>void perform(async ticket=>{
  if(mode==='recovery'){
   attempts.current.take('recovery');const verifier=Array.from(await Crypto.getRandomBytesAsync(32),v=>v.toString(16).padStart(2,'0')).join('');
   const challenge=(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,verifier,{encoding:Crypto.CryptoEncoding.BASE64})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
   await SecureStore.setItemAsync('cleanproof.native.recovery.v1',JSON.stringify({verifier,backend:auth!.config.url,created:Date.now()}),{keychainAccessible:SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY});
   await auth!.requestReset(email,{redirectTo:Linking.createURL('reset-password'),challenge});setNotice('If eligible, a recovery link has been requested. Open it on this device. Delivery is not yet confirmed.');return;
  }
  if(mode==='signup'){if(!name.trim())throw Error('Enter your full name.');if(password!==confirm)throw Error('Passwords do not match.');attempts.current.take('signup');const result=await auth!.registerImmediately(email,password,name);if(result.status!=='signed-in'){setMode('signin');setNotice('Continue by signing in with the credentials you entered.');return;}}
  else{attempts.current.take('signin');await auth!.signIn(email,password);}
  await identity(ticket);
 })}/>
 <View style={ui.row}>{(['signin','signup','recovery'] as const).filter(v=>v!==mode).map(v=><Button key={v} secondary label={v==='signin'?'Sign in':v==='signup'?'Create account':'Forgot password'} disabled={busy} onPress={()=>{setMode(v);setError('');setNotice('');clearPasswords();}}/>)}</View></>}
 {(phase==='company'||phase==='error'&&!!auth?.session())&&<>
 {!!members.length&&members.map(m=><Button key={m.company_id} label={(m.name??'Open company')+' · '+m.role} disabled={busy} onPress={()=>void perform(ticket=>open(m.company_id,ticket))}/>)}
 {!members.length&&phase==='company'&&<><Field label="Company name" value={company} onChange={setCompany} max={120} disabled={busy}/><Field label="Timezone" value={timezone} onChange={setTimezone} max={100} disabled={busy}/><Button label="Create company" disabled={busy} onPress={()=>void perform(async ticket=>{request.current??=Crypto.randomUUID();await auth!.rpc('cp_register_company',{request_id:request.current,company_name:company,contact_email:auth!.session()?.user.email??'',company_timezone:timezone});await identity(ticket);})}/></>}
 {current.current&&<Button label="Return to workspace" disabled={busy} onPress={()=>setPhase('ready')}/>}
 {phase==='error'&&<Button label="Retry opening saved work" disabled={busy} onPress={()=>void perform(ticket=>identity(ticket))}/>}
 <Button secondary label="Switch account" disabled={busy} onPress={()=>void signOut()}/><Button secondary label="Log out" disabled={busy} onPress={()=>void signOut()}/></>}
 </View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
