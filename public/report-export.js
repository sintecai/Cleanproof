/* Same-origin in-memory handoff only. Never persist a report or log its contents. */
(()=>{'use strict';
 const source=window.opener,origin=location.origin,challenge=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const status=document.getElementById('status'),download=document.getElementById('download'),open=document.getElementById('open'),frame=document.getElementById('report');
 let url,file,saveName,received=false,expired=false,saving=false;
 function release(){expired=true;if(url)URL.revokeObjectURL(url);url=undefined;file=undefined;download.removeAttribute('href');download.removeAttribute('download');download.setAttribute('aria-disabled','true');open.removeAttribute('href');open.setAttribute('aria-disabled','true');frame.srcdoc='';}
 document.getElementById('close').addEventListener('click',()=>{release();window.close();status.textContent='Report closed. Return to the CleanProof tab.';});
 download.addEventListener('click',event=>{
  if(!url||expired||saving){event.preventDefault();return;}
  // Use the browser download manager; a save-picker promise may remain pending.
  status.textContent='Download requested. Check your browser downloads. Exported copies cannot be revoked.';
 });
 function receive(event){
  if(received||expired||event.origin!==origin||event.source!==source||event.data?.type!=='cleanproof-export-document'||event.data.challenge!==challenge)return;
  const {blob,filename,html}=event.data;
  if(!(blob instanceof Blob)||blob.type!=='application/pdf'||blob.size<100||blob.size>100*1024*1024||typeof filename!=='string'||!/^CleanProof-[A-Za-z0-9_-]+\.pdf$/.test(filename)||typeof html!=='string'){status.textContent='The report could not be received. Close this window and prepare it again.';return;}
  received=true;window.removeEventListener('message',receive);clearTimeout(waiting);
  file=blob;saveName=filename;url=URL.createObjectURL(blob);download.href=url;download.download=filename;download.setAttribute('aria-disabled','false');open.href=url;open.setAttribute('aria-disabled','false');frame.srcdoc=html;document.title='CleanProof · '+filename;
  status.textContent='Your report is ready. Choose Download PDF to save it. This private copy stays only in this window and expires after 15 minutes.';
  source.postMessage({type:'cleanproof-export-received',challenge},origin);
  // Sever access after the one-time transfer. No account/session is transferred.
  window.opener=null;
  setTimeout(()=>{release();status.textContent='This private export has expired. Prepare the report again in CleanProof.';},15*60*1000);
 }
 const waiting=setTimeout(()=>{window.removeEventListener('message',receive);status.textContent='No report received. Open this window using Open in browser inside a prepared CleanProof report.';},40000);
 if(!source){clearTimeout(waiting);status.textContent='Open this page using Open in browser inside a prepared CleanProof report. No report is stored at this URL.';return;}
 window.addEventListener('message',receive);source.postMessage({type:'cleanproof-export-ready',challenge},origin);
 window.addEventListener('pagehide',()=>{release();status.textContent='This export is closed. Reopen the report in CleanProof.';},{once:true});
})();
