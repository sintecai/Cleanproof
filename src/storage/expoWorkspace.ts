import { initialiseFreshCompany, openFreshCompany } from "../application/freshCompany";
import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { demo } from "../domain/inspection.ts";
import type { Connection, TransactionalDatabase } from "./contracts.ts";
import { SerialQueue } from "./contracts.ts";
import {
  getWorkspaceKey,
  StorageGateError,
  unlockDatabase,
} from "./encryption.ts";
import { InspectionRepository } from "./inspectionRepository.ts";
import { WorkflowRepository } from "./workflowRepository.ts";
import { Catalogue } from "./catalogue.ts";
import { nativeVault, clearTransient } from "../media/nativeMedia.ts";
import type { MediaVault } from "../media/vault.ts";
import type { DemoWorkspace } from "../domain/inspection.ts";

import {
  AuthConnection,
  EncryptedSessionStorage,
  backendConfig,
} from "../auth/session.ts";
import { BusinessRepository } from "../sync/business/repository.ts";
import { BusinessAccess } from "../sync/business/access.ts";
import { seedSynthetic } from "../development/seed";
import { isolateAuthorised } from "../sync/business/isolation";
import { canonical } from "../sync/protocol";
import { migrate } from "./migrations";
import { SyncStore } from "../sync/store.ts";

const DB_NAME = "cleanproof-demo-cp001.db";
const KEY_NAME = "cleanproof.demo.cp001.database.key";
const bootstrapQueue = new SerialQueue();
/** One private connection, keyed before use. All access is serialised, including reads. */
class ExpoDatabase implements TransactionalDatabase {
  private queue = new SerialQueue();
  constructor(private readonly db: SQLite.SQLiteDatabase) {}
  execAsync(sql: string) {
    return this.queue.run(() => this.db.execAsync(sql));
  }
  runAsync(sql: string, ...params: (string | number | null)[]) {
    return this.queue.run(() => this.db.runAsync(sql, ...params));
  }
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) {
    return this.queue.run(() => this.db.getFirstAsync<T>(sql, ...params));
  }
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]) {
    return this.queue.run(() => this.db.getAllAsync<T>(sql, ...params));
  }
  transaction<T>(task: (transaction: Connection) => Promise<T>): Promise<T> {
    // Do not use Expo's separate unkeyed transaction connection with SQLCipher.
    // No caller can access this raw connection while the serialised transaction runs.
    return this.queue.run(async () => {
      await this.db.execAsync("BEGIN IMMEDIATE;");
      try {
        const result = await task(this.db);
        await this.db.execAsync("COMMIT;");
        return result;
      } catch (error) {
        try {
          await this.db.execAsync("ROLLBACK;");
        } catch {
          /* Preserve the original failure. */
        }
        throw error;
      }
    });
  }
  close() {
    return this.queue.run(() => this.db.closeAsync());
  }
}
export interface WorkspaceHandle {
  business: BusinessRepository;
  access: BusinessAccess;
  connection(): AuthConnection | null;
  syncStore(userId: string, companyId: string): SyncStore;
  repository: InspectionRepository;
  catalogue: Catalogue;
  workflow: WorkflowRepository;
  forInspection(
    id: string,
  ): Promise<{ repository: InspectionRepository; workspace: DemoWorkspace }>;
  workspace: DemoWorkspace;
  media(): Promise<{ vault: MediaVault; orphans: string[] }>;
  isolate?(auth: AuthConnection, review: string): Promise<void>;
  openCompany?(auth: AuthConnection, company: string, name: string): Promise<void>;
  createDemo?(): Promise<void>;
  configureBackend?(url: string, key: string): Promise<void>;
  returnProtected?(): Promise<void>;
  close(): Promise<void>;
}
/** Read existing profile identity without migration, seeding, session restoration
 * or key creation. Discovery must never mutate another account's database. */
