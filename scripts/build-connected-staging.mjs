import {validateAuthDeployment} from './auth-deployment-config.mjs';
import {staticRouteEntries} from './static-route-entries.mjs';
import {readFileSync, lstatSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {stagingEnvironment} from './build-customer.mjs';
// A linked node_modules can cause Metro to bundle the linked checkout instead.
if(lstatSync(new URL('../node_modules',import.meta.url)).isSymbolicLink()) throw new Error('Use a local node_modules directory to build this checkout.');
const config=JSON.parse(readFileSync(new URL('../deployment/staging.public.json',import.meta.url),'utf8'));
validateAuthDeployment(JSON.parse(readFileSync(new URL('../deployment/staging.auth.patch.json',import.meta.url),'utf8')));
const env=stagingEnvironment({...process.env,EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:config.backendUrl,EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY:config.publishableKey,EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT:'staging'});
const r=spawnSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web','--output-dir','dist'],{env,stdio:'inherit'});
if(r.error)throw r.error;if(r.status===0)staticRouteEntries('dist');process.exit(r.status??1);
