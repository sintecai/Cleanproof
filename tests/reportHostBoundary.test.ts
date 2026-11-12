import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
test('authenticated browser boundary mounts the prepared PDF host inside the account boundary',()=>{
 const src=ts.createSourceFile('StorageBoundary.web.tsx',readFileSync('src/application/StorageBoundary.web.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let found=false;
 function visit(node:ts.Node){
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(src)==='CustomerEntry'){
   found=node.children.some(child=>ts.isJsxSelfClosingElement(child)&&child.tagName.getText(src)==='BrowserReportHost');
  }
  ts.forEachChild(node,visit);
 }
 visit(src);assert.equal(found,true,'prepared PDF action must be rendered in the authenticated customer boundary');
});

test('visible PDF download keeps the browser default instead of intercepting it with a save picker',()=>{
 const host=readFileSync('src/reporting/BrowserReportHost.web.tsx','utf8'),receiver=readFileSync('public/report-export.js','utf8');
 assert.match(host,/download=\{pdf\?\.filename\}/);assert.doesNotMatch(host,/showSaveFilePicker|void save\(/);assert.doesNotMatch(receiver,/showSaveFilePicker/);
 assert.match(receiver,/download.download=filename/);
});
