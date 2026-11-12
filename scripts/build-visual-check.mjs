// Optional, explicitly isolated review of shared native UI components.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('dist/visual-check',{recursive:true});
const result=spawnSync(process.execPath,['node_modules/expo/bin/cli','export:embed','--platform','web','--entry-file','scripts/visual-check.tsx','--dev','false','--bundle-output','dist/visual-check/visual.js'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
writeFileSync('dist/visual-check/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CleanProof shared UI review · synthetic</title><style>html,body,#root{margin:0;min-height:100%}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="visual.js"></script></body></html>');
