import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {staticRouteEntries} from './static-route-entries.mjs';
test('static callback and existing app paths retain the exact application entry',()=>{
 const d=mkdtempSync(join(tmpdir(),'cp-routes-'));try{writeFileSync(join(d,'index.html'),'<main>actual app</main>');staticRouteEntries(d);staticRouteEntries(d);for(const r of ['email-callback','reset-password','sites','onboarding','history'])assert.equal(readFileSync(join(d,r,'index.html'),'utf8'),'<main>actual app</main>');for(const r of ['email-callback','reset-password'])assert.equal(readFileSync(join(d,r+'.html'),'utf8'),'<main>actual app</main>');}finally{rmSync(d,{recursive:true,force:true});}
});
