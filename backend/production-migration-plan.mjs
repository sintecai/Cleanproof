/** Read-only plan. Never applies SQL or treats an unavailable history as empty. */
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function planProductionMigrations(observation,sources){
 if(observation?.projectRef!=='decysnpygturutfyjofi'||observation.status!=='ACTIVE_HEALTHY')throw Error('Production must be independently confirmed healthy before planning.');
 if(!Array.isArray(observation.history)||!Array.isArray(observation.applicationTables))throw Error('Fresh migration history and application inventory are required.');
 const names=sources.map(s=>s.file.replace(/^\d+_/,'').replace(/\.sql$/,''));
 if(new Set(names).size!==names.length)throw Error('Ambiguous source migration names.');
 const applied=new Set();
 for(const row of observation.history){
  if(!row||typeof row.version!=='string'||!/^\d+$/.test(row.version)||!names.includes(row.name)||applied.has(row.name))throw Error('Unexpected or duplicate hosted migration; reconcile before applying anything.');
  applied.add(row.name);
 }
 if(!applied.size&&observation.applicationTables.length)throw Error('Application tables exist without recorded migrations; do not replay source.');
 let missing=false;
 const plan=[];
 for(let i=0;i<sources.length;i++){
  if(applied.has(names[i])){if(missing)throw Error('Non-prefix migration history requires review.');continue;}
  missing=true;
  plan.push({file:sources[i].file,name:names[i],sha256:createHash('sha256').update(sources[i].sql).digest('hex')});
 }
 return {projectRef:observation.projectRef,readOnly:true,requiresRenewedApproval:true,applied:applied.size,missing:plan};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const input=process.argv[2];if(!input)throw Error('Supply a redacted fresh observation JSON file.');
 const dir=new URL('../supabase/migrations/',import.meta.url);
 const sources=await Promise.all((await readdir(dir)).filter(n=>/^\d+_.+\.sql$/.test(n)).sort().map(async file=>({file,sql:await readFile(new URL(file,dir),'utf8')})));
 console.log(JSON.stringify(planProductionMigrations(JSON.parse(await readFile(input,'utf8')),sources),null,2));
}
