import {selectedCompanyRequiresSnapshot} from './selectedWorkspace';
import { initialiseFreshCompany, openFreshCompany } from "../application/freshCompany";
import { seedSynthetic } from "../development/seed";
import { isolateAuthorised } from "../sync/business/isolation";
import {
  BrowserDatabase,
  browserRecord,
  getBrowserAccount,
  getBrowserConnection,
  setBrowserAccount,
  browserActiveKey,
  getBrowserPassphrase,
  getBrowserBackend,
} from "./browserDatabase";
import type { WorkspaceHandle } from "./expoWorkspace";
import { migrate } from "./migrations";
import { canonical } from "../sync/protocol";
import { demo } from "../domain/inspection";
import { InspectionRepository } from "./inspectionRepository";
import { Catalogue } from "./catalogue";
import { WorkflowRepository } from "./workflowRepository";
import { BusinessRepository } from "../sync/business/repository";
import { BusinessAccess } from "../sync/business/access";
import { SyncStore } from "../sync/store";
import {
  AuthConnection,
  EncryptedSessionStorage,
  backendConfig,
} from "../auth/session";
import { nativeVault, clearTransient } from "../media/nativeMedia.web";
export async function openDemoWorkspace(
  _inspection = demo.inspectionId,
  options?: { profile: string; empty?: boolean; seed?: boolean; companyHint?: string; publicConfig?: {url:string;key:string}; fresh?: {auth:AuthConnection;company:string;name:string} },
): Promise<WorkspaceHandle> {
  const incomingAccount=getBrowserAccount(),customerAuth=incomingAccount?getBrowserConnection():null,initialBackend=getBrowserBackend(),activeKey=browserActiveKey();
  const profile =
    options?.profile ??
    localStorage.getItem(browserActiveKey()) ??
    "interactive";
  if (!/^(interactive|[a-f0-9-]{36})$/.test(profile))
    throw Error("Invalid browser workspace selection");
  const seed = options?.seed ?? ((profile === "interactive" || process.env.EXPO_PUBLIC_CLEANPROOF_SHOWCASE === "1") && process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS === "1" && !options?.empty);
  // A selected company workspace must already exist. Never silently create an
  // empty database if that encrypted snapshot was removed or became unavailable.
  let requireExisting=false;
  if(incomingAccount && !options?.profile && localStorage.getItem(activeKey)){
    if(!initialBackend)throw Error('Account configuration is unavailable. Your encrypted work remains protected.');
    const device=await browserRecord('account-device-v1',initialBackend.url+':'+incomingAccount.user.id);
    if(!device?.profile)throw Error('The account device key is unavailable. Existing work is preserved.');
    requireExisting=selectedCompanyRequiresSnapshot(profile,device.profile);
  }
  const db = await BrowserDatabase.open(getBrowserPassphrase(), profile, requireExisting),
    id = () => crypto.randomUUID(),
    now = () => new Date().toISOString();
  try {
  customerAuth?.assertActive();
  await migrate(db);
  if(incomingAccount && !options?.fresh){
    const existingBinding=await db.getFirstAsync<{user_id:string;origin:string}>('SELECT user_id,origin FROM business_binding');
    const publicBackend=initialBackend;
    if(!publicBackend || (existingBinding && (existingBinding.user_id!==incomingAccount.user.id || existingBinding.origin!==publicBackend.url))) throw Error('This workspace belongs to another account. Local work is preserved.');
    await new EncryptedSessionStorage(db,publicBackend.url).save(incomingAccount);
  }
  if(options?.fresh) await initialiseFreshCompany(db,options.fresh.auth,options.fresh.company,options.fresh.name,id,now);
  const binding=await db.getFirstAsync<{local_company:string}>('SELECT local_company FROM business_binding');
  const localCompany=binding?.local_company ?? options?.companyHint ?? demo.companyId;
      const base= localCompany!==demo.companyId ? {...demo,companyId:localCompany,companyName:'',siteId:localCompany,siteName:'',inspectionId:localCompany,templateVersionId:localCompany,templateName:'',items:[]} : demo;
      if(options?.publicConfig){
        const config=backendConfig(options.publicConfig.url,options.publicConfig.key);
        const previous=await db.getFirstAsync<{origin:string}>('SELECT origin FROM business_binding');
        if(previous&&previous.origin!==config.url)throw Error('Workspace belongs to another backend.');
        await db.runAsync("INSERT INTO local_secrets VALUES('backend-public-settings',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",JSON.stringify(config));
      }
  const repository = new InspectionRepository(db, base, now, id);
  if (seed) await repository.initialise();
  else await migrate(db);
  const catalogue = new Catalogue(db, base.companyId, id, now);
  if (seed) await catalogue.seed();
  const workflow = new WorkflowRepository(db, base.companyId, id, now);
  if (seed) await workflow.seed();
  const access = new BusinessAccess(db);
  let auth: AuthConnection | undefined;
  let media: ReturnType<typeof nativeVault> | undefined;
  customerAuth?.assertActive();
  return {
    workspace: base,
    repository,
    catalogue,
    workflow,
    access,
    business: new BusinessRepository(db, id),
    connection: () => {
      // Customer workflows must use the same refresh owner and protected session store as entry.
      if(incomingAccount){if(!customerAuth)throw Error("Account connection unavailable. Saved work is protected.");return customerAuth;}
      if (!getBrowserAccount() && process.env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY === "1") return null;
      const publicConfig = initialBackend;
      const url =
          publicConfig?.url ?? process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL,
        key =
          publicConfig?.key ?? process.env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY;
      if (!url || !key) return null;
      return (auth ??= new AuthConnection(
        backendConfig(url, key),
        {
          load:()=>new EncryptedSessionStorage(db,url).load(),
          save:async session=>{await new EncryptedSessionStorage(db,url).save(session);if(getBrowserAccount()?.user.id===session.user.id)setBrowserAccount(session);},
          clear:()=>new EncryptedSessionStorage(db,url).clear(),
        },
        undefined,
        undefined,
        () => access.signOut(),
      ));
    },
    syncStore: (user, c) => new SyncStore(db, user, c),
    forInspection: async (inspection) => {
      const workspace = (await catalogue.context(inspection)).workspace;
      return {
        workspace,
        repository: new InspectionRepository(db, workspace, now, id),
      };
    },
    media: () => (media ??= nativeVault(db, base.companyId)),
    openCompany: async (sourceAuth, company, name) => {
      await openFreshCompany({db}, sourceAuth, company, name, id, async targetProfile=>{
        const next=await openDemoWorkspace(demo.inspectionId,{profile:targetProfile,empty:true,fresh:{auth:sourceAuth,company,name}});
        return {...next,activate:async()=>{
          localStorage.setItem('cleanproof.preview.parent.'+targetProfile,profile);
          clearTransient();localStorage.setItem(activeKey,targetProfile);
        }};
      });
    },
    createDemo: async () => {
      if (process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS !== "1")
        throw Error("Demo tools disabled");
      const nextProfile = id(),
        next = await openDemoWorkspace(demo.inspectionId, {
          profile: nextProfile,
          seed: true,
        });
      try {
        await seedSynthetic(next);
        localStorage.setItem(
          "cleanproof.preview.parent." + nextProfile,
          profile,
        );
        clearTransient();
        localStorage.setItem(activeKey, nextProfile);
      } finally {
        await next.close();
      }
    },
    returnProtected: async () => {
      const previous = localStorage.getItem(
        "cleanproof.preview.parent." + profile,
      );
      if (!previous)
        throw Error("No previous protected workspace is recorded.");
      clearTransient();
      localStorage.setItem(activeKey, previous);
    },
    isolate: async (sourceAuth, review) => {
      await isolateAuthorised(
        new BusinessRepository(db, id),
        access,
        sourceAuth,
        review,
        async () => {
          const nextProfile = id(),
            next = await openDemoWorkspace(demo.inspectionId, {
              profile: nextProfile,
              empty: true,
              companyHint: (await db.getFirstAsync<{local_company:string}>('SELECT local_company FROM business_binding'))!.local_company,
              publicConfig: sourceAuth.config,
            }),
            targetAuth = next.connection();
          if (!targetAuth) {
            await next.close();
            throw Error("Backend configuration required");
          }
          await new EncryptedSessionStorage(
            next.business.db,
            sourceAuth.config.url,
          ).save(sourceAuth.session()!);
          await targetAuth.restore();
          return {
            business: next.business,
            access: next.access,
            auth: targetAuth,
            vault: (await next.media()).vault,
            activate: async () => {
              localStorage.setItem(
                "cleanproof.preview.parent." + nextProfile,
                profile,
              );
              clearTransient();
              localStorage.setItem(activeKey, nextProfile);
            },
            close: () => next.close(),
          };
        },
      );
    },
    close: () => db.close(),
  };
  } catch(error) { await db.close(); throw error; }
}
export function storageErrorMessage(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Browser storage unavailable. Existing encrypted work is preserved.";
}
