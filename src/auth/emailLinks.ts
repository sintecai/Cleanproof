import {safeDestination} from './returnDestination.ts';
// Only application-authored link guidance may be displayed directly. Never wrap provider descriptions.
export class EmailLinkError extends Error {constructor(message:string){super(message);this.name='EmailLinkError';}}
export type EmailPurpose='signup'|'recovery';
export interface EmailTransaction {verifier:string;challenge:string;created:number;origin:string;backend:string;purpose:EmailPurpose;destination:string;}
export function emailCallback(origin:string,purpose:EmailPurpose){
 const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin)throw Error('Email confirmation requires the deployed HTTPS application.');
 return origin+(purpose==='signup'?'/email-callback.html':'/reset-password.html');
}
export async function prepareEmailLink(origin:string,backend:string,purpose:EmailPurpose,destination:string,now=Date.now(),webcrypto:Crypto=globalThis.crypto):Promise<EmailTransaction>{
 emailCallback(origin,purpose);
 const verifier=Array.from(webcrypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 const digest=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 return {verifier,challenge,created:now,origin,backend,purpose,destination:safeDestination(destination,origin)};
}
export function readEmailCallback(value:unknown,origin:string,backend:string,purpose:EmailPurpose,query:URLSearchParams,now=Date.now()){
 if(query.has('error')||query.has('error_code'))throw new EmailLinkError('This email link is expired, already used or was rejected. Request a fresh link, or sign in if your email is already confirmed.');
 if(query.has('token_hash')||query.has('access_token')||query.has('refresh_token'))throw new EmailLinkError('This link uses an unsupported confirmation format. Sign in if your email is confirmed, or request a fresh link.');
 const p=value as EmailTransaction;
 if(!p||p.origin!==origin||p.backend!==backend||p.purpose!==purpose||typeof p.verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(p.verifier)||!Number.isFinite(p.created)||now<p.created||now-p.created>86400000)
  throw new EmailLinkError(purpose==='signup'?'The link may have confirmed your email, but this browser cannot complete its sign-in. Return to CleanProof and sign in with your email and password.':'Open the latest recovery link in the browser where you requested it, or request a new recovery link here.');
 const codes=query.getAll('code');if(codes.length!==1||!codes[0]||codes[0].length>2048)throw new EmailLinkError('This confirmation link is incomplete. Request a new link or sign in if already confirmed.');
 return {code:codes[0],verifier:p.verifier,destination:safeDestination(p.destination,origin)};
}
/** Only inspect names, never return tokens or raw backend descriptions. */
export function hasAuthFragment(fragment:string){const q=new URLSearchParams(fragment.replace(/^#/,''));return ['access_token','refresh_token','error','error_code','token_hash','code'].some(k=>q.has(k));}
