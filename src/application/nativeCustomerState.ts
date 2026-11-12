// Identity state only; no passwords, sessions or account labels are remembered here.
let active=false,destination:string|null=null,exit:(()=>void)|undefined;
export function nativeSignedIn(){return active;}
export function setNativeCustomer(value:boolean,onExit?:()=>void){active=value;exit=value?onExit:undefined;}
export function exitNativeCustomer(){exit?.();}
export function setNativeDestination(value:string){destination=value;}
export function takeNativeDestination(){const next=destination;destination=null;return next;}
