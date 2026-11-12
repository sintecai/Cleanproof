import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
test('customer entry and build configuration contain no removed social provider controls or flags',()=>{
 for(const f of ['src/application/CustomerEntry.web.tsx','scripts/build-connected-staging.mjs','deployment/staging.public.json','.env.example']){
  const s=readFileSync(f,'utf8');assert.doesNotMatch(s,/Continue with Google|GOOGLE_ENABLED|googleEnabled|prepareGoogleRedirect|readGoogleCallback/);
 }
 assert.equal(existsSync('src/auth/googleOAuth.ts'),false);assert.equal(existsSync('app/auth-callback.tsx'),false);
 const patch=JSON.parse(readFileSync('deployment/staging.auth.patch.json','utf8'));assert.equal(patch.uri_allow_list.split(',').length,1);assert.ok(!patch.uri_allow_list.includes('localhost'));assert.ok(!patch.uri_allow_list.includes('*'));
});

// Customer links and local OTP fixtures must never be confused when copying templates.
test('customer mail templates match the reviewed link patch; numeric fixtures remain local-only',()=>{
 const patch=JSON.parse(readFileSync('deployment/staging.auth.patch.json','utf8'));
 for(const name of ['confirmation','recovery']){
  const html=readFileSync(`supabase/templates/${name}.html`,'utf8').trim();
  assert.equal(html,patch[`mailer_templates_${name}_content`]);
  assert.ok(html.includes('{{ .ConfirmationURL }}'));
  assert.ok(!html.includes('{{ .Token }}'));
  assert.ok(readFileSync(`supabase/templates/local/${name}-code.html`,'utf8').includes('{{ .Token }}'));
 }
 assert.ok(readFileSync('supabase/config.toml','utf8').includes('templates/local/recovery-code.html'));
 assert.ok(readFileSync('supabase/config.onboarding.example.toml','utf8').includes('templates/local/confirmation-code.html'));
});

test('customer registration removes confirmation UI and requires genuine immediate registration',()=>{
 for(const file of ['src/application/CustomerEntry.web.tsx','app/onboarding.tsx']){
  const source=readFileSync(file,'utf8');assert.ok(source.includes('registerImmediately'));
  assert.doesNotMatch(source,/Resend confirmation link|Register and verify email|Email verification code|mode==='verify'/);
 }
 assert.equal(JSON.parse(readFileSync('deployment/staging.auth.patch.json','utf8')).mailer_autoconfirm,true);
});


test('restored customer entry retains real account controls and errors',()=>{
 const source=readFileSync('src/application/CustomerEntry.web.tsx','utf8');
 assert.match(source,/<summary>Connection help<\/summary>/);
 for(const label of ['Create account','Sign in','Forgot password?'])assert.ok(source.includes(label));
 assert.ok(source.includes('role="alert"'));
 assert.ok(source.includes('registerImmediately'));
});

test('customer entry revalidates background sessions without rendering the removed lock page',()=>{
 const source=readFileSync('src/application/CustomerEntry.web.tsx','utf8');
 assert.doesNotMatch(source,/CleanProof is locked|Resume securely|if\(locked\)/);
 assert.match(source,/setBrowserPassphrase\(''\);setBrowserAccount\(null\);setBrowserBackend\(null\);auth\.current\?\.lock\(\)/);
 assert.match(source,/await auth\.current!\.restore\(\);check\(\)/);
 assert.match(source,/auth\.current!\.session\(\)\?\.user\.id!==user/);
 assert.match(source,/await a\.memberships\(\)/);
 assert.match(source,/memberships\.length===0/);
});
