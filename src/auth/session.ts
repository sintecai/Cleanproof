import type { TransactionalDatabase } from "../storage/contracts.ts";
import { SerialQueue } from "../storage/contracts.ts";
export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
};
export interface SessionStorage {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}
export class EncryptedSessionStorage implements SessionStorage {
  constructor(
    private db: TransactionalDatabase,
    private namespace: string,
  ) {}
  async load() {
    const r = await this.db.getFirstAsync<{ session_json: string }>(
      "SELECT session_json FROM auth_sessions WHERE namespace=?",
      this.namespace,
    );
    return r ? validateSession(JSON.parse(r.session_json)) : null;
  }
  async save(session: Session) {
    const safe = validateSession(session);
    await this.db.runAsync(
      "INSERT INTO auth_sessions VALUES(?,?) ON CONFLICT(namespace) DO UPDATE SET session_json=excluded.session_json",
      this.namespace,
      JSON.stringify(safe),
    );
  }
  async clear() {
    await this.db.runAsync(
      "DELETE FROM auth_sessions WHERE namespace=?",
      this.namespace,
    );
  }
}
export const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
export function validateSession(v: unknown): Session {
  const s = v as Session;
  if (
    !s ||
    typeof s.access_token !== "string" ||
    !s.access_token ||
    typeof s.refresh_token !== "string" ||
    !s.refresh_token ||
    !Number.isSafeInteger(s.expires_at) ||
    !s.user ||
    !uuid(s.user.id)
  )
    throw Error(
      "Saved sign-in could not be read safely. It has been preserved.",
    );
  return {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at,
    user: {
      id: s.user.id,
      ...(typeof s.user.email === "string" ? { email: s.user.email } : {}),
    },
  };
}
export type ConnectionDiagnostic = {code:string;at:string;backendOrigin:string;method:string;path:string;httpStatus?:number;serviceCode?:string};
export class ConnectionError extends Error {
  constructor(
    readonly kind: "network" | "session" | "permission" | "server",
    message: string,
    readonly diagnostic?: ConnectionDiagnostic,
  ) {
    super(message);
  }
}
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
export function backendConfig(url: string, key: string) {
  const parsed = new URL(url);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    !["http:", "https:"].includes(parsed.protocol)
  )
    throw Error("Use the backend origin without credentials or a path.");
  if (
    parsed.protocol === "http:" &&
    !/^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      parsed.hostname,
    )
  )
    throw Error("HTTP is permitted only for a local development backend.");
  if (!key.startsWith("sb_publishable_")) {
    try {
      const raw = key.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(
        atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, "=")),
      );
      if (payload.role !== "anon") throw Error();
    } catch {
      throw Error(
        "Use only the public anon/publishable key. Never use a secret/service-role key.",
      );
    }
  }
  return { url: parsed.origin, key };
}
export type EmailLinkOptions={redirectTo:string;challenge:string};
function emailLinkRequest(options:EmailLinkOptions|undefined,nativeRecovery=false){
 if(!options)return {query:'',body:{}};
 let u:URL;try{u=new URL(options.redirectTo);}catch{throw Error('Invalid email callback configuration.');}
 const web=u.protocol==='https:'&&['/email-callback.html','/reset-password.html'].includes(u.pathname);
 const native=nativeRecovery&&['cleanproof-demo://reset-password','cleanproof-staging://reset-password','cleanproof://reset-password'].includes(u.href);
 if((!web&&!native)||u.username||u.password||u.search||u.hash||!/^[A-Za-z0-9_-]{43}$/.test(options.challenge))throw Error('Invalid email callback configuration.');
 return {query:'?redirect_to='+encodeURIComponent(u.href),body:{code_challenge:options.challenge,code_challenge_method:'s256'}};
}
/** GoTrue performs password/refresh verification. Tokens live only in SQLCipher storage and memory. */
export class AuthConnection {
  private current: Session | null = null;
  private retired=false;
  private requests=new Set<AbortController>();
  assertActive(){if(this.retired)throw new ConnectionError('session','This account session has ended. Sign in again.');}
  trackRequest(controller:AbortController){this.assertActive();this.requests.add(controller);return ()=>{this.requests.delete(controller);};}
  private cancelRequests(){for(const request of this.requests)request.abort();this.requests.clear();}
  /** Permanently fence an old identity before another one may authenticate. */
  retire(){this.retired=true;this.cancelRequests();this.lock();}

