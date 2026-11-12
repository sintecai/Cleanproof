// Official self-contained distribution avoids Metro resolving tslib's incompatible ESM wrapper.
import {PDFDocument, PageSizes, rgb} from 'pdf-lib/dist/pdf-lib.js';
import type {PDFFont,PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {ReportData} from '../storage/workflowRepository.ts';
import type {ReportPhoto} from './inspectionReport.ts';
import {score,displayDate} from '../domain/workflow.ts';
export type PdfFonts={regular:Uint8Array;bold:Uint8Array};
export function reportFilename(data:ReportData){
 const slug=(s:string)=>s.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'inspection';
 const date=(data.completedAt??data.draft.updatedAt).slice(0,10);
 return `CleanProof-${slug(data.context.workspace.siteName)}-${date}-${slug(data.draft.id.slice(0,8))}.pdf`;
}
/** Real, searchable PDF bytes. No HTML renderer, popup, server or external asset requests. */
export async function inspectionPdf(data:ReportData,photos:ReportPhoto[],fonts:PdfFonts){
 const expected=[...data.photos,...data.actionPhotos??[]];
 if(expected.some(a=>!photos.some(p=>p.id===a.id)))throw Error('Recover the missing photographs before downloading this report.');
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 // Keep complete TTFs: subsetting these existing Inter assets lost visible glyphs in Poppler QA.
 const regular=await pdf.embedFont(fonts.regular,{subset:false}),bold=await pdf.embedFont(fonts.bold,{subset:false});
 const w=data.context.workspace,ref=`CP-${data.draft.id.slice(0,8).toUpperCase()}`;
 pdf.setTitle(`${ref} — ${w.siteName}`);pdf.setAuthor(data.branding.name);pdf.setCreator('CleanProof · Sicy International Ltd');
 const navy=rgb(.043,.11,.188),teal=rgb(0,.42,.29),muted=rgb(.32,.39,.46);
 const width=PageSizes.A4[0],height=PageSizes.A4[1],left=46,right=width-46,bottom=58;
 let page!:PDFPage,y=0;
 const clean=(v:string)=>v.replace(/\r\n?/g,'\n').replace(/\t/g,'    ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
 const characterSets=new Map<PDFFont,Set<number>>([[regular,new Set(regular.getCharacterSet())],[bold,new Set(bold.getCharacterSet())]]);
 const widths=new Map<PDFFont,Map<string,number>>([[regular,new Map()],[bold,new Map()]]);
 const charWidth=(font:PDFFont,char:string,size:number)=>{const cache=widths.get(font)!;let width=cache.get(char);if(width===undefined){width=font.widthOfTextAtSize(char,1);cache.set(char,width);}return width*size;};
 function lines(value:string,font:PDFFont,size:number,max=right-left){
  const result:string[]=[];
  for(const paragraph of clean(value).split('\n')){
   let line='',lineWidth=0;
   // Character-aware hard wrap also supports long URLs and unbroken notes.
   for(const char of paragraph){
    if(!characterSets.get(font)!.has(char.codePointAt(0)!))throw Error('A character in this report is not supported by the PDF font. Use Preview / Print, or contact support.');
    if(line&&lineWidth+charWidth(font,char,size)>max){
     const split=line.lastIndexOf(' ');
     if(split>line.length/2){result.push(line.slice(0,split));line=line.slice(split+1)+char;}else{result.push(line);line=char;}
     lineWidth=Array.from(line).reduce((sum,c)=>sum+charWidth(font,c,size),0);
    }else{line+=char;lineWidth+=charWidth(font,char,size);}
   }
   result.push(line);
  }return result;
 }
 function newPage(){page=pdf.addPage(PageSizes.A4);y=height-44;
  for(const line of lines(data.branding.name,bold,14)){page.drawText(line,{x:left,y,size:14,font:bold,color:navy});y-=18;}
  page.drawText(`${ref} · ${data.status==='completed'?'COMPLETED LOCALLY':'DRAFT — NOT COMPLETED'}`,{x:left,y:y-3,size:8,font:regular,color:teal});y-=20;
  page.drawLine({start:{x:left,y},end:{x:right,y},thickness:1.5,color:teal});y-=24;
 }
 function text(value:string,size=10,font=regular,color=navy,gap=7){
  for(const line of lines(value,font,size)){
   if(y-size*1.4<bottom)newPage();
   page.drawText(line,{x:left,y,size,font,color});y-=size*1.4;
  }y-=gap;
 }
 function heading(value:string){if(y<bottom+65)newPage();text(value,16,bold,teal,10);}
 newPage();heading('Inspection report');
 text(data.branding.contact,9,regular,muted);
 text(`Customer: ${data.context.customerName}\nSite: ${w.siteName}\n${data.context.address}`);
 text(`Inspection: ${displayDate(data.completedAt??data.draft.updatedAt,data.context.timezone)}\nInspector: ${data.inspector||'Not yet recorded'}\nChecklist: ${w.templateName}\nTimezone: ${data.context.timezone}`);
 const s=score(data.draft);
 heading('Results summary');text(`Pass ${s.pass}    Fail ${s.fail}    N/A ${s.na}    Unanswered ${s.total-s.answered}`,11,bold);
 text(`Applicable item pass rate: ${s.percentage===null?'N/A — no applicable answers':s.percentage+'%'}\nPass ÷ (Pass + Fail). N/A and unanswered items excluded.`);
 text(`Generated: ${displayDate(data.generatedAt,data.context.timezone)}. Action status is current as of generation.`,9,regular,muted);
 if(data.correctionOf)text(`Correction of CP-${data.correctionOf.slice(0,8).toUpperCase()}: ${data.correctionReason}`);
 heading('Checklist findings');
 for(const [index,item]of w.items.entries()){
  if(y<bottom+65)newPage();const response=data.draft.responses[item.id];
  text(`${index+1}. ${item.title}`,11,bold);
  if(item.section)text(`Section: ${item.section}`,9,regular,muted);
  text(`Result: ${response?.result==='na'?'N/A':response?.result?.toUpperCase()||'UNANSWERED'}`,10,bold,response?.result==='fail'?rgb(.61,.19,.18):teal);
  text(response?.note||'No comment recorded.');y-=7;
 }
 if(data.actions.length){heading('Corrective actions');text('Assignment does not imply a notification was sent.',9,regular,muted);
  for(const action of data.actions){
   text(`${action.status.toUpperCase()} · ${action.id.slice(0,8)}`,11,bold);
   text(`Finding: ${w.items.find(i=>i.id===action.item_id)?.title??'Linked finding'}`);
   text(action.description);text(`Responsible: ${action.owner_name}\nDue: ${displayDate(action.due_date,data.context.timezone)}`);
   if(action.resolution_note)text(`Resolution: ${action.resolution_note}`);
   if(action.resolved_at)text(`Resolved: ${displayDate(action.resolved_at,data.context.timezone)}`);y-=10;
  }
 }else{heading('Corrective actions');text('No corrective actions recorded.');}
 for(const photo of photos){
  if(!expected.some(a=>a.id===photo.id)||!w.items.some(i=>i.id===photo.itemId)||!/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64))throw Error('Photograph details are invalid. Reopen the inspection and retry.');
  let image;try{image=await pdf.embedJpg(photo.base64);}catch{throw Error('A photograph could not be opened. Recover or replace the affected photograph before downloading.');}
  newPage();heading(photo.actionId?'Corrective-action evidence':'Photographic evidence');
  text(w.items.find(i=>i.id===photo.itemId)!.title,11,bold);
  text(photo.caption||'Inspection photograph',10);
  // Captions can span pages; the image is fitted into remaining space, without cropping.
  if(y<bottom+160)newPage();
  const factor=Math.min((right-left)/image.width,(y-bottom-20)/image.height,1);
  const iw=image.width*factor,ih=image.height*factor;
  page.drawImage(image,{x:left+(right-left-iw)/2,y:y-ih,width:iw,height:ih});y-=ih+18;
  text(`Evidence reference: ${photo.id.slice(0,8)}. Recorded on device; not independently verified.`,8,regular,muted);
 }
 const all=pdf.getPages();for(const[p,index]of all.map((p,i)=>[p,i]as const)){
  p.drawLine({start:{x:left,y:42},end:{x:right,y:42},thickness:.5,color:muted});
  p.drawText(`Local PDF export · no expiry or revocation · ${index+1} / ${all.length}`,{x:left,y:28,size:8,font:regular,color:muted});
 }
 return pdf.save();
}
