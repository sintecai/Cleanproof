export const productionBackend='https://decysnpygturutfyjofi.supabase.co';
export function productionWebConfig(c){
 if(c.backendUrl!==productionBackend)throw Error('Use only the existing CleanProof production backend.');
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(c.publishableKey||''))throw Error('A public publishable key is required. Privileged keys are forbidden.');
 const u=new URL(c.siteOrigin);if(u.protocol!=='https:'||u.origin!==c.siteOrigin||u.username||u.password)throw Error('Use one exact HTTPS website origin.');
 return {origin:u.origin,recovery:u.origin+'/reset-password.html'};
}
export function productionWebEnvironment(config,env={}){
 productionWebConfig(config);
 return {...env,CLEANPROOF_VARIANT:'production-web',EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT:'production',EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:config.backendUrl,EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY:config.publishableKey,EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS:'0',EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY:'0',EXPO_PUBLIC_CLEANPROOF_SHOWCASE:'0',EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW:'0'};
}
