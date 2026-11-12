import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {File} from 'expo-file-system';
import type {ReportData} from '../storage/workflowRepository.ts';
import {inspectionReport,type ReportPhoto} from './inspectionReport.ts';
export type PreparedNativeReport={uri:string;filename:string;data:ReportData;photos:ReportPhoto[]};
let epoch=0,prepared:PreparedNativeReport|null=null;
const listeners=new Set<()=>void>();
export const nativeReportSnapshot=()=>prepared;
export function subscribeNativeReport(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function emit(){listeners.forEach(listener=>listener());}
function remove(uri:string){try{const f=new File(uri);if(f.exists)f.delete();}catch{/* App-private cache may already have been removed at sign-out. */}}
export function closeNativeReport(){++epoch;if(prepared)remove(prepared.uri);prepared=null;emit();}
export function beginPdfExport(){closeNativeReport();return epoch;}
export async function downloadInspectionPdf(data:ReportData,photos:ReportPhoto[],generation:number):Promise<void>{
 let uri:string|undefined,expired=false,timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const operation=Print.printToFileAsync({html:inspectionReport(data,photos),width:595,height:842}).then(result=>{if(expired||generation!==epoch){remove(result.uri);throw Error('Report preparation was cancelled.');}return result;});
  const pdf=await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('Report preparation took too long. Retry; your inspection is still saved.'));},30000);})]);uri=pdf.uri;
  const bytes=await new File(uri).bytes();
  if(bytes.length<100||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('The generated report is not a readable PDF. Retry preparing it.');
  if(generation!==epoch)throw Error('Report preparation was cancelled.');
  const site=data.context.workspace.siteName.replace(/[^a-z0-9-]+/gi,'-').slice(0,60)||'inspection';
  const date=(data.completedAt??data.draft.updatedAt).slice(0,10);
  prepared={uri,filename:`CleanProof-${site}-${date}-${data.draft.id.slice(0,8)}.pdf`,data,photos};uri=undefined;emit();
 }finally{if(timer)clearTimeout(timer);if(uri)remove(uri);}
}
/** Share-sheet completion does not prove that the user saved or opened the file. */
export async function exportNativeReport(){
 const current=prepared;if(!current)throw Error('Prepare the report again.');
 if(!await Sharing.isAvailableAsync())throw Error('File export is unavailable on this device. Your inspection is still saved.');
 const source=new File(current.uri),target=new File(source.parentDirectory,current.filename);
 try{
  if(target.exists)target.delete();source.copy(target);
  if(prepared!==current)throw Error('The account or report changed. Prepare it again.');
  await Sharing.shareAsync(target.uri,{mimeType:'application/pdf',UTI:'com.adobe.pdf',dialogTitle:'Save or open CleanProof PDF'});
 }finally{if(target.exists)target.delete();}
}
