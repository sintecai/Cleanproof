// Optional isolated fixture, explicitly separate from authenticated application acceptance.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('dist/report-check',{recursive:true});
const result=spawnSync(process.execPath,['node_modules/expo/bin/cli','export:embed','--platform','web','--entry-file','scripts/report-browser-fixture.tsx','--dev','false','--bundle-output','dist/report-check/report-check.js'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
writeFileSync('dist/report-check/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CleanProof synthetic report check</title></head><body><div id="root"></div><script src="report-check.js"></script></body></html>');
