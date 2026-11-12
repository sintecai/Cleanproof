import {useState,type ReactNode} from 'react';
import {browserFonts} from './browserFonts';
import {BrowserReportHost} from '../reporting/BrowserReportHost.web';
import {browserActiveKey,setBrowserPassphrase,setBrowserBackend} from '../storage/browserDatabase';
/** Public synthetic build only. No Auth session, credentials or remote adapter. */
export function ShowcaseBoundary({children}:{children:ReactNode}){
 const [error]=useState(()=>{try{
  if(process.env.EXPO_PUBLIC_CLEANPROOF_SHOWCASE!=='1'||process.env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY!=='1'||process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL||process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY)throw Error();
  let identity=sessionStorage.getItem('cleanproof-showcase-device');
  if(!identity){identity=JSON.stringify({profile:crypto.randomUUID(),key:crypto.randomUUID()+crypto.randomUUID()});sessionStorage.setItem('cleanproof-showcase-device',identity);}
  const selected=JSON.parse(identity);if(!/^[a-f0-9-]{36}$/.test(selected.profile)||typeof selected.key!=='string'||selected.key.length<12)throw Error();
  setBrowserBackend(null);setBrowserPassphrase(selected.key);localStorage.setItem(browserActiveKey(),selected.profile);return '';
 }catch{return 'This synthetic showcase needs HTTPS and browser storage. No account service was contacted.';}});
 return <div style={{display:'flex',flexDirection:'column',height:'100dvh',minHeight:0}}>
  <style>{browserFonts}</style>
  <aside role="note" style={{padding:'9px 14px',background:'#def8eb',color:'#103e34',font:'12px/1.45 Inter,system-ui',flexShrink:0}}><strong>Interactive synthetic showcase</strong> · Browser app, not Android/iOS. No real accounts or backend. Use invented data only; closing this tab can end this sample workspace. <a href="https://cleanproof-release-connected.sintecai26.chatgpt.site" target="_blank" rel="noreferrer" style={{color:'#00583e'}}>Connected app (staging)</a></aside>
  {error?<p role="alert">{error}</p>:<>{children}<BrowserReportHost/></>}
 </div>;
}
