import {authReturnBootstrap} from './auth-return-bootstrap.mjs';
import {copyFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
// Expo single-output routing still needs an HTML entry for direct static-host requests.
export function staticRouteEntries(directory,environment='staging'){
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 writeFileSync(join(directory,'source-version.json'),JSON.stringify({sourceCommit,environment,nativeBuild:false})+'\n');
 const file=join(directory,'index.html');let html=readFileSync(file,'utf8');
 if(!html.includes('__cleanproofAuthReturn')){html=html.replace('<head>','<head>'+authReturnBootstrap);writeFileSync(file,html);}
 for(const route of ['account-deletion','email-callback','reset-password','customers','sites','templates','new-inspection','inspect','photos','actions','history','reports','report-library','settings','onboarding','sync','account']){
  if(['email-callback','reset-password'].includes(route))copyFileSync(join(directory,'index.html'),join(directory,route+'.html'));
  mkdirSync(join(directory,route),{recursive:true});copyFileSync(join(directory,'index.html'),join(directory,route,'index.html'));
 }
}
