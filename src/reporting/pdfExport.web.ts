import type {ReportData} from '../storage/workflowRepository.ts';
import {inspectionReport, type ReportPhoto} from './inspectionReport.ts';
let epoch=0;
export type PreparedPdf={url:string;filename:string;html:string;blob:Blob};
let prepared:PreparedPdf|null=null;
const listeners=new Set<()=>void>();
export const pdfSnapshot=()=>prepared;
export const subscribePdf=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
function emit(){for(const listener of listeners)listener();}
export function closePdfExport(){++epoch;if(prepared)URL.revokeObjectURL(prepared.url);prepared=null;emit();}
export function beginPdfExport(){closePdfExport();return epoch;}
export async function downloadInspectionPdf(data:ReportData,photos:ReportPhoto[],generation:number){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const font=async(path:string)=>{try{const r=await fetch(path,{signal:controller.signal,credentials:'same-origin'});if(!r.ok)throw Error();return new Uint8Array(await r.arrayBuffer());}catch{throw Error('The report font could not be loaded. Reconnect and retry.');}};
  const [regular,bold]=await Promise.all([font('/fonts/Inter-400.ttf'),font('/fonts/Inter-700.ttf')]);
  // Keep the PDF engine out of authentication/bootstrap; load only for an export.
  const {inspectionPdf,reportFilename}=await Promise.race([
    import('./inspectionPdf.ts'),
    new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('Loading the PDF assets timed out. Reconnect and retry.')),{once:true})),
  ]);
  const bytes=await inspectionPdf(data,photos,{regular,bold});
  if(controller.signal.aborted)throw Error('Loading the PDF assets timed out. Reconnect and retry.');
  if(generation!==epoch)throw Error('Report export was closed or the account was locked. Sign in and generate it again.');
  if(bytes.length<100 || new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid PDF output.');
  const blob=new Blob([bytes.slice().buffer],{type:'application/pdf'});
  const html=inspectionReport(data,photos);
  const url=URL.createObjectURL(blob);
  prepared={url,filename:reportFilename(data),html,blob};emit();
  // The explicit link in BrowserReportHost is clicked by the user after preparation.
  // An asynchronous synthetic click can lose browser user activation and be blocked.

 }catch(e){if(controller.signal.aborted)throw Error('Loading the PDF assets timed out. Reconnect and retry.');if(e instanceof Error&&/^(Recover the missing|A character in this report|Report export was closed|The report font|Photograph details|A photograph could not)/.test(e.message))throw e;throw Error('The PDF could not be generated. Your inspection is still saved. Reopen the report and retry; use Preview / Print if the problem continues.');}finally{clearTimeout(timeout);}
}

export class PdfSaveError extends Error {constructor(public code:'picker-security'|'write-failed'|'report-changed'){super('PDF save failed.');this.name='PdfSaveError';}}

/** Must be invoked directly from a user click, never after async PDF generation. */
export async function savePreparedPdf():Promise<'saved'|'requested'|'cancelled'> {
 const current=prepared;if(!current)throw Error('Prepare this report again before saving.');
 const picker=(window as unknown as {showSaveFilePicker?: (options:unknown)=>Promise<{createWritable():Promise<{write(data:Blob):Promise<void>;close():Promise<void>;abort():Promise<void>}>}>}).showSaveFilePicker;
 if(picker){
  let writable:Awaited<ReturnType<Awaited<ReturnType<NonNullable<typeof picker>>>['createWritable']>>|undefined;
  try{
   const handle=await picker.call(window,{suggestedName:current.filename,types:[{description:'PDF report',accept:{'application/pdf':['.pdf']}}]});
   if(prepared!==current)throw new PdfSaveError('report-changed');
   writable=await handle.createWritable();
   if(prepared!==current)throw new PdfSaveError('report-changed');
   await writable.write(current.blob);
   if(prepared!==current)throw new PdfSaveError('report-changed');
   await writable.close();return 'saved';
  }catch(e){if(writable)await writable.abort().catch(()=>undefined);if(e instanceof DOMException&&e.name==='AbortError')return 'cancelled';if(e instanceof PdfSaveError)throw e;throw new PdfSaveError(e instanceof DOMException&&['SecurityError','NotAllowedError'].includes(e.name)?'picker-security':'write-failed');}
 }
 const link=document.createElement('a');link.href=current.url;link.download=current.filename;link.rel='noopener';document.body.appendChild(link);link.click();link.remove();return 'requested';
}
