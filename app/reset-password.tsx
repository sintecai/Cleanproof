import {useEffect,useRef,useState} from 'react';
import {router,useLocalSearchParams} from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {Text,View} from 'react-native';
import {AuthConnection,type Session,type SessionStorage} from '../src/auth/session';
import {recoveryBootstrap} from '../src/auth/recoveryBootstrap';
import {nativeAccountServices} from '../src/application/nativeAccountServices';
import {Button,Field,Page,ui} from '../src/application/ui';
class RecoverySession implements SessionStorage {
 value:Session|null=null;
 async load(){return this.value;}
 async save(v:Session){this.value=v;}
 async clear(){this.value=null;}
}
export default function ResetPassword(){
 const params=useLocalSearchParams<{code?:string|string[];error?:string;error_code?:string}>();
 const [phase,setPhase]=useState<'checking'|'ready'|'done'|'error'>('checking'),[message,setMessage]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);
 const connection=useRef<AuthConnection|null>(null),live=useRef(false);
 const bootstrap=useRef<ReturnType<typeof recoveryBootstrap<AuthConnection>>|null>(null);
 useEffect(()=>{
  live.current=true;
  if(!bootstrap.current){
   const code=params.code;
   const rejected=!!(params.error||params.error_code);
   router.setParams({code:undefined,error:undefined,error_code:undefined});
   bootstrap.current=recoveryBootstrap(async()=>{
    const base=nativeAccountServices();if(!base)throw Error('Account services are unavailable.');
    const stored=await SecureStore.getItemAsync('cleanproof.native.recovery.v1',{keychainAccessible:SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY});
    await SecureStore.deleteItemAsync('cleanproof.native.recovery.v1');
    const v=stored?JSON.parse(stored):null;
    if(rejected||typeof code!=='string'||!code||code.length>2048||!v||v.backend!==base.config.url||typeof v.verifier!=='string'||!Number.isFinite(v.created)||Date.now()<v.created||Date.now()-v.created>86400000)throw Error('Invalid recovery link.');
    const recovery=new AuthConnection(base.config,new RecoverySession());
    try{await recovery.exchangePkce(code,v.verifier);return recovery;}catch(error){recovery.retire();throw error;}
   });
  }
  const unsubscribe=bootstrap.current.subscribe(result=>{
   if(!live.current)return;
   if('error'in result){setMessage('This link could not be used. Request a fresh recovery link on this device.');setPhase('error');}
   else{connection.current=result.value;setPhase('ready');}
  });
  return()=>{live.current=false;unsubscribe();connection.current=null;};
 },[]);
 async function submit(){if(busy)return;if(password.length<12||password!==confirm){setMessage('Enter matching passwords of at least 12 characters.');return;}setBusy(true);setMessage('');try{if(!connection.current?.session())throw Error();await connection.current.updatePassword(password);await connection.current.signOut();await nativeAccountServices().signOut();connection.current=null;setPassword('');setConfirm('');if(live.current)setPhase('done');}catch{if(live.current)setMessage('Password could not be updated. Request a fresh recovery link and try again.');}finally{if(live.current)setBusy(false);}}
 return <Page title="Reset your password" back={false}>{phase==='checking'?<Text style={ui.body}>Checking your recovery link…</Text>:phase==='ready'?<View style={ui.card}><Text style={ui.body}>Choose a new password, then sign in again.</Text><Field label="New password" value={password} onChange={setPassword} secure disabled={busy}/><Field label="Confirm password" value={confirm} onChange={setConfirm} secure disabled={busy}/><Button label={busy?'Updating…':'Set new password'} disabled={busy} onPress={()=>void submit()}/></View>:<Text style={ui.body}>{phase==='done'?'Password updated. Sign in with your new password.':message}</Text>}{phase==='ready'&&!!message&&<Text style={ui.error}>{message}</Text>}{(phase==='error'||phase==='done')&&<Button label="Go to sign in" onPress={()=>router.replace('/onboarding')}/>}</Page>;
}
