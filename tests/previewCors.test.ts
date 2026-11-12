import test from "node:test";
import assert from "node:assert/strict";
import { previewCors } from "../supabase/functions/_shared/previewCors.ts";
test("browser CORS is limited to explicit loopback preview origins without changing native authentication", () => {
  assert.equal(previewCors(null), null);
  assert.equal(
    previewCors("http://127.0.0.1:8081")!["Access-Control-Allow-Origin"],
    "http://127.0.0.1:8081",
  );
  for (const origin of [
    "https://evil.example",
    "http://localhost.evil.example:8081",
    "http://localhost:8081/path",
    "http://localhost:9999",
    "null",
  ])
    assert.throws(() => previewCors(origin));
});

test("hosted CORS permits only explicitly configured HTTPS origins",()=>{
 const allowed=['https://cleanproof-sicy-preview.grassyelf128.chatgpt.site'];
 assert.equal(previewCors(allowed[0]!,allowed)!["Access-Control-Allow-Origin"],allowed[0]);
 for(const origin of ['https://evil.example','https://cleanproof-sicy-preview.grassyelf128.chatgpt.site.evil.example','https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/path']) assert.throws(()=>previewCors(origin,allowed));
});

test('account erasure staging origins never become a production CORS fallback',async()=>{
 const {configuredWebOrigins}=await import('../supabase/functions/_shared/previewCors.ts');
 const staging=configuredWebOrigins('https://vmvoeksprlwjiwfxqita.supabase.co','');
 assert.equal(staging.length,3);assert.ok(previewCors(staging[1]!,staging));
 assert.deepEqual(configuredWebOrigins('https://production.example.supabase.co',''),[]);
 assert.throws(()=>previewCors(staging[1]!,configuredWebOrigins('https://production.example.supabase.co','https://customer.example')));
});

test('production services reject staging and loopback origins but preserve native authentication path',async()=>{
 const {serviceCors}=await import('../supabase/functions/_shared/previewCors.ts');
 const url='https://decysnpygturutfyjofi.supabase.co';
 assert.equal(serviceCors(url,null,''),null);
 for(const origin of ['http://127.0.0.1:8081','http://localhost:8082','https://cleanproof-mobile-tab-preview.sintecai26.chatgpt.site'])assert.throws(()=>serviceCors(url,origin,''));
 const origin='https://customer.example';assert.equal(serviceCors(url,origin,origin)!['Access-Control-Allow-Origin'],origin);
});
test('service CORS preserves existing staging/local preview origins',async()=>{
 const {serviceCors}=await import('../supabase/functions/_shared/previewCors.ts');
 assert.equal(serviceCors('https://vmvoeksprlwjiwfxqita.supabase.co','http://127.0.0.1:8081','')!['Access-Control-Allow-Origin'],'http://127.0.0.1:8081');
 assert.equal(serviceCors('http://127.0.0.1:54321','http://localhost:8082','')!['Access-Control-Allow-Origin'],'http://localhost:8082');
});
test('configured origins reject wildcards, paths, insecure URLs and credentials',async()=>{
 const {configuredWebOrigins}=await import('../supabase/functions/_shared/previewCors.ts');
 for(const value of ['*','https://customer.example/','https://customer.example/path','http://customer.example','https://user:fixture@customer.example'])assert.throws(()=>configuredWebOrigins('https://decysnpygturutfyjofi.supabase.co',value));
});

test('new connected origin is exact, staging-only and never a production default',async()=>{
 const {serviceCors}=await import('../supabase/functions/_shared/previewCors.ts');const origin='https://cleanproof-release-connected.sintecai26.chatgpt.site';
 assert.equal(serviceCors('https://vmvoeksprlwjiwfxqita.supabase.co',origin,'')!['Access-Control-Allow-Origin'],origin);
 for(const invalid of [origin+'.evil.example',origin+'/path','https://evil.example'])assert.throws(()=>serviceCors('https://vmvoeksprlwjiwfxqita.supabase.co',invalid,''));
 assert.throws(()=>serviceCors('https://decysnpygturutfyjofi.supabase.co',origin,''));
});

test('production customer website origin is exact and does not allow other websites',async()=>{
 const {serviceCors}=await import('../supabase/functions/_shared/previewCors.ts');const origin='https://cleanproof-customer.sintecai26.chatgpt.site';
 assert.equal(serviceCors('https://decysnpygturutfyjofi.supabase.co',origin,'')!['Access-Control-Allow-Origin'],origin);
 for(const other of [origin+'.evil.example',origin+'/reset-password.html','https://cleanproof-release-connected.sintecai26.chatgpt.site'])assert.throws(()=>serviceCors('https://decysnpygturutfyjofi.supabase.co',other,''));
});
