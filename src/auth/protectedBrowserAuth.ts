import {validateSession,type Session,type SessionStorage} from './session.ts';
export interface AuthRecordStore{read(key:string):Promise<any>;write(key:string,value:unknown):Promise<void>;claim(key:string,value:unknown):Promise<any>;}
/** Origin-profile protection only: not hardware storage, not an XSS defence. Never used by native. */
export class ProtectedBrowserAuth {
 constructor(private records:AuthRecordStore,private backend:string,private crypto:Crypto=globalThis.crypto){}
 private async key(create:boolean){
  let key=await this.records.read('key:'+this.backend);
  if(!key&&create)key=await this.records.claim('key:'+this.backend,await this.crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']));
  if(!key||key.extractable||key.algorithm?.name!=='AES-GCM')throw Error('The account storage key is unavailable. Existing work is preserved. Sign in again; do not clear browser data.');
  return key as CryptoKey;
 }
 async read(name:string){
  const record=await this.records.read(this.backend+':'+name);if(record==null)return null;
  const key=await this.key(false);
  try{const bytes=await this.crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:new TextEncoder().encode(this.backend+':'+name)},key,record.sealed);return JSON.parse(new TextDecoder().decode(bytes));}
  catch{throw Error('Protected account state could not be read. Existing work is preserved. Do not clear browser data.');}
 }
 async write(name:string,value:unknown){
  const key=await this.key(true),iv=this.crypto.getRandomValues(new Uint8Array(12));
  const sealed=await this.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(this.backend+':'+name)},key,new TextEncoder().encode(JSON.stringify(value)));
  await this.records.write(this.backend+':'+name,{iv,sealed});
 }
 async clear(name:string){await this.records.write(this.backend+':'+name,null);}
}
export class ProtectedBrowserSession implements SessionStorage{
 constructor(private store:ProtectedBrowserAuth){}
 async load(){const v=await this.store.read('session');return v===null?null:validateSession(v);}
 async save(s:Session){await this.store.write('session',validateSession(s));}
 async clear(){await this.store.clear('session');}
}
