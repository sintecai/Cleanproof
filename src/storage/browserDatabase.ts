import {ensureSelectedSnapshot} from './selectedWorkspace';
import {openBrowserRecords} from './browserIndexedDb';
import type { Database, SqlJsStatic } from "sql.js";
import {
  SerialQueue,
  type Connection,
  type TransactionalDatabase,
  type SqlValue,
} from "./contracts.ts";
// Browser-only encrypted snapshot store. Native SQLCipher/key handling never imports this file.
export async function browserRecord(
  store: string,
  key: string,
  value?: unknown,
): Promise<any> {
  const db = await openBrowserRecords();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(
        "private",
        value === undefined ? "readonly" : "readwrite",
      );
      const r =
        value === undefined
          ? t.objectStore("private").get(store + ":" + key)
          : t.objectStore("private").put(value, store + ":" + key);
      let result: any;
      r.onsuccess = () => {
        result = r.result;
      };
      const timer=setTimeout(()=>{try{t.abort();}catch{}reject(Error('Protected storage took too long. Retry without clearing browser data.'));},8000);
      t.oncomplete = () => {clearTimeout(timer);resolve(result);};
      t.onabort = () => {clearTimeout(timer);reject(t.error ?? Error("Browser storage write failed"));};
      t.onerror = () => {clearTimeout(timer);reject(t.error);};
    });
  } finally {
    db.close();
  }
}
export async function createBrowserRecord(store: string, key: string, value: unknown): Promise<any> {
  const db = await openBrowserRecords();
  try { return await new Promise((resolve,reject)=>{
    const t=db.transaction('private','readwrite'),s=t.objectStore('private'),r=s.get(store+':'+key);
    let result: unknown;
    r.onsuccess=()=>{result=r.result ?? value;if(r.result===undefined)s.put(value,store+':'+key);};
    const timer=setTimeout(()=>{try{t.abort();}catch{}reject(Error('Account device storage took too long. Retry without clearing site data.'));},8000);
    t.oncomplete=()=>{clearTimeout(timer);resolve(result);};t.onabort=()=>{clearTimeout(timer);reject(t.error ?? Error('Account device save failed.'));};t.onerror=()=>{clearTimeout(timer);reject(t.error);};
  }); } finally { db.close(); }
}
export class BrowserDatabase implements TransactionalDatabase {
  private queue = new SerialQueue();
  private constructor(
    private db: Database,
    private SQL: SqlJsStatic,
    private key: CryptoKey,
    private salt: Uint8Array,
    readonly namespace: string,
    private version = 0,
  ) {}
  static async open(passphrase: string, namespace = "interactive", requireExisting = false) {
    if (!globalThis.crypto?.subtle)
      throw Error("Encrypted browser storage requires HTTPS. Open the private HTTPS preview; your existing data has not been reset.");
    if (passphrase.length < 12)
      throw Error(
        "Use at least 12 characters for the synthetic browser workspace passphrase.",
      );
    const SQL = await browserSql(),
      saved = await browserRecord("db", namespace);
    ensureSelectedSnapshot(requireExisting,saved);
    const salt: Uint8Array =
      saved?.salt ?? crypto.getRandomValues(new Uint8Array(16));
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt.slice().buffer,
        iterations: 600000,
        hash: "SHA-256",
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    let db: Database;
    try {
      db = saved
        ? new SQL.Database(
            new Uint8Array(
              await crypto.subtle.decrypt(
                {
                  name: "AES-GCM",
                  iv: new Uint8Array(saved.iv).slice().buffer,
                  additionalData: new TextEncoder().encode(namespace),
                },
                key,
                saved.bytes,
              ),
            ),
          )
        : new SQL.Database();
    } catch {
      throw Error(
        "Browser workspace could not be unlocked. Existing encrypted data is preserved; check the passphrase.",
      );
    }
    db.run("PRAGMA foreign_keys=ON;");
    return new BrowserDatabase(
      db,
      SQL,
      key,
      salt,
      namespace,
      saved?.version ?? 0,
    );
  }
  private connection(): Connection {
    return {
      execAsync: async (sql) => {
        this.db.exec(sql);
      },
      runAsync: async (sql, ...params) => {
        this.db.run(sql, params);
        return { changes: this.db.getRowsModified() };
      },
      getAllAsync: async <T>(sql: string, ...params: SqlValue[]) => {
        const stmt = this.db.prepare(sql);
        try {
          stmt.bind(params);
          const result: T[] = [];
          while (stmt.step()) result.push(stmt.getAsObject() as T);
          return result;
        } finally {
          stmt.free();
        }
      },
      getFirstAsync: async <T>(sql: string, ...params: SqlValue[]) => {
        const stmt = this.db.prepare(sql);
        try {
          stmt.bind(params);
          return stmt.step() ? (stmt.getAsObject() as T) : null;
        } finally {
          stmt.free();
        }
      },
    };
  }
  private async save() {
    const bytes = this.db.export();
    this.db.run("PRAGMA foreign_keys=ON;");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(this.namespace),
      },
      this.key,
      bytes.slice().buffer,
    );
    await compareBrowserSnapshot(this.namespace, this.version, {
      salt: this.salt,
      iv,
      bytes: sealed,
      version: this.version + 1,
    });
    this.version++;
  }
  transaction<T>(task: (tx: Connection) => Promise<T>) {
    return this.queue.run(async () => {
      const prior = this.db.export();
      this.db.run("PRAGMA foreign_keys=ON;BEGIN IMMEDIATE;");
      try {
        const value = await task(this.connection());
        this.db.run("COMMIT;");
        await this.save();
        return value;
      } catch (e) {
        this.db.close();
        this.db = new this.SQL.Database(prior);
        this.db.run("PRAGMA foreign_keys=ON;");
        throw e;
      }
    });
  }
  execAsync(sql: string) {
    return this.transaction((tx) => tx.execAsync(sql));
  }
  runAsync(sql: string, ...p: SqlValue[]) {
    return this.transaction((tx) => tx.runAsync(sql, ...p));
  }
  getAllAsync<T>(sql: string, ...p: SqlValue[]) {
    return this.queue.run(() => this.connection().getAllAsync<T>(sql, ...p));
  }
  getFirstAsync<T>(sql: string, ...p: SqlValue[]) {
    return this.queue.run(() => this.connection().getFirstAsync<T>(sql, ...p));
  }
  close() {
    return this.queue.run(async () => {
      this.db.close();
    });
  }
}
let passphrase = "";
export function setBrowserPassphrase(value: string) {
  passphrase = value;
}
export function getBrowserPassphrase() {
  return passphrase;
}

