const paths=new Set(['/','/customers','/sites','/templates','/new-inspection','/inspect','/photos','/actions','/history','/reports','/report-library','/settings','/onboarding','/sync']);
export function safeDestination(value:unknown,origin:string){
 try{if(typeof value!=='string')return '/';const u=new URL(value,origin);const path=u.pathname.replace(/\/$/,'')||'/';if(u.origin!==origin||!paths.has(path))return '/';const query=new URLSearchParams();for(const key of ['id','item','site','action','create','search']){const values=u.searchParams.getAll(key);if(values.length===1&&values[0]!.length<=256)query.set(key,values[0]!);}const suffix=query.toString();return path+(suffix?'?'+suffix:'');}catch{return '/';}
}
