const fs=require('node:fs');
function required(env,name){const value=env[name];if(!value)throw Error(`${name} must be configured through the release environment.`);return value;}
function releaseConfig(base,env=process.env){
 if(env.EXPO_PUBLIC_CLEANPROOF_SHOWCASE==='1'){
  if(env.CLEANPROOF_VARIANT==='showcase-web'&&env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY==='1'&&!env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL&&!env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY)return {...base,platforms:['web'],android:undefined,ios:undefined};
  throw Error('Synthetic showcase cannot be a native customer release.');
 }
 const variant=env.CLEANPROOF_VARIANT||'development';
 if(variant==='production-web'){
  if(env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL!=='https://decysnpygturutfyjofi.supabase.co'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY||''))throw Error('Production website requires its exact production backend and public key.');
  if(env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS!=='0'||env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY!=='0')throw Error('Production website forbids demo and local-only mode.');
  return {...base,name:'CleanProof',slug:'cleanproof-web',platforms:['web'],android:undefined,ios:undefined,plugins:(base.plugins||[]).filter(p=>p!=='./plugins/withLocalPreviewNetwork.cjs')};
 }
 if(!['development','staging','production'].includes(variant))throw Error('Invalid CLEANPROOF_VARIANT.');
 // Preserve old developer identities, keys and installations. No implicit migration.
 if(variant==='development')return base;
 const android=required(env,'CLEANPROOF_ANDROID_PACKAGE'),ios=required(env,'CLEANPROOF_IOS_BUNDLE_ID');
 for(const id of [android,ios])if(!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(id)||/\.demo$/.test(id))throw Error('Use a distinct, validated reverse-domain app identifier.');
 if(env.CLEANPROOF_IDENTIFIERS_CONFIRMED!=='1')throw Error('Verify identifiers in the existing organisation store accounts before configuring release builds.');
 const url=new URL(required(env,'EXPO_PUBLIC_CLEANPROOF_BACKEND_URL'));
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password||!url.hostname.endsWith('.supabase.co'))throw Error('Release backend must be the intended HTTPS Supabase origin.');
 if(variant==='production'&&url.hostname==='vmvoeksprlwjiwfxqita.supabase.co')throw Error('Production must not use CleanProof-staging.');
 const key=required(env,'EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY');if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw Error('Only a public publishable key belongs in the app.');
 if(env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS!=='0')throw Error('Release builds require demo tools disabled.');
 const project=required(env,'CLEANPROOF_EAS_PROJECT_ID');if(!/^[a-f0-9-]{36}$/.test(project))throw Error('Use the existing organisation Expo project UUID.');
 const scheme=required(env,'CLEANPROOF_URL_SCHEME');if(scheme!==(variant==='production'?'cleanproof':'cleanproof-staging'))throw Error('Use a release-specific recovery scheme.');
 const icon=required(env,'CLEANPROOF_ICON_PATH');const image=fs.readFileSync(icon);if(image.length<33||image.toString('ascii',1,4)!=='PNG'||image.readUInt32BE(16)!==1024||image.readUInt32BE(20)!==1024||image[25]!==2)throw Error('Provide the approved opaque RGB 1024x1024 PNG app icon.');
 const versionCode=Number(env.CLEANPROOF_ANDROID_VERSION_CODE||1);if(!Number.isSafeInteger(versionCode)||versionCode<1||versionCode>2100000000)throw Error('Use a valid positive Android version code.');
 if(!/^\d+(\.\d+){0,2}$/.test(env.CLEANPROOF_IOS_BUILD_NUMBER||'1'))throw Error('Use a numeric iOS build number.');
 const plugins=(base.plugins||[]).filter(p=>!(Array.isArray(p)&&p[0]==='expo-image-picker')&&p!=='./plugins/withLocalPreviewNetwork.cjs');
 plugins.push(['expo-image-picker',{photosPermission:'Choose photographs to attach as inspection evidence.',cameraPermission:'Take photographs to record cleaning inspection evidence.',microphonePermission:false}]);
 return {...base,name:variant==='production'?'CleanProof':'CleanProof Staging',slug:variant==='production'?'cleanproof':'cleanproof-staging',owner:required(env,'CLEANPROOF_EXPO_OWNER'),version:'1.0.0',scheme,icon,updates:{enabled:false},extra:{...base.extra,eas:{projectId:project},releaseEnvironment:variant},android:{...base.android,package:android,versionCode,allowBackup:false,blockedPermissions:['android.permission.SYSTEM_ALERT_WINDOW','android.permission.RECORD_AUDIO','android.permission.READ_MEDIA_IMAGES','android.permission.READ_MEDIA_VIDEO','android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE']},ios:{...base.ios,bundleIdentifier:ios,buildNumber:env.CLEANPROOF_IOS_BUILD_NUMBER||'1',supportsTablet:false,infoPlist:{...base.ios?.infoPlist,ITSAppUsesNonExemptEncryption:true}} ,plugins};
}
module.exports={releaseConfig};
