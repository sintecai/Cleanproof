import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openReportWindow} from '../src/reporting/reportHandoff.web.ts';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('export sends only the selected document to its own same-origin window and completes on the matching challenge',async()=>{
 const old=globalThis.window;let listener:((event:any)=>void)|undefined;const sent:any[]=[];
 const child={postMessage:(data:any,origin:string)=>sent.push({data,origin})};
 (globalThis as any).window={location:{origin:'https://cleanproof.example'},open:(path:string)=>{assert.equal(path,'/report-export.html');return child;},addEventListener:(_name:string,fn:any)=>{listener=fn;},removeEventListener:()=>{listener=undefined;}};
 const report={blob:new Blob(['%PDF-selected-report'],{type:'application/pdf'}),filename:'CleanProof-selected.pdf',html:'<p>selected report</p>',url:'blob:local'};
 try{const pending=openReportWindow(report);const ready={type:'cleanproof-export-ready',challenge:'one-time'};
  listener!({origin:'https://unrelated.example',source:child,data:ready});listener!({origin:'https://cleanproof.example',source:{},data:ready});assert.equal(sent.length,0);
  listener!({origin:'https://cleanproof.example',source:child,data:ready});assert.equal(sent.length,1);assert.equal(sent[0].data.blob,report.blob);assert.equal(sent[0].data.html,report.html);assert.equal(sent[0].origin,'https://cleanproof.example');assert.equal('session' in sent[0].data,false);
  listener!({origin:'https://cleanproof.example',source:child,data:{type:'cleanproof-export-received',challenge:'wrong'}});assert.ok(listener);
  listener!({origin:'https://cleanproof.example',source:child,data:{type:'cleanproof-export-received',challenge:'one-time'}});await pending;assert.equal(listener,undefined);
 }finally{globalThis.window=old;}
});

test('blocked export popup is an actionable failure, never a successful export',async()=>{
 const old=globalThis.window;(globalThis as any).window={location:{origin:'https://cleanproof.example'},open:()=>null};
 try{await assert.rejects(openReportWindow({blob:new Blob(),filename:'CleanProof-test.pdf',html:'',url:''}),/blocked the export window/);}finally{globalThis.window=old;}
});

test('standalone receiver rejects wrong origin, window, challenge and invalid file; never persists report data',()=>{
 const elements=new Map<string,any>();for(const id of ['status','download','open','report','close'])elements.set(id,{textContent:'',srcdoc:'',attrs:{},setAttribute(k:string,v:string){this.attrs[k]=v;},removeAttribute(k:string){delete this.attrs[k];},addEventListener(){}});
 const listeners=new Map<string,Function>();const sent:any[]=[];const source={postMessage:(data:any,origin:string)=>sent.push({data,origin})};const receiver={opener:source,addEventListener:(name:string,fn:Function)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name),close:()=>{}};
 const context={window:receiver,location:{origin:'https://cleanproof.example'},crypto:{getRandomValues:(v:Uint8Array)=>{v.fill(1);return v;}},document:{getElementById:(id:string)=>elements.get(id)},Blob,URL:{createObjectURL:()=> 'blob:received',revokeObjectURL:()=>{}},setTimeout:()=>1,clearTimeout:()=>{}};
 vm.runInNewContext(readFileSync('public/report-export.js','utf8'),context);
 const data={type:'cleanproof-export-document',challenge:'01'.repeat(16),blob:new Blob(['%PDF-'+'.'.repeat(120)],{type:'application/pdf'}),filename:'CleanProof-selected.pdf',html:'<h1>Selected report</h1>'};
 const receive=listeners.get('message')!;
 for(const event of [{origin:'https://evil.example',source,data},{origin:context.location.origin,source:{},data},{origin:context.location.origin,source,data:{...data,challenge:'wrong'}},{origin:context.location.origin,source,data:{...data,filename:'../bad.html'}}])receive(event);
 assert.equal(elements.get('report').srcdoc,'');
 receive({origin:context.location.origin,source,data});assert.equal(elements.get('report').srcdoc,data.html);assert.equal(elements.get('download').href,'blob:received');assert.equal(elements.get('download').download,data.filename);assert.equal(receiver.opener,null);assert.equal(listeners.has('message'),false);assert.equal(sent.at(-1).data.type,'cleanproof-export-received');
});
