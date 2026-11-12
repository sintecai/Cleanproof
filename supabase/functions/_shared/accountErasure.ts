/** Orchestration is restartable. Privileged adapters are server-only; callers
 * must authenticate the current user and require recent password authentication. */
export interface ErasureServices {
 prepare(user:string,closeOwned:boolean):Promise<void>;
 paths(user:string):Promise<string[]>;
 removeFiles(paths:string[]):Promise<void>;
 removeData(user:string):Promise<void>;
 deleteAuthUser(user:string):Promise<void>;
}
export async function eraseAccount(user:string,closeOwned:boolean,service:ErasureServices){
 await service.prepare(user,closeOwned);
 for(let batch=0;;batch++){const paths=await service.paths(user);if(!paths.length)break;if(batch>=1000)throw Error('File cleanup requires another retry.');const selected=paths.slice(0,100);await service.removeFiles(selected);const remaining=await service.paths(user);if(selected.some(path=>remaining.includes(path)))throw Error('Private-file removal was not acknowledged. Retry cleanup.');}
 await service.removeData(user);
 await service.deleteAuthUser(user);
}
export function recentPasswordAuthentication(claims:unknown,nowSeconds:number){
 const value=claims as {amr?:{method?:string;timestamp?:number}[]};
 return Array.isArray(value?.amr)&&value.amr.some(entry=>entry.method==='password'&&typeof entry.timestamp==='number'&&entry.timestamp<=nowSeconds&&nowSeconds-entry.timestamp<=300);
}
