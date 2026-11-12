import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Brand} from './Brand';
import {useLayoutWidth} from './LayoutFrame';
import {AuthConnection,ConnectionError,backendConfig,type ConnectionDiagnostic,type Session,type SessionStorage} from '../auth/session';
import {openAccountDevice} from '../auth/accountDevice';
import {browserRecord,createBrowserRecord,browserActiveKey,setBrowserConnection,setBrowserAccount,setBrowserBackend,setBrowserPassphrase} from '../storage/browserDatabase';
import {browserFonts} from './browserFonts';
import {ProtectedBrowserAuth,ProtectedBrowserSession} from '../auth/protectedBrowserAuth';
import {emailCallback,prepareEmailLink,readEmailCallback,hasAuthFragment,EmailLinkError,type EmailPurpose} from '../auth/emailLinks';
import {safeDestination} from '../auth/returnDestination';
import {readAccountForm} from '../auth/accountForm';
import {PendingOperation} from '../auth/pendingOperation';
import {SingleFlight} from '../auth/singleFlight';
import {startupTrace} from '../auth/startupTrace';
import {setCustomerDestination} from './customerSession';
import {clearTransient} from '../media/nativeMedia.web';
import {removeRememberedAccounts} from '../auth/rememberedAccounts';
import {AuthAttemptGate} from '../auth/attemptGate';

class MemorySession implements SessionStorage {
  value:Session|null=null;
  async load(){return this.value;}
  async save(value:Session){this.value=value;}
  async clear(){this.value=null;}
}
function destination(value:string){return safeDestination(value,window.location.origin);}
function customerError(e:unknown):string {
 if(e instanceof EmailLinkError)return e.message;
 if(e instanceof ConnectionError){
  if(e.kind==='network')return 'Account services are unavailable. Please try again.';
  return e.message.replace(/\s*\[CP_[A-Z_]+\]/g,'').replace(/Open Connection help for safe diagnostics\./g,'Please try again.');
 }
 const message=e instanceof Error?e.message:'';
 const safe=['Enter a valid email address.','Enter your full name.','Passwords do not match.','Use matching passwords of at least 12 characters.','Open a fresh password reset link first.'];
 if(safe.includes(message))return message;
 if(/device key is missing/i.test(message))return 'This device cannot open its saved work. Your records have not been removed; contact support before changing browser storage.';
 if(/Another CleanProof tab/.test(message))return 'Another CleanProof tab is using this workspace. Close that tab or sign out there, then try again.';
 return 'Unable to complete this request. Please try again.';
}

