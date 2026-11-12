import * as SecureStore from 'expo-secure-store';
import {AuthConnection,backendConfig} from '../auth/session.ts';
import {NativeSessionStorage} from '../auth/nativeSessionStorage.ts';
const options={keychainAccessible:SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY};
let service:AuthConnection|undefined;
export function nativeAccountServices(){
 if(service)return service;
 const url=process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL,key=process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY;
 if(!url||!key)throw Error('Account services are unavailable.');
 const config=backendConfig(url,key);
 const storage=new NativeSessionStorage({read:k=>SecureStore.getItemAsync(k,options),write:(k,v)=>SecureStore.setItemAsync(k,v,options),remove:k=>SecureStore.deleteItemAsync(k,options)},'cleanproof.customer.session.'+new URL(config.url).hostname);
 return service=new AuthConnection(config,storage);
}

export function replaceNativeAccountServices(){service?.retire();service=undefined;return nativeAccountServices();}
