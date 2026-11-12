// Synthetic QA only. Requires: npx tsc -p tsconfig.tests.json
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {inspectionPdf} from '../.test-build/src/reporting/inspectionPdf.js';
const original=JSON.parse(readFileSync(new URL('../tests/fixtures/pdf-report.json',import.meta.url),'utf8'));
const fonts={regular:new Uint8Array(readFileSync(new URL('../public/fonts/Inter-400.ttf',import.meta.url))),bold:new Uint8Array(readFileSync(new URL('../public/fonts/Inter-700.ttf',import.meta.url)))};
const output=new URL('../artifacts/pdf-qa/',import.meta.url);mkdirSync(output,{recursive:true});
for(const kind of ['with-photo','without-photos','multi-page']){
 const{data,photos}=structuredClone(original);let evidence=photos;
 if(kind!=='with-photo'){data.photos=[];data.actionPhotos=[];evidence=[];}
 if(kind==='multi-page'){const first=data.context.workspace.items[0];data.context.workspace.items=Array.from({length:30},(_,i)=>({...first,id:'item-'+i,title:'Washroom cleanliness '+i+' — Étage'}));data.draft.responses=Object.fromEntries(data.context.workspace.items.map(i=>[i.id,{result:'pass',note:'Synthetic long note. '.repeat(90)}]));}
 writeFileSync(new URL(kind+'.pdf',output),await inspectionPdf(data,evidence,fonts));
}
console.log('Generated three synthetic QA PDFs under artifacts/pdf-qa. This is not browser download or authenticated acceptance.');
