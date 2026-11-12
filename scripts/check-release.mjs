import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
if(!process.argv[2])throw Error('A private reviewed release-evidence file is required.');
const e=JSON.parse(readFileSync(process.argv[2],'utf8')),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const required=['fresh-customer-workspace','email-auth','team-roles','real-sync-two-clients','private-photos','issued-reports','paired-restore','cleanup','dependency-review','privacy-review','android-native','ios-native'];
const blocked=required.filter(k=>e.checks?.[k]?.status!=='passed'||e.checks[k].sourceCommit!==head||!e.checks[k].evidence);
if(e.releaseApproval!=='approved')blocked.push('management-release-approval');
if(process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS!=='0'||process.env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY==='1')blocked.push('demo-build-configuration');
if(!process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL?.startsWith('https://'))blocked.push('https-backend');
if(blocked.length)throw Error('Release blocked: '+blocked.join(', '));console.log('Evidence references satisfy the gate. Manual verification and authorised deployment remain necessary.');
