import type {PreparedPdf} from './pdfExport.web.ts';
/** Explicit local export. No upload, persistent storage, credential or report ID in URL.
 * The receiving window is pinned to this origin AND this WindowProxy. Its one-time
 * challenge must be echoed before it accepts the document. Exported copies are
 * independent of the workspace, like any downloaded PDF, and expire in memory.
 */
export function openReportWindow(report:PreparedPdf):Promise<void>{
 const origin=window.location.origin;
 const child=window.open('/report-export.html','_blank');
 if(!child)return Promise.reject(Error('The browser blocked the export window. Allow this requested window and retry.'));
 return new Promise((resolve,reject)=>{
  let challenge:string|undefined;
  const cleanup=()=>{window.removeEventListener('message',receive);clearTimeout(timer);};
  const receive=(event:MessageEvent)=>{
   if(event.origin!==origin||event.source!==child)return;
   if(event.data?.type==='cleanproof-export-ready'&&typeof event.data.challenge==='string'&&event.data.challenge.length<=100){
    challenge=event.data.challenge;
    child.postMessage({type:'cleanproof-export-document',challenge,filename:report.filename,blob:report.blob,html:report.html},origin);
   }else if(event.data?.type==='cleanproof-export-received'&&challenge&&event.data.challenge===challenge){cleanup();resolve();}
  };
  const timer=setTimeout(()=>{cleanup();reject(Error('The export window could not receive the report. Check that it opened on this application.'));},45000);
  window.addEventListener('message',receive);
 });
}