  private lastDiagnostic: ConnectionDiagnostic | null = null;
  diagnostic() { return this.lastDiagnostic; }
  async availability() {
    const value=await this.request('/auth/v1/settings');
    return {emailEnabled:value?.external?.email===true,signupEnabled:value?.disable_signup===false,confirmationRequired:value?.mailer_autoconfirm===false};
  }
  private lockListeners = new Set<() => void>();
  onLock(listener: () => void) {
    this.lockListeners.add(listener);
    return () => {
      this.lockListeners.delete(listener);
    };
  }
  private serial = new SerialQueue();
  private generation = 0;
  constructor(
    readonly config: { url: string; key: string },
    private storage: SessionStorage,
    private fetcher: Fetcher = fetch,
    private now = () => Date.now(),
    private onSignOut: () => Promise<void> = async () => {},
  ) {}
  private async request(
    path: string,
    body?: unknown,
    token?: string,
    method = body === undefined ? "GET" : "POST",
  ) {
    this.assertActive();
    const requestGeneration=this.generation;
    const authRequest=path.startsWith('/auth/v1/');
    const diagnostic=(code:string,extra:Partial<ConnectionDiagnostic>={})=>{
      const value={code,at:new Date(this.now()).toISOString(),backendOrigin:this.config.url,method,path:path.split('?')[0]!,...extra};
      this.lastDiagnostic=value;return value;
    };
    const controller = new AbortController();
    const untrack=this.trackRequest(controller);
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      let init:RequestInit;
      try {
        init={method,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{apikey:this.config.key,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal};
      } catch {
        throw new ConnectionError('server','The request could not be prepared. No request was sent.',diagnostic('CP_REQUEST_INVALID'));
      }
      let response: Response;
      // Invoke as a function, never as an AuthConnection method: native browser fetch brand-checks its receiver.
      const send=this.fetcher;
      try { response=await send(this.config.url+path,init); }
      catch(cause) {
        const timedOut=controller.signal.aborted || (cause instanceof Error && cause.name==='AbortError');
        const invalidReceiver=cause instanceof Error && /Illegal invocation|incompatible receiver/i.test(cause.message);
        const d=diagnostic(invalidReceiver?'CP_AUTH_FETCH_RECEIVER':timedOut?'CP_AUTH_TIMEOUT':'CP_AUTH_TRANSPORT');
        throw new ConnectionError('network',authRequest
          ? timedOut?'The account service did not respond in time. No authentication result was confirmed. [CP_AUTH_TIMEOUT]':'This browser could not reach the account service. No authentication result was confirmed. Open Connection help for safe diagnostics. [CP_AUTH_TRANSPORT]'
          : 'Connection unavailable. Saved work has been kept; retry when online.',d);
      }
      this.assertActive();if(requestGeneration!==this.generation)throw new ConnectionError('session',path.startsWith('/auth/v1/signup')?'Account creation was interrupted. Sign in to continue.':'Account request was cancelled. Saved work is preserved.');
      diagnostic('CP_HTTP_RESPONSE',{httpStatus:response.status});
      if (!response.ok) {
        let failure:any;try{failure=await response.json();}catch{failure=null;}
        const candidate=failure?.error_code ?? failure?.code;
        const serviceCode=typeof candidate==='string'&&/^[A-Za-z0-9_]{1,64}$/.test(candidate)?candidate:undefined;
        const d=diagnostic('CP_AUTH_HTTP_ERROR',{httpStatus:response.status,...(serviceCode?{serviceCode:['user_already_exists','email_exists'].includes(serviceCode)?'account_request_rejected':serviceCode}:{})});
        if(authRequest){
          if(response.status===429 || serviceCode==='over_email_send_rate_limit')throw new ConnectionError('server','Too many requests. Wait before trying again. Email delivery has not been confirmed.',d);
          if(path.includes('grant_type=password') && response.status===400 && serviceCode==='invalid_credentials')throw new ConnectionError('session','Email or password is incorrect. Try again or use Forgot password.',d);
          if(serviceCode==='user_already_exists'||serviceCode==='email_exists')throw new ConnectionError('session','Unable to create an account with these details. Try Sign in or Forgot password.',d);
          if(serviceCode==='weak_password')throw new ConnectionError('server','Use a stronger, unique password of 12–256 characters.',d);
          if(serviceCode==='captcha_failed')throw new ConnectionError('server','The account service requires an anti-abuse check. Contact support if no challenge is available.',d);
          if(serviceCode==='email_address_invalid')throw new ConnectionError('server','This email address is not accepted by the account service. Check the address and use an authorised staging test mailbox.',d);
          if(serviceCode==='email_address_not_authorized')throw new ConnectionError('server','Email delivery to this address is not authorised by the staging email provider. Sender configuration is required.',d);
          if(serviceCode==='otp_expired'||serviceCode==='flow_state_expired'||serviceCode==='flow_state_not_found')throw new ConnectionError('session','This link is expired or already used. Request a new link, or sign in if your email is already confirmed.',d);
          if(serviceCode==='email_not_confirmed')throw new ConnectionError('session','This account cannot sign in under the current account policy. Contact support for an existing-account review; do not register it again.',d);
          if(response.status>=500)throw new ConnectionError('server','The account service could not complete this request. No successful authentication or email delivery was confirmed.',d);
        }
        if(response.status===401 || (response.status===400&&path.includes('grant_type=refresh_token')))throw new ConnectionError('session','Sign in again to connect.',d);
        if(response.status===403)throw new ConnectionError('permission','Your account cannot perform this action.',d);
        throw new ConnectionError('server','The service rejected this request. Check the details and retry.',d);
      }
      if (response.status === 204) return null;
      try {
        return await response.json();
      } catch {
        throw new ConnectionError(
          "server",
          "The service returned an unreadable response.",
        );
      }
    } finally {
      clearTimeout(timeout);untrack();
    }
  }
  private decode(v: any): Session {
    return validateSession({
      ...v,
      expires_at: v.expires_at ?? Math.floor(this.now() / 1000) + v.expires_in,
    });
  }
  async restore() {
    this.assertActive();
    return this.serial.run(async () => {
      this.assertActive();
      const generation = this.generation;
      const saved = await this.storage.load();
      this.assertActive();if (generation === this.generation) this.current = saved;
      return this.current;
    });
  }
  revision() {
    return this.generation;
  }
  session() {
    return this.current;
  }
  lock() {
    this.cancelRequests();
    this.lockListeners.forEach((listener) => listener());
    ++this.generation;
    this.current = null;
  }
  async registerImmediately(email:string,password:string,fullName:string) {
    const status=await this.availability();
    if(!status.emailEnabled||!status.signupEnabled||status.confirmationRequired)
      throw new ConnectionError('server','Account creation is not configured for immediate access yet. No registration was sent. The service owner must finish the signup setting. [CP_SIGNUP_POLICY]');
    return this.signUp(email,password,fullName);
  }
  async signUp(email: string, password: string, fullName?: string, link?:EmailLinkOptions) {
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address.length > 254 || password.length < 12 || password.length > 256)
      throw Error("Enter a valid email and a password of 12–256 characters.");
    const generation=this.generation;
    return this.serial.run(async () => {
      this.assertActive();
      if (this.current || await this.storage.load()) throw Error("Sign out before registering another account. Local work is preserved.");
      if(fullName !== undefined && (!fullName.trim() || fullName.trim().length>120)) throw Error('Enter your full name (up to 120 characters).');
      const flow=emailLinkRequest(link);
      const result = await this.request('/auth/v1/signup'+flow.query, {...flow.body,email: address, password, ...(fullName ? {data:{full_name:fullName.trim()}} : {})});
      if(generation!==this.generation)throw new ConnectionError('session','Account creation was interrupted. Sign in to continue.');
      if (result?.access_token || result?.refresh_token) {
        const session=this.decode(result); // Malformed/partial sessions never grant access.
        await this.storage.save(session);
        if(generation!==this.generation){await this.storage.clear();throw new ConnectionError('session','Account creation was interrupted. Sign in to continue.');}
        this.current=session;
        return {status:'signed-in' as const};
      }
      return {status:'sign-in-required' as const};
    });
  }
  async resendSignup(email: string, link?:EmailLinkOptions) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw Error("Enter a valid email.");
    const flow=emailLinkRequest(link);await this.request('/auth/v1/resend'+flow.query, {...flow.body,type:'signup',email:email.trim()});
  }
  async verifySignup(email: string, code: string) {
    if (!/^[0-9]{6,10}$/.test(code.trim())) throw Error("Enter the verification code from your email.");
    const generation = ++this.generation;
    this.current = null;
    return this.serial.run(async () => {
      await this.storage.clear();
      const s = this.decode(await this.request('/auth/v1/verify', {type:'signup',email:email.trim(),token:code.trim()}));
      if (generation !== this.generation) throw new ConnectionError('session','Verification cancelled.');
      await this.storage.save(s);
      if (generation !== this.generation) {await this.storage.clear();throw new ConnectionError('session','Verification cancelled.');}
      this.current = s;return s;
    });
  }
  async signIn(email: string, password: string) {
    this.assertActive();
    const generation = ++this.generation;
    this.current = null;
    return this.serial.run(async () => {
      this.assertActive();
      // Remove a previous identity before replacing it. Failure keeps access locked.
      await this.storage.clear();
      const s = this.decode(
        await this.request("/auth/v1/token?grant_type=password", {
          email: email.trim(),
          password,
        }),
      );
      if (generation !== this.generation)
        throw new ConnectionError("session", "Sign-in was cancelled.");
      await this.storage.save(s);
      if (generation !== this.generation) {
        await this.storage.clear();
        throw new ConnectionError("session", "Sign-in was cancelled.");
      }
      this.current = s;
      return s;
    });
  }
  async exchangePkce(code: string, verifier: string) {
    if (!code || code.length>2048 || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw Error('Invalid or expired sign-in link.');
    const generation=++this.generation;this.current=null;
    return this.serial.run(async()=>{
      await this.storage.clear();
      const session=this.decode(await this.request('/auth/v1/token?grant_type=pkce',{auth_code:code,code_verifier:verifier}));
      if(generation!==this.generation)throw new ConnectionError('session','Sign-in cancelled.');
      await this.storage.save(session);
      if(generation!==this.generation){await this.storage.clear();throw new ConnectionError('session','Sign-in cancelled.');}
      this.current=session;return session;
    });
  }
  async token() {
    this.assertActive();
    return this.serial.run(async () => {
      this.assertActive();
      let s = this.current;
      if (!s) throw new ConnectionError("session", "Sign in to connect.");
      if (s.expires_at * 1000 <= this.now() + 60000) {
        const generation = this.generation;
        try {
          const next = this.decode(
            await this.request("/auth/v1/token?grant_type=refresh_token", {
              refresh_token: s.refresh_token,
            }),
          );
          if (generation !== this.generation)
            throw new ConnectionError("session", "Sign in to connect.");
          await this.storage.save(next);
          if (generation !== this.generation)
            throw new ConnectionError(
              "session",
              "Connected records are locked. Recover the saved session when online.",
            );
          this.current = s = next;
        } catch (e) {
          if (!this.retired && generation===this.generation && e instanceof ConnectionError && e.kind === "session") {
            this.current = null;
            await this.storage.clear();
          }
          throw e;
        }
      }
      return s.access_token;
    });
  }
  async signOut() {
    this.cancelRequests();
    this.lockListeners.forEach((listener) => listener());
    let previous = this.current;
    let unknownSession = false;
    ++this.generation;
    this.current = null;
    await this.onSignOut();
    // Durable local sign-out FIRST. A failed delete is reported, never labelled successful.
    await this.serial.run(async () => {
      if (!previous) {
        try {
          previous = await this.storage.load();
        } catch {
          unknownSession = true;
        }
      }
      await this.storage.clear();
    });
    if (previous) {
      try {
        await this.request(
          "/auth/v1/logout?scope=local",
          {},
          previous.access_token,
        );
      } catch {
        return { serverRevoked: false };
      }
    }
    return { serverRevoked: !unknownSession };
  }
  async deleteAccount(closeOwnedCompanies:boolean){
    const result=await this.request('/functions/v1/delete-account',{confirm:'DELETE MY ACCOUNT',closeOwnedCompanies},await this.token());
    if(result?.deleted!==true)throw new ConnectionError('server','Account deletion was not confirmed. Your saved work has not been removed.');
    await this.signOut();
    return {deleted:true as const};
  }
  async memberships() {
    const generation = this.generation;
    const token = await this.token();
    const user = await this.request("/auth/v1/user", undefined, token);
    if (!user || user.id !== this.current?.user.id)
      throw new ConnectionError("session", "Sign in again.");
    const rows = await this.request(
      "/rest/v1/cp_memberships?select=company_id,role,active&user_id=eq." +
        user.id +
        "&active=eq.true",
      undefined,
      token,
    );
    if (generation !== this.generation)
      throw new ConnectionError("session", "Connected records are locked.");
    if (
      !Array.isArray(rows) ||
      rows.some(
        (row) =>
          !uuid(row.company_id) ||
          !["owner", "inspector"].includes(row.role) ||
          row.active !== true,
      )
    )
      throw new ConnectionError(
        "server",
        "Company access response could not be read safely.",
      );
    return rows as {
      company_id: string;
      role: "owner" | "inspector";
      active: boolean;
    }[];
  }
  async companyProfile(companyId: string) {
    if (!uuid(companyId)) throw Error('Invalid company reference.');
    const generation = this.generation;
    const token = await this.token();
    const companies = await this.request('/rest/v1/cp_companies?select=id,name&id=eq.'+companyId,undefined,token);
    const profiles = await this.request('/rest/v1/cp_company_profiles?select=company_id,contact_email,timezone&company_id=eq.'+companyId,undefined,token);
    if (generation !== this.generation) throw new ConnectionError('session','Account access changed.');
    if (!Array.isArray(companies)||companies.length!==1||companies[0].id!==companyId||typeof companies[0].name!=='string'||!companies[0].name.trim()||!Array.isArray(profiles)||profiles.length!==1||profiles[0].company_id!==companyId||typeof profiles[0].contact_email!=='string'||typeof profiles[0].timezone!=='string') throw Error('The authorised company profile is unavailable.');
    return {id:companyId,name:companies[0].name as string,contact:profiles[0].contact_email as string,timezone:profiles[0].timezone as string};
  }
  async rpc(
    name:
      | "cp_register_company"
      | "cp_create_company"
      | "cp_apply_operation"
      | "cp_pull_changes"
      | "cp_sync_register"
      | "cp_sync_stage"
      | "cp_photo_intent"
      | "cp_sync_commit"
      | "cp_sync_pull"
      | "cp_access_scope"
      | "cp_request_account_deletion",
    body: unknown,
  ) {
    return this.request("/rest/v1/rpc/" + name, body, await this.token());
  }
  async requestReset(email: string, link?:EmailLinkOptions) {
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw Error('Enter a valid email address.');
    const flow=emailLinkRequest(link,true);
    await this.request("/auth/v1/recover"+flow.query, {...flow.body,email: email.trim() });
  }
  async updatePassword(password:string){
    if(password.length<12||password.length>256)throw Error('Use a password of 12–256 characters.');
    return this.request('/auth/v1/user',{password},await this.token(),'PUT');
  }
  async recover(email: string, token: string, password: string) {
    const generation = ++this.generation;
    this.current = null;
    return this.serial.run(async () => {
      await this.storage.clear();
      const s = this.decode(
        await this.request("/auth/v1/verify", {
          email: email.trim(),
          token,
          type: "recovery",
        }),
      );
      await this.request("/auth/v1/user", { password }, s.access_token, "PUT");
      if (generation !== this.generation)
        throw new ConnectionError("session", "Recovery cancelled.");
      await this.storage.save(s);
      if (generation !== this.generation) {
        await this.storage.clear();
        throw new ConnectionError("session", "Recovery cancelled.");
      }
      this.current = s;
    });
  }
}
