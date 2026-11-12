import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {productionWebConfig,productionWebEnvironment} from './production-web-config.mjs';
import {websiteInformationPages} from './website-information-pages.mjs';
import {staticRouteEntries} from './static-route-entries.mjs';
const c=JSON.parse(readFileSync('deployment/production.web.public.json','utf8'));const {origin}=productionWebConfig(c);
const r=spawnSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web','--output-dir','website-dist'],{env:productionWebEnvironment(c,process.env),stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);
staticRouteEntries('website-dist','production');
websiteInformationPages('website-dist',JSON.parse(readFileSync('deployment/website-content.json','utf8')));
// Hash actual bootstrap scripts instead of granting arbitrary inline JavaScript.
const scripts=new Set();function walk(d,fn){for(const n of readdirSync(d)){const p=d+'/'+n;if(statSync(p).isDirectory())walk(p,fn);else fn(p);}}
walk('website-dist',p=>{if(p.endsWith('.html')){const html=readFileSync(p,'utf8');for(const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))if(m[1])scripts.add("'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'");}});
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval' "+[...scripts].join(' ')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' "+c.backendUrl+"; frame-src 'self' blob: about:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
walk('website-dist',p=>{if(p.endsWith('.html')&&!p.endsWith('report-export.html'))writeFileSync(p,readFileSync(p,'utf8').replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp.replace("; frame-ancestors 'self'",'')+'">'));});
writeFileSync('website-dist/_headers','/*\n  Content-Security-Policy: '+csp+'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Permissions-Policy: camera=(self), microphone=(), geolocation=()\n  Cache-Control: no-store\n/_expo/static/*\n  Cache-Control: public, max-age=31536000, immutable\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n');
writeFileSync('website-dist/_redirects','/reset-password /reset-password.html 200\n/email-callback /email-callback.html 200\n/* /index.html 200\n');
const version=JSON.parse(readFileSync('website-dist/source-version.json'));writeFileSync('website-dist/source-version.json',JSON.stringify({...version,siteOrigin:origin,connected:true,customerAccessApproved:false})+'\n');
console.log('Production-connected website candidate built; this does not approve customer publication.');
