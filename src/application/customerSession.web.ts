import { getBrowserAccount } from '../storage/browserDatabase';
export function hasCustomerSession() { return !!getBrowserAccount(); }
export function lockCustomerEntry() { window.dispatchEvent(new Event('cleanproof-account-lock')); }

let destination:string|null=null;
export function setCustomerDestination(value:string){destination=value;}
export function takeCustomerDestination(){const value=destination;destination=null;return value;}

export function publishCustomerCompany(name:string){const user=getBrowserAccount()?.user.id;if(user)window.dispatchEvent(new CustomEvent('cleanproof-company-label',{detail:{user,name}}));}