export async function inspectNativeWorkspaceProfile(profile:string){
 if(profile!=='legacy'&&!/^[a-f0-9-]{36}$/.test(profile))throw Error('Invalid workspace selection.');
 const databaseName=profile==='legacy'?DB_NAME:`cleanproof-profile-${profile}.db`;
 if(!new File(SQLite.defaultDatabaseDirectory,databaseName).exists)throw Error('Saved database is unavailable.');
 const key=await SecureStore.getItemAsync(profile==='legacy'?KEY_NAME:KEY_NAME+'.'+profile,{keychainAccessible:SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,keychainService:'com.sicyinternational.cleanproof.demo.cp001'});
 if(!key)throw new StorageGateError('MISSING_KEY');
 if(!/^[a-f0-9]{64}$/.test(key))throw new StorageGateError('INVALID_KEY');
 const raw=await SQLite.openDatabaseAsync(databaseName,{useNewConnection:true});
 try{
  if(!(await raw.getFirstAsync<{cipher_version:string}>('PRAGMA cipher_version'))?.cipher_version)throw new StorageGateError('NO_CIPHER');
  await raw.execAsync(`PRAGMA key = '${key}'; PRAGMA query_only = ON;`);
  const exists=await raw.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='business_binding'");
  return exists?await raw.getFirstAsync<{user_id:string;company:string;origin:string}>('SELECT user_id,company,origin FROM business_binding'):null;
 }finally{await raw.closeAsync();}
}
export function openDemoWorkspace(
  inspectionId = demo.inspectionId,
  options?: { profile: string; empty?: boolean; seed?: boolean; companyHint?: string; auth?: AuthConnection; publicConfig?: {url:string;key:string}; fresh?: {auth:AuthConnection;company:string;name:string} },
): Promise<WorkspaceHandle> {
  return bootstrapQueue.run(async () => {
    if (Platform.OS !== "android" && Platform.OS !== "ios")
      throw new StorageGateError("STORAGE_UNAVAILABLE");
    const enrolled = await LocalAuthentication.getEnrolledLevelAsync();
    if (enrolled === LocalAuthentication.SecurityLevel.NONE)
      throw new StorageGateError("DEVICE_LOCK_REQUIRED");
    const profile =
      options?.profile ??
      (await SecureStore.getItemAsync("cleanproof.active-profile")) ??
      "legacy";
    if (profile !== "legacy" && !/^[a-f0-9-]{36}$/.test(profile))
      throw Error(
        "Invalid encrypted workspace selection; existing files preserved.",
      );
    const databaseName =
        profile === "legacy" ? DB_NAME : `cleanproof-profile-${profile}.db`,
      keyName = profile === "legacy" ? KEY_NAME : KEY_NAME + "." + profile;
    const seed = options?.seed ?? (profile === "legacy" && process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS === "1" && !options?.empty);
    const databaseExists = new File(
      SQLite.defaultDatabaseDirectory,
      databaseName,
    ).exists;
    const keyOptions: SecureStore.SecureStoreOptions = {
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      keychainService: "com.sicyinternational.cleanproof.demo.cp001",
    };
    const key = await getWorkspaceKey({
      databaseExists,
      keys: {
        get: () => SecureStore.getItemAsync(keyName, keyOptions),
        set: (value) => SecureStore.setItemAsync(keyName, value, keyOptions),
      },
      randomHex: async () =>
        Array.from(await Crypto.getRandomBytesAsync(32), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join(""),
    });
    const raw = await SQLite.openDatabaseAsync(databaseName, {
      useNewConnection: true,
    });
    try {
      await unlockDatabase(raw, key);
      const db = new ExpoDatabase(raw);
      await migrate(db);
      if(options?.fresh) await initialiseFreshCompany(db,options.fresh.auth,options.fresh.company,options.fresh.name,()=>Crypto.randomUUID());
      const binding=await db.getFirstAsync<{local_company:string}>('SELECT local_company FROM business_binding');
      const localCompany=binding?.local_company ?? options?.companyHint ?? demo.companyId;
      const base= localCompany!==demo.companyId ? {...demo,companyId:localCompany,companyName:'',siteId:localCompany,siteName:'',inspectionId:localCompany,templateVersionId:localCompany,templateName:'',items:[]} : demo;
      if(options?.publicConfig){
        const config=backendConfig(options.publicConfig.url,options.publicConfig.key);
        const previous=await db.getFirstAsync<{origin:string}>('SELECT origin FROM business_binding');
        if(previous&&previous.origin!==config.url)throw Error('Workspace belongs to another backend.');
        await db.runAsync("INSERT INTO local_secrets VALUES('backend-public-settings',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",JSON.stringify(config));
      }
      const repository = new InspectionRepository(
        db,
        base,
        () => new Date().toISOString(),
        () => Crypto.randomUUID(),
      );
      if (seed) await repository.initialise();
      else await migrate(db);
      const catalogue = new Catalogue(
        db,
        base.companyId,
        () => Crypto.randomUUID(),
        () => new Date().toISOString(),
      );
      if (seed) await catalogue.seed();
      const workspace = seed
        ? (await catalogue.context(inspectionId)).workspace
        : base;
      const selected =
        inspectionId === demo.inspectionId
          ? repository
          : new InspectionRepository(
              db,
              workspace,
              () => new Date().toISOString(),
              () => Crypto.randomUUID(),
            );
      const workflow = new WorkflowRepository(
        db,
        base.companyId,
        () => Crypto.randomUUID(),
        () => new Date().toISOString(),
      );
      if (seed) await workflow.seed();
      let mediaPromise: ReturnType<typeof nativeVault> | undefined;
      const publicSettings = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM local_secrets WHERE name='backend-public-settings'",
      );
      const savedPublic = publicSettings
        ? JSON.parse(publicSettings.value)
        : null;
      const releaseEnvironment=process.env.EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT;
      if(savedPublic&&['staging','production'].includes(releaseEnvironment??'')&&process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL&&savedPublic.url!==process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL)throw Error('This protected workspace belongs to a different environment. Use its original application; existing data and keys have not been changed.');
      let backendUrl =
        savedPublic?.url ?? process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL;
      let publicKey =
        savedPublic?.key ?? process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY;
      let connection: AuthConnection | undefined = options?.auth;
      const access = new BusinessAccess(db);
      return {
        business: new BusinessRepository(db, () => Crypto.randomUUID()),
        access,
        connection: () => {
          if (!backendUrl || !publicKey) return null;
          const config = backendConfig(backendUrl, publicKey);
          return (connection ??= new AuthConnection(
            config,
            new EncryptedSessionStorage(db, config.url),
            undefined,
            undefined,
            () => access.signOut(),
          ));
        },
        syncStore: (userId, companyId) => new SyncStore(db, userId, companyId),
        repository: selected,
        workflow,
        forInspection: async (id: string) => {
          const workspace = (await catalogue.context(id)).workspace;
          return {
            workspace,
            repository: new InspectionRepository(
              db,
              workspace,
              () => new Date().toISOString(),
              () => Crypto.randomUUID(),
            ),
          };
        },
        catalogue,
        workspace,
        media: () =>
          (mediaPromise ??= nativeVault(db, base.companyId, profile).catch(
            (error) => {
              mediaPromise = undefined;
              throw error;
            },
          )),
        configureBackend: async (url, key) => {
          const config = backendConfig(url, key);
          const binding = await db.getFirstAsync<{ origin: string }>(
            "SELECT origin FROM business_binding",
          );
          if (binding && binding.origin !== config.url)
            throw Error(
              "This workspace is bound to another backend. Existing work is protected.",
            );
          await db.runAsync(
            "INSERT INTO local_secrets VALUES('backend-public-settings',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",
            JSON.stringify(config),
          );
          connection?.lock();
          connection = undefined;
          backendUrl = config.url;
          publicKey = config.key;
        },
        openCompany: async (sourceAuth, company, name) => {
          await openFreshCompany({db},sourceAuth,company,name,()=>Crypto.randomUUID(),async targetProfile=>{
            const next=await openDemoWorkspace(demo.inspectionId,{profile:targetProfile,empty:true,fresh:{auth:sourceAuth,company,name}});
            return {...next,activate:async()=>{
              await SecureStore.setItemAsync('cleanproof.parent-profile.'+targetProfile,profile);
              await SecureStore.setItemAsync('cleanproof.active-profile',targetProfile,{keychainAccessible:SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY});
            }};
          });
        },
        createDemo: async () => {
          if (process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS !== "1")
            throw Error("Development demo tools are disabled.");
          const nextProfile = Crypto.randomUUID(),
            next = await openDemoWorkspace(demo.inspectionId, {
              profile: nextProfile,
              seed: true,
            });
          try {
            await seedSynthetic(next);
            await SecureStore.setItemAsync(
              "cleanproof.parent-profile." + nextProfile,
              profile,
            );
            await SecureStore.setItemAsync(
              "cleanproof.active-profile",
              nextProfile,
            );
          } finally {
            await next.close();
          }
        },
        returnProtected: async () => {
          const previous = await SecureStore.getItemAsync(
            "cleanproof.parent-profile." + profile,
          );
          if (!previous)
            throw Error("No previous protected workspace is recorded.");
          clearTransient();
          await SecureStore.setItemAsync("cleanproof.active-profile", previous);
        },
        isolate: async (auth, review) => {
          clearTransient();
          await isolateAuthorised(
            new BusinessRepository(db, () => Crypto.randomUUID()),
            access,
            auth,
            review,
            async () => {
              const nextProfile = Crypto.randomUUID(),
                next = await openDemoWorkspace(demo.inspectionId, {
                  profile: nextProfile,
                  empty: true,
              companyHint: (await db.getFirstAsync<{local_company:string}>('SELECT local_company FROM business_binding'))!.local_company,
              publicConfig: auth.config,
                });
              await next.configureBackend?.(auth.config.url, auth.config.key);
              const targetAuth = next.connection();
              if (!targetAuth) {
                await next.close();
                throw Error("Backend configuration required.");
              }
              await new EncryptedSessionStorage(
                next.business.db,
                auth.config.url,
              ).save(auth.session()!);
              await targetAuth.restore();
              return {
                business: next.business,
                access: next.access,
                auth: targetAuth,
                vault: (await next.media()).vault,
                activate: async () => {
                  await SecureStore.setItemAsync(
                    "cleanproof.parent-profile." + nextProfile,
                    profile,
                  );
                  await SecureStore.setItemAsync(
                    "cleanproof.active-profile",
                    nextProfile,
                    {
                      keychainAccessible:
                        SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
                    },
                  );
                },
                close: () => next.close(),
              };
            },
          );
        },
        close: async () => { if(!options?.auth)connection?.retire(); await db.close(); },
      };
    } catch (error) {
      await raw.closeAsync();
      throw error;
    }
  });
}
export function storageErrorMessage(error: unknown): string {
  if (error instanceof StorageGateError) {
    switch (error.code) {
      case "NO_CIPHER":
        return "Encrypted storage is unavailable in this build. Use a rebuilt development client with SQLCipher. Expo Go cannot open encrypted customer work. No inspection data was written.";
      case "MISSING_KEY":
        return "An existing database has no accessible encryption key. Your files have been preserved. Do not uninstall or reset the app; ask the developer to investigate.";
      case "INVALID_KEY":
        return "The stored encryption key is invalid. Existing files have been preserved. Ask the developer to investigate.";
      case "LOCKED_OR_CORRUPT":
        return "The database could not be unlocked. Existing files have been preserved; no automatic reset or replacement was attempted.";
      case "DEVICE_LOCK_REQUIRED":
        return "Set a device passcode or screen lock before using CleanProof, then retry.";
      case "STORAGE_UNAVAILABLE":
        return "Encrypted local storage requires a compatible Android or iOS build.";
    }
  }
  return "Local storage could not open safely. Existing files have been preserved. Unlock the device and retry; if this continues, ask the developer to investigate.";
}
