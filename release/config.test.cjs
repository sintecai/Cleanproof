const {test}=require('node:test'),assert=require('node:assert/strict'),{releaseConfig}=require('./config.cjs');
const base={ios:{bundleIdentifier:'legacy'},android:{package:'legacy'},plugins:[]};
test('default config preserves existing installations',()=>assert.equal(releaseConfig(base,{}),base));
test('unverified identifiers cannot create a release build',()=>assert.throws(()=>releaseConfig(base,{CLEANPROOF_VARIANT:'production',CLEANPROOF_ANDROID_PACKAGE:'com.sicyinternational.cleanproof',CLEANPROOF_IOS_BUNDLE_ID:'com.sicyinternational.cleanproof'}),/Verify identifiers/));
test('production cannot accidentally use staging backend',()=>assert.throws(()=>releaseConfig(base,{CLEANPROOF_VARIANT:'production',CLEANPROOF_ANDROID_PACKAGE:'com.sicyinternational.cleanproof',CLEANPROOF_IOS_BUNDLE_ID:'com.sicyinternational.cleanproof',CLEANPROOF_IDENTIFIERS_CONFIRMED:'1',EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:'https://vmvoeksprlwjiwfxqita.supabase.co'}),/must not use CleanProof-staging/));
test('synthetic showcase is rejected by every native customer build',()=>assert.throws(()=>releaseConfig(base,{EXPO_PUBLIC_CLEANPROOF_SHOWCASE:'1'}),/cannot be a native customer release/));
test('explicit isolated showcase export is web-only and cannot carry backend settings',()=>{
 const env={CLEANPROOF_VARIANT:'showcase-web',EXPO_PUBLIC_CLEANPROOF_SHOWCASE:'1',EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY:'1'};
 const c=releaseConfig(base,env);assert.deepEqual(c.platforms,['web']);assert.equal(c.android,undefined);assert.equal(c.ios,undefined);
 assert.throws(()=>releaseConfig(base,{...env,EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:'https://example.supabase.co'}),/cannot be a native customer release/);
});

test('store profile pins verified CLI/node/native images and never auto-submits publicly',()=>{
 const eas=require('../eas.json');assert.equal(eas.cli.version,'27.2.0');assert.equal(eas.build.production.node,'24.22.1');assert.equal(eas.build.production.android.image,'ubuntu-26.04-jdk-17-ndk-r27b-sdk-58');assert.equal(eas.build.production.android.buildType,'app-bundle');assert.equal(eas.build.production.ios.image,'macos-tahoe-26.6-xcode-27.0');assert.equal(eas.build.production.distribution,'store');assert.equal(eas.submit.production.android.track,'internal');assert.equal(eas.submit.production.android.releaseStatus,'draft');
});