function configuration(){
  const url=process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL,key=process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY;
  if(!url||!key)return null;
  return backendConfig(url,key);
}
// One account connection per loaded application, independent of navigator remounts.
// Secrets remain in the existing protected store; no credentials enter diagnostics.
let accountOwner: {protected:ProtectedBrowserAuth;auth:AuthConnection;restore:SingleFlight<Session|null>} | undefined;
function accountServices(config:ReturnType<typeof backendConfig>){
 if(!accountOwner){
  const protectedStore=new ProtectedBrowserAuth({read:async key=>browserRecord('customer-auth-v1',key),write:async(key,value)=>{await browserRecord('customer-auth-v1',key,value);},claim:async(key,value)=>createBrowserRecord('customer-auth-v1',key,value)},config.url);
  const auth=new AuthConnection(config,new ProtectedBrowserSession(protectedStore));
  accountOwner={protected:protectedStore,auth,restore:new SingleFlight()};setBrowserConnection(auth);
 }
 return accountOwner;
}
// One active account tab prevents cross-tab credential/cache races. The browser
// releases this lock on tab closure; it never deletes encrypted records.
let accountTabRelease:(()=>void)|undefined,accountTabClaim:Promise<void>|undefined,accountTabTask:Promise<unknown>|undefined;
function claimAccountTab(origin:string):Promise<void>{
 if(accountTabRelease)return Promise.resolve();if(accountTabClaim)return accountTabClaim;
 if(!navigator.locks)return Promise.reject(Error('Safe account access requires Web Locks support. Use an up-to-date browser; saved work is preserved.'));
 accountTabClaim=new Promise<void>((resolve,reject)=>{
  accountTabTask=navigator.locks.request('cleanproof-active-account:'+origin,{ifAvailable:true},async lock=>{
   if(!lock){reject(Error('Another CleanProof tab has an active workspace. Log out or close that tab, then try again. Do not clear browser data.'));return;}
   await new Promise<void>(release=>{accountTabRelease=release;resolve();});
  });
  void accountTabTask.catch(reject);
 });
 void accountTabClaim.finally(()=>{accountTabClaim=undefined;}).catch(()=>undefined);return accountTabClaim;
}
async function releaseAccountTab(){const release=accountTabRelease;accountTabRelease=undefined;release?.();await accountTabTask;accountTabTask=undefined;}
export function CustomerEntry({children}:{children:ReactNode}){
 const smallScreen=useLayoutWidth()<=760;
 const [,setInitialised]=useState(false);
 const resume=useRef('/');
 const [ready,setReady]=useState(false),[mode,setMode]=useState<'signin'|'signup'|'forgot'|'recover'>('signin');
 const [booting,setBooting]=useState(true);
 const [company,setCompany]=useState('Company workspace');
 const [leaving,setLeaving]=useState<'none'|'working'|'failed'>('none');
 const logoutRunning=useRef(false);
 const protectedAuth=useRef<ProtectedBrowserAuth|null>(null),recovery=useRef<AuthConnection|null>(null);
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [diagnostic,setDiagnostic]=useState<ConnectionDiagnostic|null>(null);
 const policy=useRef<string|null>(null);
 const [sessionPending,setSessionPending]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const pending=useRef(new PendingOperation());
 const activeUser=useRef<string|null>(null),hadCompany=useRef(false);
 const runEpoch=useRef(0);
 const running=useRef(false),alive=useRef(true),auth=useRef<AuthConnection|null>(null),target=useRef('/');
 const config=useRef<ReturnType<typeof configuration>>(null);
 const callbackStarted=useRef(false),attempts=useRef(new AuthAttemptGate()),entry=useRef<HTMLDivElement|null>(null);
 function clearPasswords(){setPassword('');setConfirm('');}
 async function enter(check:()=>void){
   check();
   const a=auth.current!;
   startupTrace('membership-start');
   const memberships=await a.memberships();check();startupTrace('membership-ready'); // Server validates token/user; RLS returns memberships.
   const session=a.session();if(!session)throw new ConnectionError('session','Your session has ended. Sign in to continue.');
   if(hadCompany.current && activeUser.current===session.user.id && memberships.length===0)throw new ConnectionError('session','Company access is no longer available. Sign in to continue.');
   const revision=a.revision();
   startupTrace('device-key-start');
   const device=await openAccountDevice({read:async scope=>{const saved=await browserRecord('account-device-v1',scope);if(!saved&&localStorage.getItem('cleanproof.account.device-seen.'+scope))throw Error('Account device key is missing. Existing local work is preserved.');return saved;},create:async(scope,value)=>{const saved=await createBrowserRecord('account-device-v1',scope,value);localStorage.setItem('cleanproof.account.device-seen.'+scope,'1');return saved;}},a.config.url,session.user.id);
   check();startupTrace('device-key-ready');localStorage.setItem('cleanproof.account.device-seen.'+device.scope,'1');
   if(!alive.current||revision!==a.revision()||a.session()?.user.id!==session.user.id)throw Error('Sign-in was locked. Please try again.');
   if(document.visibilityState==='hidden'){activeUser.current=session.user.id;setReady(false);setBooting(true);return;}
   await removeRememberedAccounts(protectedAuth.current!);check();
   setBrowserBackend(a.config);setBrowserAccount(session);setBrowserPassphrase(device.passphrase);
   if(!localStorage.getItem(browserActiveKey()))localStorage.setItem(browserActiveKey(),device.profile);
   resume.current=memberships.length?destination(target.current):'/onboarding';
   setCustomerDestination(resume.current);startupTrace('authenticated');
   activeUser.current=session.user.id;hadCompany.current=memberships.length>0;setPassword('');setConfirm('');setSessionPending(false);setReady(true);
 }
 async function transition<T,>(task:()=>Promise<T>){
   if(!config.current)return task();
   if(!navigator.locks)throw Error('Safe account changes require a browser with Web Locks support. Use an up-to-date Chrome, Edge, Firefox or Safari; saved work has not been removed.');
   return navigator.locks.request('cleanproof-account-transition:'+config.current.url,task);
 }
 async function endAccount(switching=false){
   if(logoutRunning.current)return;logoutRunning.current=true;
   ++runEpoch.current;pending.current.invalidate();running.current=false;activeUser.current=null;hadCompany.current=false;
   setReady(false);setBooting(false);setBusy(false);setLeaving('working');clearPasswords();
   setSessionPending(false);setCompany('Company workspace');setMessage('');setError('');
   clearTransient();setBrowserAccount(null);setBrowserPassphrase('');setBrowserBackend(null);setBrowserConnection(null);
   const previous=auth.current;
   try{
     // Cancel/fence old network work first. No new identity is admitted before durable local sign-out.
     const result=await transition(async()=>{if(config.current)await claimAccountTab(config.current.url);const result=previous?await previous.signOut():{serverRevoked:false};await protectedAuth.current?.clear('session');if(protectedAuth.current)await removeRememberedAccounts(protectedAuth.current);return result;});
     previous?.retire();recovery.current?.retire();recovery.current=null;await releaseAccountTab();
     accountOwner=undefined;
     if(config.current){const owner=accountServices(config.current);auth.current=owner.auth;protectedAuth.current=owner.protected;}
     target.current='/';resume.current='/';window.history.replaceState(null,'','/');
     setEmail('');setName('');setMode('signin');setLeaving('none');
     setMessage(result.serverRevoked ? '' : 'Signed out on this device. Server sign-out could not be confirmed; reconnect and review your sessions.');
   }catch{
     previous?.retire();setLeaving('failed');setError('Local sign-out could not be saved. Your workspace is locked. Retry sign-out before opening another account; do not clear browser data.');
   }finally{logoutRunning.current=false;}
 }
 async function run(task:(check:()=>void)=>Promise<void>){
  if(running.current)return;const epoch=++runEpoch.current;running.current=true;setBusy(true);setError('');setMessage('');setDiagnostic(null);policy.current=null;
  try{if(!auth.current)throw Error('Account services are not configured yet. No account or session has been created.');
   await pending.current.run(task,45000,'Opening the account took too long. Your saved session and work have not been removed. Retry opening below.');
  }catch(e){startupTrace('entry-error');if(alive.current&&epoch===runEpoch.current){setSessionPending(!!auth.current?.session() || (!(e instanceof ConnectionError)&&/took too long|storage|opening|key/i.test(e instanceof Error?e.message:'')));setDiagnostic(e instanceof ConnectionError?e.diagnostic??null:auth.current?.diagnostic()??null);
   if(e instanceof ConnectionError&&e.kind==='session'){setSessionPending(false);setMode('signin');activeUser.current=null;auth.current?.lock();}
   else if(auth.current?.session()&&!recovery.current){setMode('signin');setMessage('You are signed in. Opening your workspace failed; retry below. Do not create another account.');}
   setError(customerError(e));
  }}finally{if(epoch===runEpoch.current){running.current=false;if(alive.current){setBusy(false);setBooting(false);}if(!auth.current?.session()&&!recovery.current?.session())void releaseAccountTab().catch(()=>undefined);}}
 }

 useEffect(()=>{
   alive.current=true;startupTrace('entry-mount');
   try{config.current=configuration();if(config.current){
     const owner=accountServices(config.current);protectedAuth.current=owner.protected;auth.current=owner.auth;
   }}catch{setError('Account service configuration is invalid.');}
   setInitialised(true);
   if(protectedAuth.current)void removeRememberedAccounts(protectedAuth.current).catch(()=>undefined);
   const entryQuery=new URLSearchParams(window.location.search);
   target.current=destination(entryQuery.get('returnTo')||window.location.pathname+window.location.search);
   const captured=(window as Window & {__cleanproofAuthReturn?:{path:string;code?:string;error?:string;unsupported?:boolean}}).__cleanproofAuthReturn;
   delete (window as Window & {__cleanproofAuthReturn?:unknown}).__cleanproofAuthReturn;
   const callbackPath=captured?.path||window.location.pathname;
   const callback=/^\/(email-callback|reset-password)\/?$/.test(callbackPath);
   const unsafeFragment=captured?.unsupported||hasAuthFragment(window.location.hash);
   if((callback||unsafeFragment)&&!callbackStarted.current){
     callbackStarted.current=true;
     const query=captured?new URLSearchParams({...captured.code?{code:captured.code}:{},...captured.error?{error:captured.error}:{}}):new URLSearchParams(window.location.search);
     window.history.replaceState(null,'',callback?callbackPath:'/');
     void run(async check=>{
       if(unsafeFragment)throw new EmailLinkError('This older link used a different sign-in format. Its authentication details have been removed from the address bar. Sign in with your email and password, or request a fresh recovery link.');
         const purpose:EmailPurpose=/^\/reset-password\/?$/.test(callbackPath)?'recovery':'signup';
         setMode(purpose==='recovery'?'forgot':'signin');
         const pending=await protectedAuth.current!.read('email-'+purpose);
         const transaction=readEmailCallback(pending,window.location.origin,config.current!.url,purpose,query);
         await claimAccountTab(config.current!.url);check();
         await protectedAuth.current!.clear('email-'+purpose); // Consume before the network exchange; never replay a one-use code.
         target.current=transaction.destination;
         if(purpose==='recovery'){
           await protectedAuth.current!.clear('session');
           recovery.current=new AuthConnection(config.current!,new MemorySession());
           await recovery.current.exchangePkce(transaction.code,transaction.verifier);check();
           setEmail(recovery.current.session()?.user.email||'');setMode('recover');setMessage('Recovery link verified. Set a new password, then sign in.');
         }else{await auth.current!.exchangePkce(transaction.code,transaction.verifier);await enter(check);}
     });
   }else if(!callbackStarted.current){
     void run(async check=>{startupTrace('restore-start');await claimAccountTab(config.current!.url);check();const session=await accountOwner!.restore.run(()=>auth.current!.restore());check();startupTrace(session?'restore-authenticated':'restore-signed-out');if(session)await enter(check);});
   }else setBooting(false);
   function blocked(event:SecurityPolicyViolationEvent){
     try{if((event.effectiveDirective==='connect-src'||event.effectiveDirective==='default-src')&&new URL(event.blockedURI).origin===config.current?.url)policy.current=event.effectiveDirective;}catch{}
   }
   document.addEventListener('securitypolicyviolation',blocked);
   function companyReady(){resume.current='/';hadCompany.current=true;}
   function hidden(){if(document.visibilityState==='hidden'){clearPasswords();if(!activeUser.current||recovery.current)return;target.current=destination(window.location.pathname+window.location.search);++runEpoch.current;pending.current.invalidate();running.current=false;setBusy(false);setReady(false);setBooting(true);setBrowserPassphrase('');setBrowserAccount(null);setBrowserBackend(null);auth.current?.lock();}}
   function signOut(){void endAccount();}
   function companyLabel(event:Event){const detail=(event as CustomEvent).detail;if(detail?.user===auth.current?.session()?.user.id&&typeof detail.name==='string')setCompany(detail.name.slice(0,160));}
   function visible(){if(document.visibilityState!=='visible'||!activeUser.current||recovery.current||logoutRunning.current)return;const user=activeUser.current;void run(async check=>{await auth.current!.restore();check();if(auth.current!.session()?.user.id!==user)throw new ConnectionError('session','Your session has ended. Sign in to continue.');await enter(check);});}
   window.addEventListener('cleanproof-company-label',companyLabel);window.addEventListener('cleanproof-account-lock',signOut);window.addEventListener('cleanproof-company-activated',companyReady);document.addEventListener('visibilitychange',hidden);document.addEventListener('visibilitychange',visible);
   return()=>{alive.current=false;++runEpoch.current;running.current=false;pending.current.invalidate();document.removeEventListener('securitypolicyviolation',blocked);startupTrace('entry-unmount');window.removeEventListener('cleanproof-company-label',companyLabel);window.removeEventListener('cleanproof-account-lock',signOut);window.removeEventListener('cleanproof-company-activated',companyReady);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('visibilitychange',visible);};
 },[]);
 useEffect(()=>{if(!ready)entry.current?.scrollTo({top:0});},[mode,ready]);
 async function linkOptions(purpose:EmailPurpose){
   const transaction=await prepareEmailLink(window.location.origin,config.current!.url,purpose,target.current);
   await protectedAuth.current!.write('email-'+purpose,transaction); // Durable before requesting a mail link; supports another tab in this browser.
   return {redirectTo:emailCallback(window.location.origin,purpose),challenge:transaction.challenge};
 }
 async function submit(form:HTMLFormElement){const {name,email,password,confirm}=readAccountForm(new FormData(form));try{await run(async check=>{await transition(async()=>{check();if(sessionPending||mode==='signin'||mode==='signup')await claimAccountTab(config.current!.url);check();
   if(sessionPending){if(!auth.current!.session())await auth.current!.restore();if(!auth.current!.session()){setSessionPending(false);setMessage('Sign in to continue. Saved work is protected.');return;}await enter(check);return;}
   if(mode!=='recover'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw Error('Enter a valid email address.');
   if(mode==='signup'){
     if(!name.trim()||name.length>120)throw Error('Enter your full name.');
     if(password!==confirm)throw Error('Passwords do not match.');
     attempts.current.take('signup');
     const result=await auth.current!.registerImmediately(email,password,name);
     if(result.status==='signed-in')await enter(check);
     else{setMode('signin');setMessage('Continue by signing in with the credentials you entered. If sign-in is unavailable, use Forgot password or contact support.');}
   }else if(mode==='forgot'){
     attempts.current.take('recovery');await auth.current!.requestReset(email,await linkOptions('recovery'));setMessage('If eligible, a password reset link will arrive by email. Open it in this browser. No code entry is required.');
   }else if(mode==='recover'){
     if(password.length<12||password!==confirm)throw Error('Use matching passwords of at least 12 characters.');
     if(!recovery.current?.session())throw Error('Open a fresh password reset link first.');
     await recovery.current.updatePassword(password);const result=await recovery.current.signOut();recovery.current=null;
     setPassword('');setConfirm('');setMode('signin');setMessage(result.serverRevoked?'Password updated. Sign in with your new password.':'Password updated. Recovery-session revocation could not be confirmed. Sign in again and review your sessions.');
   }else{attempts.current.take('signin');await auth.current!.signIn(email,password);await enter(check);}
 });});}finally{clearPasswords();}}
 const exitControls=<><button type="button" onClick={()=>void endAccount(true)}>Switch account</button><button type="button" onClick={()=>void endAccount()}>Log out</button></>;
 if(leaving!=='none')return <main style={{padding:32,color:'#0b1c30',background:'#f7f8f5',height:'100dvh'}}><h1>{leaving==='working'?'Signing out safely…':'Sign-out needs attention'}</h1><p>Saved encrypted records and unsent work are being preserved.</p>{error&&<p role="alert">{error}</p>}{leaving==='failed'&&<button onClick={()=>void endAccount()}>Retry sign-out</button>}</main>;
 if(booting)return <div role="status" style={{padding:32,color:'#0b1c30',background:'#f7f8f5',height:'100dvh'}}>Restoring your secure session…<p>{exitControls}</p></div>;
 if(ready)return <div style={{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden',background:'transparent'}}><style>{browserFonts+`
.cp-account-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 16px;border-bottom:1px solid #d6e1dc;background:white;color:#0b1c30;font:13px Inter,system-ui,sans-serif;flex:none}.cp-account-bar details{position:relative}.cp-account-bar summary{cursor:pointer;padding:10px;min-height:24px}.cp-account-bar .cp-account-menu{position:absolute;right:0;top:100%;z-index:1000;background:white;border:1px solid #d6e1dc;border-radius:8px;padding:12px;width:min(300px,80vw);max-height:70dvh;overflow:auto;box-shadow:0 8px 24px #0b1c3020;display:grid;gap:8px;overflow-wrap:anywhere}.cp-account-bar button{min-height:44px;border:1px solid #cddbd4;background:#f7f8f5;color:#0b1c30;border-radius:6px;cursor:pointer}.cp-account-bar summary:focus-visible,.cp-account-bar button:focus-visible{outline:3px solid #00885d}.cp-account-bar p{margin:4px 0;line-height:1.5}`}</style><header className="cp-account-bar"><strong>{company}</strong><details><summary>Account</summary><section className="cp-account-menu" aria-label="Account menu"><strong>{auth.current?.session()?.user.email||'Signed-in account'}</strong><span>{company}</span><p>Switching signs out this account. Encrypted work and unsent queues stay protected.</p><button onClick={()=>void endAccount(true)}>Switch account</button><button onClick={()=>void endAccount(true)}>Add account</button><button onClick={()=>void endAccount()}>Log out</button></section></details></header><div style={{display:'flex',flex:1,minHeight:0,flexDirection:'column',overflow:'hidden'}}>{children}</div></div>;
 return <div ref={entry} className={smallScreen?"cp-auth cp-auth-mobile":"cp-auth"}>
 <style>{browserFonts+`
 .cp-auth{height:100dvh;min-height:0;overflow-y:auto;overflow-x:hidden;align-items:start;background:#f7f8f5;color:#0b1c30;font-family:Inter,system-ui,sans-serif;display:grid;grid-template-columns:minmax(260px,.9fr) minmax(0,1.1fr)}
 .cp-story{position:sticky;top:0;min-height:100dvh;box-sizing:border-box;overflow-wrap:anywhere;background:#0b1c30;color:white;padding:clamp(32px,6vw,88px);display:flex;flex-direction:column;justify-content:space-between;gap:clamp(20px,5dvh,64px)}
 .cp-logo{font-size:24px;font-weight:800;letter-spacing:-.8px;display:flex;align-items:center;gap:10px}.cp-brand-icon{width:42px;height:45px;border-radius:7px}.cp-story h1{font:700 clamp(34px,4vw,56px)/1.12 Manrope,system-ui,sans-serif;letter-spacing:-2px;max-width:560px}.cp-story p{color:#c2d6d0;line-height:1.8;max-width:430px}.cp-eyebrow{color:#80e1b9;font-size:12px;letter-spacing:2px;font-weight:700}
 .cp-auth-main{box-sizing:border-box;min-width:0;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:40px 28px}.cp-auth-card{flex:none;width:100%;max-width:420px;margin-block:auto;overflow-wrap:anywhere}.cp-auth-card h2{font:700 30px/1.2 Manrope,system-ui,sans-serif;letter-spacing:-1px;margin:0 0 12px}.cp-sub{font-size:14px;line-height:1.7;color:#526477;margin-bottom:28px}
 .cp-auth form{display:grid;gap:16px}.cp-auth label{display:grid;gap:8px;font-size:13px;font-weight:600}.cp-auth input{box-sizing:border-box;width:100%;min-height:46px;border:1px solid #cddbd4;border-radius:8px;background:white;color:#0b1c30;font:15px Inter,system-ui,sans-serif;padding:12px}.cp-auth button{min-height:46px;padding:11px 18px;border:1px solid #cddbd4;border-radius:8px;background:white;color:#0b1c30;font:600 14px Inter,system-ui,sans-serif;cursor:pointer}.cp-auth button.primary{background:#006c49;color:white;border-color:#006c49;width:100%}.cp-auth button:disabled{opacity:.5;cursor:default}.cp-auth .link{background:none;border:0;padding:8px 0;min-height:44px;color:#006c49}.cp-auth :focus-visible{outline:3px solid #00885d;outline-offset:3px}.cp-notice{font-size:13px;line-height:1.6;padding:12px;border-radius:8px;background:#fff3db;color:#604816;margin:0 0 16px}.cp-error{color:#344b58;background:#eef4f1;border:1px solid #d7e5dd}.cp-switch{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;font-size:13px;margin-top:20px}.cp-auth small{display:block;color:#526477;line-height:1.6;font-size:12px;margin-top:24px}
 @media(max-width:760px){.cp-auth{display:block}.cp-story{position:static;min-height:0;padding:20px 22px;gap:12px}.cp-story h1{font-size:30px;letter-spacing:-1px;margin:12px 0}.cp-story p,.cp-story footer{display:none}.cp-auth-main{min-height:0;padding:20px 22px 28px}.cp-auth-card{margin-block:0}.cp-auth-card h2{font-size:26px}}.cp-auth.cp-auth-mobile{display:block}.cp-auth-mobile .cp-story{position:static;min-height:0;padding:20px 22px;gap:12px}.cp-auth-mobile .cp-story h1{font-size:30px;letter-spacing:-1px;margin:12px 0}.cp-auth-mobile .cp-story p,.cp-auth-mobile .cp-story footer{display:none}.cp-auth-mobile .cp-auth-main{min-height:0;padding:20px 22px 28px}.cp-auth-mobile .cp-auth-card{margin-block:0}.cp-auth-mobile .cp-auth-card h2{font-size:26px}@media(prefers-reduced-motion:reduce){.cp-auth *{animation:none!important;transition:none!important}}
 ${process.env.EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW==='1'?'.cp-auth{display:block}.cp-story{position:static;min-height:0;padding:20px 22px;gap:12px}.cp-story h1{font-size:30px;letter-spacing:-1px;margin:12px 0}.cp-story p,.cp-story footer{display:none}.cp-auth-main{min-height:0;padding:20px 22px 28px}.cp-auth-card{margin-block:0}.cp-auth-card h2{font-size:26px}':''}
 `}</style>
 <aside className="cp-story"><div className="cp-logo"><Brand dark /></div><div><div className="cp-eyebrow">CLEANING QUALITY, CLEARLY RECORDED</div><h1>Every clean.<br/>Clear evidence.</h1><p>Your sites, inspections and follow-up, organised in one place. Built for teams who take pride in their work.</p></div><footer><p>Sicy International Ltd</p></footer></aside>
 <main className="cp-auth-main"><section className="cp-auth-card" aria-label="CleanProof account">
 {process.env.EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT==='staging'&&<div className="cp-notice" role="status">Staging preview · use synthetic test accounts.</div>}
 <h2>{mode==='signup'?'Create your account':mode==='forgot'||mode==='recover'?'Reset your password':'Welcome back'}</h2>
 <p className="cp-sub">{mode==='signup'?'Start with your account. Set up your company next.':mode==='forgot'?'Enter your account email to request a password reset link. Open the latest link in this browser.':mode==='recover'?'Choose a new password, then sign in again.':'Sign in to your company workspace.'}</p>
 {!config.current&&<div className="cp-notice" role="status">Account services are not connected in this environment. Registration, sign-in and synchronisation are unavailable.</div>}

 <form onSubmit={e=>{e.preventDefault();void submit(e.currentTarget);}}>
 {!sessionPending&&mode==='signup'&&<label>Full name<input name="fullName" autoComplete="name" value={name} maxLength={120} onChange={e=>{setName(e.target.value);if(error)setError('');}} disabled={busy} required/></label>}
 {!sessionPending&&mode!=='recover'&&<label>Email address<input name="email" type="email" autoComplete="username" value={email} maxLength={254} onChange={e=>{setEmail(e.target.value);if(error)setError('');}} disabled={busy} required/></label>}
 {!sessionPending&&(mode==='signin'||mode==='signup'||mode==='recover')&&<label>{mode==='recover'?'New password':'Password'}<input name="password" type="password" autoComplete={mode==='signin'?'current-password':'new-password'} value={password} minLength={mode==='signin'?1:12} maxLength={256} onChange={e=>{setPassword(e.target.value);if(error)setError('');}} disabled={busy} required/></label>}
 {!sessionPending&&(mode==='signup'||mode==='recover')&&<label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" value={confirm} maxLength={256} onChange={e=>{setConfirm(e.target.value);if(error)setError('');}} disabled={busy} required/></label>}

 {!!error&&<div className="cp-notice cp-error" role="alert">{error}</div>}
 {mode==='signup'&&!!error&&<div className="cp-switch" aria-label="Account access options"><button type="button" disabled={busy} onClick={()=>{clearPasswords();setMode('signin');setError('');setMessage('Sign in with your existing credentials. Creating an account does not change an existing password.');}}>Go to Sign in</button><button type="button" disabled={busy} onClick={()=>{clearPasswords();setMode('forgot');setError('');setMessage('Recovery is a separate request. No recovery email has been sent.');}}>Forgot password</button></div>}{!!message&&<div className="cp-notice" role="status">{message}</div>}
 <button className="primary" type="submit" disabled={busy||booting||!config.current}>{busy||booting?'Please wait…':sessionPending?'Retry opening workspace':mode==='signup'?'Create account':mode==='forgot'?'Send recovery email':mode==='recover'?'Set new password':'Sign in'}</button>
 </form>
 {sessionPending&&<button className="link" onClick={()=>void endAccount()}>Log out</button>}
 {mode==='signin'&&!sessionPending&&<button className="link" disabled={busy} onClick={()=>{clearPasswords();setMode('forgot');setError('');}}>Forgot password?</button>}

 <div className="cp-switch"><span>{mode==='signin'?'New to CleanProof?':'Already have an account?'}</span><button className="link" disabled={busy||sessionPending} onClick={()=>{recovery.current?.lock();recovery.current=null;setMode(mode==='signin'?'signup':'signin');setPassword('');setConfirm('');setError('');setMessage('');}}>{mode==='signin'?'Create account':'Sign in'}</button></div>

 <small>Account access and local device storage are separate. Clearing browser data can lose unsynchronised work. Password recovery cannot restore device-only records.</small>
 </section></main></div>;
}
