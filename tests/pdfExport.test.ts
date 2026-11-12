import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beginPdfExport,downloadInspectionPdf,pdfSnapshot,closePdfExport} from '../src/reporting/pdfExport.web.ts';
import type {ReportData} from '../src/storage/workflowRepository.ts';
import type {ReportPhoto} from '../src/reporting/inspectionReport.ts';
const fixture=()=>JSON.parse(readFileSync('tests/fixtures/pdf-report.json','utf8')) as {data:ReportData;photos:ReportPhoto[]};
test('PDF download uses application/pdf and filename, retains retry link, revokes only transient URL',async()=>{
 const oldFetch=globalThis.fetch,oldDocument=globalThis.document,oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
 const urls:string[]=[],links:any[]=[];let blob:Blob|undefined;
 globalThis.fetch=async(path)=>new Response(readFileSync('public'+String(path)));
 URL.createObjectURL=(b)=>{blob=b as Blob;return 'blob:synthetic-report';};URL.revokeObjectURL=url=>{urls.push(url);};
 globalThis.document={body:{appendChild:()=>{}},createElement:()=>{const link={click:()=>{},remove:()=>{},download:'',href:'',rel:''};links.push(link);return link;}}as any;
 try{const {data,photos}=fixture(),generation=beginPdfExport();await downloadInspectionPdf(data,photos,generation);
  assert.equal(blob?.type,'application/pdf');assert.equal(pdfSnapshot()?.url,'blob:synthetic-report');assert.match(pdfSnapshot()?.filename??'',/\.pdf$/);assert.equal(links.length,0);
  closePdfExport();assert.equal(pdfSnapshot(),null);assert.ok(urls.includes('blob:synthetic-report'));
  // A late result after logout/close must never publish decrypted content.
  const stale=beginPdfExport();closePdfExport();await assert.rejects(downloadInspectionPdf(data,photos,stale),/account was locked/);assert.equal(pdfSnapshot(),null);
  globalThis.fetch=async()=>new Response('unavailable',{status:503});await assert.rejects(downloadInspectionPdf(data,photos,beginPdfExport()),/font could not be loaded/);assert.equal(pdfSnapshot(),null);
 }finally{closePdfExport();globalThis.fetch=oldFetch;globalThis.document=oldDocument;URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
});

test('prepared HTML and PDF stay paired across two reports; save writes the selected bytes and close fences access',async()=>{
 const {savePreparedPdf}=await import('../src/reporting/pdfExport.web.ts');
 const {PDFDocument}=await import('pdf-lib');
 const oldFetch=globalThis.fetch,oldWindow=(globalThis as any).window;
 globalThis.fetch=async(path)=>new Response(readFileSync('public'+String(path)));
 let written:Blob|undefined,closed=false;
 (globalThis as any).window={showSaveFilePicker:async()=>({createWritable:async()=>({write:async(b:Blob)=>{written=b;},close:async()=>{closed=true;},abort:async()=>{}})})};
 try{
  const {data,photos}=fixture();await downloadInspectionPdf(data,photos,beginPdfExport());const first=pdfSnapshot()!;
  assert.match(first.html,/Demo North Office/);assert.ok((await PDFDocument.load(await first.blob.arrayBuffer())).getPageCount()>1);
  assert.equal(await savePreparedPdf(),'saved');assert.equal(written,first.blob);assert.equal(closed,true);assert.equal(pdfSnapshot(),first);
  const second=structuredClone(data);second.draft.id='55555555-5555-4555-8555-555555555555';second.context.workspace.siteName='Synthetic South Office';
  await downloadInspectionPdf(second,photos,beginPdfExport());const next=pdfSnapshot()!;
  assert.notEqual(first.url,next.url);assert.match(next.filename,/55555555\.pdf$/);assert.match(next.html,/Synthetic South Office/);assert.doesNotMatch(next.html,/Demo North Office<\/h2>/);
  assert.equal(new TextDecoder().decode(new Uint8Array(await next.blob.arrayBuffer()).slice(0,5)),'%PDF-');
  closePdfExport();await assert.rejects(savePreparedPdf(),/Prepare this report/);
 }finally{closePdfExport();globalThis.fetch=oldFetch;(globalThis as any).window=oldWindow;}
});

test('save picker policy rejection is diagnosed without reporting success or destroying the prepared report',async()=>{
 const {savePreparedPdf,PdfSaveError}=await import('../src/reporting/pdfExport.web.ts');
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;globalThis.fetch=async path=>new Response(readFileSync('public'+String(path)));
 (globalThis as any).window={showSaveFilePicker:async()=>{throw new DOMException('Policy denied','SecurityError');}};
 try{const {data,photos}=fixture();await downloadInspectionPdf(data,photos,beginPdfExport());const selected=pdfSnapshot();await assert.rejects(savePreparedPdf(),e=>e instanceof PdfSaveError&&e.code==='picker-security');assert.equal(pdfSnapshot(),selected);}finally{closePdfExport();globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});
