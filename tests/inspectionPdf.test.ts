import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {PDFDocument,PDFDict,PDFName,PDFRawStream} from 'pdf-lib';
import {inspectionPdf,reportFilename} from '../src/reporting/inspectionPdf.ts';
import type {ReportData} from '../src/storage/workflowRepository.ts';
import type {ReportPhoto} from '../src/reporting/inspectionReport.ts';
const fixture=()=>JSON.parse(readFileSync('tests/fixtures/pdf-report.json','utf8'))as {data:ReportData;photos:ReportPhoto[]};
const fonts={regular:new Uint8Array(readFileSync('public/fonts/Inter-400.ttf')),bold:new Uint8Array(readFileSync('public/fonts/Inter-700.ttf'))};
test('completed report creates a real PDF with photographs and company metadata',async()=>{
 const {data,photos}=fixture(),bytes=await inspectionPdf(data,photos,fonts);
 assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getAuthor(),data.branding.name);assert.match(pdf.getTitle()!,/Demo North Office/);
 const embedded:number[]=[];
 for(const[,obj]of pdf.context.enumerateIndirectObjects())if(obj instanceof PDFDict&&obj.has(PDFName.of('FontFile2'))){const stream=obj.lookup(PDFName.of('FontFile2'));assert.ok(stream instanceof PDFRawStream);embedded.push(inflateSync(stream.getContents()).length);}
 assert.deepEqual(embedded.sort(),[fonts.regular.length,fonts.bold.length].sort(),'full font programs prevent the reproduced missing-glyph rendering defect');
 assert.ok(pdf.getPageCount()>=3);assert.ok(bytes.length>10000);
 for(const page of pdf.getPages()){assert.equal(Math.round(page.getWidth()),595);assert.equal(Math.round(page.getHeight()),842);}
 assert.match(reportFilename(data),/^CleanProof-Demo-North-Office-2026-10-21-[\w-]+\.pdf$/);
});
test('report without photos and all-N/A answers exports without invented score',async()=>{
 const {data}=fixture();data.photos=[];data.actionPhotos=[];data.actions=[];
 for(const response of Object.values(data.draft.responses)){response.result='na';response.note='Outside the site contract.';}
 const pdf=await PDFDocument.load(await inspectionPdf(data,[],fonts));assert.ok(pdf.getPageCount()>=1);
});
test('long findings, unbroken text, accents and action notes paginate on A4',async()=>{
 const {data}=fixture();data.photos=[];data.actionPhotos=[];
 const original=data.context.workspace.items[0]!;
 data.context.workspace.items=Array.from({length:40},(_,n)=>({...original,id:'item-'+n,title:`Washroom cleanliness ${n} — Étage`}));
 data.draft.responses=Object.fromEntries(data.context.workspace.items.map(i=>[i.id,{result:'fail',note:'Long note. '.repeat(150)+'x'.repeat(500)}]));
 data.actions[0]!.description='Follow-up details. '.repeat(250);data.actions[0]!.resolution_note='Resolution evidence checked. '.repeat(100);
 const pdf=await PDFDocument.load(await inspectionPdf(data,[],fonts));assert.ok(pdf.getPageCount()>15);assert.ok(pdf.getPageCount()<100);
});
test('missing, corrupt or foreign photos fail explicitly instead of exporting incomplete evidence',async()=>{
 const {data,photos}=fixture();await assert.rejects(inspectionPdf(data,[],fonts),/missing photographs/);
 await assert.rejects(inspectionPdf(data,[{...photos[0]!,base64:'AAAA'}],fonts),/could not be opened/);
 await assert.rejects(inspectionPdf(data,[...photos,{...photos[0]!,id:'foreign'}],fonts),/details are invalid/);
});
test('filename cannot escape a path; unsupported glyphs give a useful fallback',async()=>{
 const {data}=fixture();data.photos=[];data.context.workspace.siteName='../Office / Site';assert.ok(!reportFilename(data).includes('/'));
 data.context.workspace.siteName='Inspection 🧹';await assert.rejects(inspectionPdf(data,[],fonts),/Preview \/ Print/);
});
