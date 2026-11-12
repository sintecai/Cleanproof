import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  AuthConnection,
  ConnectionError,
  EncryptedSessionStorage,
  backendConfig,
  type Session,
  type SessionStorage,
  type Fetcher,
} from "../src/auth/session.ts";
import { NodeDatabase } from "./support/nodeDatabase.ts";
import { migrate } from "../src/storage/migrations.ts";
const user = randomUUID();
const config = {
  url: "http://localhost:54321",
  key: "sb_publishable_synthetic",
};
function session(expires_at = 2000): Session {
  return {
    access_token: "synthetic-access",
    refresh_token: "synthetic-refresh",
    expires_at,
    user: { id: user, email: "test@example.test" },
  };
}
class Memory implements SessionStorage {
  value: Session | null = null;
  async load() {
    return this.value;
  }
  async save(s: Session) {
    this.value = s;
  }
  async clear() {
    this.value = null;
  }
}
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status });
test('fetch adapters are invoked without a class receiver, matching native browser fetch requirements',async()=>{
 const a=new AuthConnection(config,new Memory(),async function(this:unknown){
  assert.equal(this,undefined,'native browser fetch rejects an AuthConnection receiver');
  return json({external:{email:true},disable_signup:false,mailer_autoconfirm:false});
 });
 assert.equal((await a.availability()).emailEnabled,true);
});
test('auth transport and timeout diagnostics never contain request secrets or a saved-work explanation',async()=>{
 for(const cause of [new TypeError('PRIVATE_PAYLOAD'),new DOMException('PRIVATE_PAYLOAD','AbortError')]){
  const a=new AuthConnection(config,new Memory(),async()=>{throw cause;});
  await assert.rejects(a.signUp('private@example.test','PRIVATE_PASSWORD_VALUE'),e=>{assert.ok(e instanceof ConnectionError);assert.ok(e.diagnostic);
   assert.equal(e.kind,'network');assert.ok(e.diagnostic.code.startsWith('CP_AUTH_'));
   assert.equal(e.diagnostic.path,'/auth/v1/signup');
   assert.ok(!e.message.includes('Saved work'));
   assert.ok(!JSON.stringify(e.diagnostic).includes('PRIVATE'));assert.ok(!JSON.stringify(e.diagnostic).includes('private@example'));
   return true;
  });
 }
});
test('server email rejection preserves a safe code and is not labelled a connection failure',async()=>{
 const a=new AuthConnection(config,new Memory(),async()=>json({error_code:'email_address_invalid',msg:'PRIVATE_SERVER_CONTENT'},400));
 await assert.rejects(a.signUp('synthetic@example.test','synthetic-password'),e=>{assert.ok(e instanceof ConnectionError);assert.ok(e.diagnostic);
  assert.equal(e.kind,'server');assert.equal(e.diagnostic.httpStatus,400);assert.equal(e.diagnostic.serviceCode,'email_address_invalid');
  assert.ok(!e.message.includes('PRIVATE_SERVER_CONTENT'));return true;
 });
});
test('request construction failure is separate from transport failure and sends no extra request',async()=>{
 let requests=0;const a=new AuthConnection(config,new Memory(),async()=>{requests++;return json(session(4000));},()=>1000000);
 await a.signIn('synthetic@example.test','synthetic-password');
 const body:Record<string,unknown>={};body.self=body;
 await assert.rejects(a.rpc('cp_register_company',body),e=>{assert.ok(e instanceof ConnectionError);assert.ok(e.diagnostic);assert.equal(e.diagnostic.code,'CP_REQUEST_INVALID');return true;});
 assert.equal(requests,1);assert.ok(a.session());
});
test('availability is a read-only service check, not authentication or email-delivery confirmation',async()=>{
 const a=new AuthConnection(config,new Memory(),async(url,init)=>{assert.ok(url.endsWith('/auth/v1/settings'));assert.equal(init?.method,'GET');assert.equal(init?.body,undefined);return json({external:{email:true},disable_signup:false,mailer_autoconfirm:false});});
 assert.deepEqual(await a.availability(),{emailEnabled:true,signupEnabled:true,confirmationRequired:true});
 assert.equal(a.session(),null);assert.equal(a.diagnostic()?.httpStatus,200);
});
test('PKCE exchange uses server token endpoint, validates inputs and cannot reopen after cancellation',async()=>{
 const storage=new Memory();let release:((value:Response)=>void)|undefined;
 const auth=new AuthConnection(config,storage,async(url,init)=>{
   assert.ok(url.endsWith('/auth/v1/token?grant_type=pkce'));
   assert.deepEqual(JSON.parse(String(init?.body)),{auth_code:'synthetic-code',code_verifier:'a'.repeat(64)});
   return new Promise<Response>(resolve=>{release=resolve;});
 },()=>1000000);
 await assert.rejects(auth.exchangePkce('code','short'),/Invalid/);
 const pending=auth.exchangePkce('synthetic-code','a'.repeat(64));
 while(!release)await new Promise(resolve=>setTimeout(resolve,1));
 auth.lock();release(json(session(4000)));
 await assert.rejects(pending,/cancelled/);assert.equal(auth.session(),null);assert.equal(storage.value,null);
});
test('signup sends full name as profile metadata, not membership or role claims',async()=>{
 const auth=new AuthConnection(config,new Memory(),async(_url,init)=>{
   assert.deepEqual(JSON.parse(String(init?.body)),{email:'new@example.test',password:'synthetic-password',data:{full_name:'Synthetic Owner'}});
   return json({user:{id:user}});
 });
 await auth.signUp('new@example.test','synthetic-password',' Synthetic Owner ');
 assert.equal(auth.session(),null);
});
test("encrypted session adapter scopes origins, persists refresh rotation and propagates failed saves", async () => {
  const db = new NodeDatabase(":memory:");
  try {
    await migrate(db);
    const a = new EncryptedSessionStorage(db, "local-a"),
      b = new EncryptedSessionStorage(db, "local-b");
    await a.save(session());
    assert.equal((await a.load())?.user.id, user);
    assert.equal(await b.load(), null);
    const auth = new AuthConnection(
      config,
      a,
      async () => json(session(4000)),
      () => 2000000,
    );
    await auth.restore();
    assert.equal(await auth.token(), "synthetic-access");
    assert.equal((await a.load())?.expires_at, 4000);
    await db.execAsync(
      "CREATE TRIGGER deny_session BEFORE INSERT ON auth_sessions BEGIN SELECT RAISE(ABORT,'full'); END;",
    );
    const fresh = new AuthConnection(config, a, async () => json(session()));
    await assert.rejects(
      fresh.signIn("test@example.test", "synthetic"),
      /full/,
    );
    assert.equal(fresh.session(), null);
  } finally {
    await db.close();
  }
});
test("sign out locks immediately, clears persisted credentials before network and reports failed server revocation", async () => {
  const store = new Memory();
  store.value = session();
  let sawCleared = false;
  const auth = new AuthConnection(config, store, async () => {
    sawCleared = store.value === null;
    throw Error("Offline");
  });
  await auth.restore();
  const promise = auth.signOut();
  assert.equal(auth.session(), null);
  const result = await promise;
  assert.equal(result.serverRevoked, false);
  assert.equal(sawCleared, true);
  assert.equal(await store.load(), null);
  await assert.rejects(auth.token(), /Sign in/);
});
test("expired session cannot bypass refresh offline; rejected refresh clears credentials; membership verified online", async () => {
  const store = new Memory();
  store.value = session(1);
  let requests = 0;
  const auth = new AuthConnection(
    config,
    store,
    async () => {
      requests++;
      return json({}, 401);
    },
    () => 2000000,
  );
  await auth.restore();
  await assert.rejects(auth.memberships(), /Sign in again/);
  assert.equal(auth.session(), null);
  assert.equal(store.value, null);
  assert.equal(requests, 1);
  const offline = new AuthConnection(config, store, async () => {
    throw Error("Offline");
  });
  await assert.rejects(offline.signIn("a@example.test", "pass"));
  assert.equal(offline.session(), null);
});
test("background lock cancels an in-flight sign-in and prevents connected record access", async () => {
  const store = new Memory();
  let finish!: (r: Response) => void;
  const auth = new AuthConnection(
    config,
    store,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = auth.signIn("a@example.test", "pass");
  await new Promise((resolve) => setImmediate(resolve));
  auth.lock();
  finish(json(session()));
  await assert.rejects(pending, /cancelled/);
  assert.equal(auth.session(), null);
  assert.equal(store.value, null);
});
test("configuration rejects secret keys and insecure nonlocal origins; password reset uses GoTrue recovery endpoints", async () => {
  assert.throws(
    () => backendConfig("https://example.test", "sb_secret_no"),
    /public/,
  );
  assert.throws(
    () => backendConfig("http://public.example.test", "sb_publishable_demo"),
    /HTTP/,
  );
  assert.equal(
    backendConfig("http://10.0.2.2:54321", "sb_publishable_demo").url,
    "http://10.0.2.2:54321",
  );
  const calls: { url: string; body: any }[] = [];
  const store = new Memory();
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url, body: JSON.parse(init!.body as string) });
    return json(url.includes("/verify") ? session() : {});
  };
  const auth = new AuthConnection(config, store, fetcher);
  await auth.requestReset("test@example.test");
  await auth.recover("test@example.test", "123456", "synthetic-new-password");
  assert.match(calls[0]!.url, /recover$/);
  assert.equal(calls[1]!.body.type, "recovery");
  assert.equal(calls[2]!.body.password, "synthetic-new-password");
  assert.equal(auth.session()?.user.id, user);
});

