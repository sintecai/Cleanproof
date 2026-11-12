/** Administrator workstation only. No credentials are collected or printed by this helper. */
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export function pinnedEasArguments(args){
 const command=args[0];
 if(!['--version','whoami','project:info','credentials:configure-build','build','build:view','submit'].includes(command))throw Error('Use a documented administrator build command.');
 if(args.some(a=>a==='--latest'||a.startsWith('--auto-')||a==='--force'||a==='--local'))throw Error('Automatic/latest/forced publication or alternate build modes are not allowed by this helper.');
 if(['--version','whoami','project:info'].includes(command)&&args.length!==1)throw Error('This inspection command accepts no extra arguments.');
 if(command==='build:view'&&(args.length!==2||!/^[a-f0-9-]{36}$/.test(args[1]??'')))throw Error('Use one verified build UUID.');
 if(['build','submit','credentials:configure-build'].includes(command)){
  const permitted=command==='submit'?['--platform','--profile','--id']:['--platform','--profile'];const seen=new Set();
  for(let i=1;i<args.length;i+=2){if(!permitted.includes(args[i])||seen.has(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error('Unexpected or duplicate administrator build argument.');seen.add(args[i]);}
 }
 if(['build','submit','credentials:configure-build'].includes(command)){
  const profile=args[args.indexOf('--profile')+1],platform=args[args.indexOf('--platform')+1];
  if(!args.includes('--profile')||profile!=='production'||!args.includes('--platform')||!['android','ios'].includes(platform))throw Error('Use the production profile and an explicit Android/iOS platform.');
 }
 if(command==='submit'&&(!args.includes('--id')||!/^[a-f0-9-]{36}$/.test(args[args.indexOf('--id')+1]??'')))throw Error('Submit only an explicitly verified build UUID.');
 return ['exec','--yes','--package','eas-cli@27.2.0','--','eas',...args];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=pinnedEasArguments(process.argv.slice(2));
 if(!process.env.npm_execpath)throw Error('Run through npm run admin:eas on the administrator workstation.');
 const r=spawnSync(process.execPath,[process.env.npm_execpath,...args],{env:process.env,stdio:'inherit'});
 if(r.error)throw Error('Pinned EAS CLI could not start. Check administrator tooling; do not send credentials to chat.');
 process.exitCode=r.status??1;
}
