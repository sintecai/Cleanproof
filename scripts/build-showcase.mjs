import{spawnSync}from'node:child_process';
import{readFileSync,writeFileSync}from'node:fs';
import{staticRouteEntries}from'./static-route-entries.mjs';
// No customer configuration file is read. This is a separate, synthetic build.
const env={...process.env,CLEANPROOF_VARIANT:'showcase-web',EXPO_PUBLIC_CLEANPROOF_SHOWCASE:'1',EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS:'1',EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY:'1',EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW:'1',EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:'',EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY:'',EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT:'showcase'};
const r=spawnSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web','--output-dir','showcase-dist'],{env,stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);
staticRouteEntries('showcase-dist');
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'";
writeFileSync('showcase-dist/_headers','/*\n  Content-Security-Policy: '+csp+'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n');
// Meta also applies on hosts which do not consume static _headers.
import{readdirSync,statSync}from'node:fs';
function protect(d){for(const n of readdirSync(d)){const p=d+'/'+n;if(statSync(p).isDirectory())protect(p);else if(n.endsWith('.html'))writeFileSync(p,readFileSync(p,'utf8').replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">'));}}protect('showcase-dist');
writeFileSync('showcase-dist/source-version.json',JSON.stringify({sourceCommit:JSON.parse(readFileSync('showcase-dist/source-version.json')).sourceCommit,environment:'synthetic-showcase',connected:false,nativeBuild:false})+'\n');