test("locked saved session can be explicitly removed offline without deleting queued work", async () => {
  const store = new Memory();
  store.value = session();
  const auth = new AuthConnection(config, store, async () => {
    throw Error("Offline");
  });
  const result = await auth.signOut();
  assert.equal(result.serverRevoked, false);
  assert.equal(store.value, null);
  assert.equal(auth.session(), null);
});

test("refresh cannot reopen connected access after background lock during persistence", async () => {
  const store = new Memory();
  store.value = session(1);
  let release!: () => void;
  const save = store.save.bind(store);
  store.save = async (s) => {
    await new Promise<void>((r) => {
      release = r;
    });
    await save(s);
  };
  const auth = new AuthConnection(
    config,
    store,
    async () => json(session(4000)),
    () => 2000000,
  );
  await auth.restore();
  const pending = auth.token();
  await new Promise((r) => setImmediate(r));
  auth.lock();
  release();
  await assert.rejects(pending, /locked/);
  assert.equal(auth.session(), null);
});

test('signup handles absent sessions without inventing access and never replaces a saved identity',async()=>{
 const store=new Memory();const auth=new AuthConnection(config,store,async()=>json({id:user}));
 assert.deepEqual(await auth.signUp('owner@example.test','synthetic-password-long'),{status:'sign-in-required'});assert.equal(store.value,null);assert.equal(auth.session(),null);
 await assert.rejects(auth.signUp('invalid','short'),/valid email/);store.value=session();await assert.rejects(auth.signUp('owner@example.test','synthetic-password-long'),/Sign out/);
 const immediateStore=new Memory();const immediate=new AuthConnection(config,immediateStore,async()=>json(session()));assert.deepEqual(await immediate.signUp('owner@example.test','synthetic-password-long'),{status:'signed-in'});assert.equal(immediate.session()?.user.id,user);assert.equal(immediateStore.value?.user.id,user);
});
test('signup verification cancellation cannot reopen access; acknowledged session persists',async()=>{
 const store=new Memory();let finish!:(r:Response)=>void;const auth=new AuthConnection(config,store,()=>new Promise(r=>{finish=r;}));
 const pending=auth.verifySignup('owner@example.test','123456');await new Promise(r=>setImmediate(r));auth.lock();finish(json(session()));await assert.rejects(pending,/cancelled/);assert.equal(store.value,null);
 const good=new AuthConnection(config,store,async()=>json(session()));await good.verifySignup('owner@example.test','123456');assert.equal(store.value!.user.id,user);
});

