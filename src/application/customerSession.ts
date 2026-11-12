import {nativeSignedIn,exitNativeCustomer,setNativeDestination,takeNativeDestination} from './nativeCustomerState.ts';
export const hasCustomerSession=nativeSignedIn;
export const lockCustomerEntry=exitNativeCustomer;
export const setCustomerDestination=setNativeDestination;
export const takeCustomerDestination=takeNativeDestination;
export function publishCustomerCompany(_name:string){}
