import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagingEnvironment } from './build-customer.mjs';
test('staging rejects absent, insecure, credential-bearing and secret configuration', () => {
  for (const url of ['', 'http://test.supabase.co', 'https://user:pass@test.supabase.co', 'https://test.supabase.co/?token=x'])
    assert.throws(() => stagingEnvironment({EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:url,EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY:'sb_publishable_fixture'}));
  for (const key of ['', 'sb_secret_fixture', 'service_role'])
    assert.throws(() => stagingEnvironment({EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:'https://test.supabase.co',EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY:key}));
});
test('staging explicitly disables demo seeding and local-only adapters', () => {
  const env=stagingEnvironment({EXPO_PUBLIC_CLEANPROOF_BACKEND_URL:'https://test.supabase.co',EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY:'sb_publishable_fixture',EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS:'1',EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY:'1'});
  assert.equal(env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS,'0');
  assert.equal(env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY,'0');
});

import {validateAuthDeployment} from './auth-deployment-config.mjs';
import {readFileSync} from 'node:fs';
test('reviewed staging Auth configuration has exact deployed redirects and consistent link templates',()=>{
 const good=JSON.parse(readFileSync(new URL('../deployment/staging.auth.patch.json',import.meta.url)));assert.equal(validateAuthDeployment(good),true);
 for(const patch of [{site_url:'http://localhost:3000'},{uri_allow_list:good.site_url+'/**'},{uri_allow_list:good.uri_allow_list.replace('/reset-password.html','/wrong-page')},{mailer_autoconfirm:false},{mailer_templates_recovery_content:'<a href="{{ .SiteURL }}">Reset</a>'}])assert.throws(()=>validateAuthDeployment({...good,...patch}));
});