test('authentication HTTP requests exclude cookies, caches and URL referrers; storage only receives validated sessions',async()=>{
 const storage=new Memory();const a=new AuthConnection(config,storage,async(url,init)=>{
  assert.equal(init?.cache,'no-store');assert.equal(init?.credentials,'omit');assert.equal(init?.referrerPolicy,'no-referrer');
  assert.ok(!url.includes('PRIVATE_PASSWORD'));return json(session(4000));
 },()=>1000000);
 await a.signIn('synthetic@example.test','PRIVATE_PASSWORD');
 assert.ok(storage.value);assert.ok(!JSON.stringify(storage.value).includes('PRIVATE_PASSWORD'));
});

test('immediate registration preflights real service policy and does not send signup when confirmation is enabled',async()=>{
 const calls:string[]=[];const auth=new AuthConnection(config,new Memory(),async url=>{calls.push(url);return json({external:{email:true},disable_signup:false,mailer_autoconfirm:false});});
 await assert.rejects(auth.registerImmediately('new@example.test','synthetic-password','Synthetic Owner'),/CP_SIGNUP_POLICY/);
 assert.equal(calls.length,1);assert.ok(calls[0]!.endsWith('/settings'));assert.equal(auth.session(),null);
});
test('immediate signup persists only the real issued session and survives restore; no confirmation request',async()=>{
 const store=new Memory(),calls:string[]=[];const auth=new AuthConnection(config,store,async(url,init)=>{
  calls.push(url);if(url.endsWith('/settings'))return json({external:{email:true},disable_signup:false,mailer_autoconfirm:true});
  assert.ok(url.endsWith('/signup'));assert.ok(!url.includes('redirect_to'));assert.equal(JSON.parse(String(init?.body)).data.full_name,'Synthetic Owner');return json(session());
 });
 assert.deepEqual(await auth.registerImmediately('new@example.test','synthetic-password','Synthetic Owner'),{status:'signed-in'});
 assert.equal(calls.length,2);const restored=new AuthConnection(config,store);await restored.restore();assert.equal(restored.session()?.user.id,user);
});
test('signup storage failure, malformed tokens and in-flight lock never report session success',async()=>{
 const broken=new Memory();broken.save=async()=>{throw Error('storage full');};
 const bad=new AuthConnection(config,broken,async()=>json(session()));await assert.rejects(bad.signUp('new@example.test','synthetic-password'),/storage full/);assert.equal(bad.session(),null);
 const malformed=new AuthConnection(config,new Memory(),async()=>json({access_token:'partial'}));await assert.rejects(malformed.signUp('new@example.test','synthetic-password'));assert.equal(malformed.session(),null);
 let finish!:(r:Response)=>void;const store=new Memory();const locked=new AuthConnection(config,store,()=>new Promise(r=>finish=r));
 const pending=locked.signUp('new@example.test','synthetic-password');await new Promise(r=>setImmediate(r));locked.lock();finish(json(session()));await assert.rejects(pending,/interrupted/);assert.equal(store.value,null);assert.equal(locked.session(),null);
});