export async function browserKeys(prefix: string): Promise<string[]> {
  const db = await openBrowserRecords();
  try {
    return await new Promise((resolve, reject) => {
      const names: string[] = [];
      const t = db.transaction("private", "readonly"),
        r = t.objectStore("private").openCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (!c) return;
        if (String(c.key).startsWith(prefix + ":") && c.value)
          names.push(String(c.key).slice(prefix.length + 1));
        c.continue();
      };
      t.oncomplete = () => resolve(names);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

let loaded: Promise<SqlJsStatic> | undefined;
function browserSql() {
 if(loaded)return loaded;
 const request=new Promise<SqlJsStatic>((resolve,reject)=>{
  const script=document.createElement('script');let done=false;
  const finish=(error:unknown,value?:SqlJsStatic)=>{if(done)return;done=true;clearTimeout(timer);if(error){script.remove();reject(error);}else resolve(value!);};
  const timer=setTimeout(()=>finish(Error('SQLite browser assets took too long to load. Retry opening; existing encrypted data is preserved.')),20000);
  script.src='/sql-wasm.js';
  script.onload=()=>{if(done)return;try{const init=(window as unknown as {initSqlJs:(options:unknown)=>Promise<SqlJsStatic>}).initSqlJs;if(typeof init!=='function')throw Error('SQLite browser runtime is unavailable.');void init({locateFile:()=>'/sql-wasm.wasm'}).then(value=>finish(null,value),error=>finish(error));}catch(error){finish(error);}};
  script.onerror=()=>finish(Error('SQLite browser assets are unavailable. Retry without clearing saved work.'));
  document.head.appendChild(script);
 });
 loaded=request.catch(error=>{loaded=undefined;throw error;});return loaded;
}

async function compareBrowserSnapshot(
  namespace: string,
  version: number,
  value: unknown,
) {
  const db = await openBrowserRecords();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("private", "readwrite"),
        store = t.objectStore("private"),
        r = store.get("db:" + namespace);
      let conflict = false;
      r.onsuccess = () => {
        if ((r.result?.version ?? 0) !== version) {
          conflict = true;
          t.abort();
        } else store.put(value, "db:" + namespace);
      };
      t.oncomplete = () => resolve();
      t.onabort = () =>
        reject(
          Error(
            conflict
              ? "Another tab changed this browser workspace. Reopen before saving; this change was not acknowledged."
              : "Browser snapshot could not be saved.",
          ),
        );
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

let backend: { url: string; key: string } | null = null;
export function setBrowserBackend(value: { url: string; key: string } | null) {
  backend = value;
}
export function getBrowserBackend() {
  return backend;
}
let account: import('../auth/session').Session | null = null;
export function setBrowserAccount(value: import('../auth/session').Session | null) { account=value; }
export function getBrowserAccount() { return account; }
export function browserActiveKey() {
  return account && backend ? 'cleanproof.account.active.'+backend.url+':'+account.user.id : 'cleanproof.preview.active';
}

// Customer authentication has one refresh-token owner. Local-demo/native adapters remain separate.
let customerConnection: import('../auth/session').AuthConnection | null=null;
export function setBrowserConnection(value:import('../auth/session').AuthConnection|null){customerConnection=value;}
export function getBrowserConnection(){return customerConnection;}
