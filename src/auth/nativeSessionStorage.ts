import {validateSession,type Session,type SessionStorage} from './session.ts';
export interface PrivateStorage {read(key:string):Promise<string|null>;write(key:string,value:string):Promise<void>;remove(key:string):Promise<void>;}
/** The platform adapter is SecureStore, never AsyncStorage or a plaintext file.
 * One active identity per backend; account changes clear tokens, not workspace keys. */
export class NativeSessionStorage implements SessionStorage {
 constructor(private storage:PrivateStorage,private key:string){}
 async load(){const value=await this.storage.read(this.key);return value?validateSession(JSON.parse(value)):null;}
 async save(value:Session){await this.storage.write(this.key,JSON.stringify(validateSession(value)));}
 async clear(){await this.storage.remove(this.key);}
}