test('duplicate signup error is neutral in both visible message and safe diagnostics',async()=>{
 const auth=new AuthConnection(config,new Memory(),async()=>json({error_code:'user_already_exists',msg:'sensitive recipient'},422));
 await assert.rejects(auth.signUp('synthetic@example.test','synthetic-password'),e=>{assert.ok(e instanceof ConnectionError);assert.ok(!e.message.includes('already'));assert.equal(e.diagnostic?.serviceCode,'account_request_rejected');assert.ok(!JSON.stringify(e.diagnostic).includes('recipient'));return true;});
});

test('signup and login preserve password whitespace and unicode exactly',async()=>{
 const password='  Synthetic🔒 password  ';const bodies:unknown[]=[];const auth=new AuthConnection(config,new Memory(),async(_url,init)=>{bodies.push(JSON.parse(String(init?.body)));return json(session());});
 await auth.signUp('new@example.test',password);await auth.signIn('new@example.test',password);
 for(const body of bodies)assert.equal((body as {password:string}).password,password);
});

test('login does not mislabel unrelated service HTTP 400 errors as invalid credentials',async()=>{
 const auth=new AuthConnection(config,new Memory(),async()=>new Response(JSON.stringify({code:'validation_failed'}),{status:400,headers:{'Content-Type':'application/json'}}));
 await assert.rejects(auth.signIn('synthetic@example.test','synthetic-password'),e=>{assert.ok(e instanceof ConnectionError);assert.equal(e.diagnostic?.serviceCode,'validation_failed');assert.ok(!e.message.includes('incorrect'));return true;});
});

test('recovery accepts only the exact native callback and leaves signup redirects restricted',async()=>{
 let path='';let body:any;
 const auth=new AuthConnection(config,new Memory(),async(p,init)=>{path=String(p);body=JSON.parse(String(init?.body));return json({});});
 const challenge='a'.repeat(43);
 await auth.requestReset('synthetic@example.test',{redirectTo:'cleanproof-demo://reset-password',challenge});
 assert.match(path,/redirect_to=cleanproof-demo%3A%2F%2Freset-password/);assert.equal(body.code_challenge_method,'s256');
 for(const redirectTo of ['cleanproof-demo://other','cleanproof-demo://reset-password?next=bad','https://example.test/other']) await assert.rejects(auth.requestReset('synthetic@example.test',{redirectTo,challenge}),/Invalid email callback/);
 await assert.rejects(auth.signUp('synthetic@example.test','synthetic-password','Example',{redirectTo:'cleanproof-demo://reset-password',challenge}),/Invalid email callback/);
});
