import { BusinessAccess } from "./access.ts";
import { BusinessRepository } from "./repository.ts";
import { photos, type Batch, type Receipt, type RecordData } from "./model.ts";
import type { MediaVault } from "../../media/vault.ts";
import { AuthConnection } from "../../auth/session.ts";
export interface Transport {
  authorise(company: string, user: string): Promise<void>;
  register(company: string, local: string): Promise<string>;
  stage(b: Batch): Promise<Receipt | void>;
  intent(
    company: string,
    batch: string,
    asset: string,
  ): Promise<{ id: string; hash: string; bytes: number; ready: boolean }>;
  upload(
    intent: string,
    b: Uint8Array,
  ): Promise<{ ready: boolean; hash: string; bytes: number }>;
  commit(company: string, batch: string): Promise<Receipt>;
  pull(
    company: string,
    cursor: number,
    epoch: number | null,
  ): Promise<{
    protocol: number;
    scopeChanged: boolean;
    records: RecordData[];
    cursor: number;
    head: number;
    epoch: number;
  }>;
  download(company: string, asset: string): Promise<Uint8Array>;
}
export class BusinessEngine {
  private running: Promise<void> | null = null;
  constructor(
    private local: BusinessRepository,
    private vault: MediaVault,
    private remote: Transport,
  ) {}
  run() {
    return (this.running ??= this.perform().finally(() => {
      this.running = null;
    }));
  }
  private async perform() {
    const b = await this.local.binding();
    if (!b) throw Error("Review and adopt first.");
    await this.remote.authorise(b.company, b.user_id);
    // Fresh owner workspaces are already locally bound by onboarding, so they
    // do not pass through adoption's registration step. Register idempotently
    // before staging; the server rejects a different existing identity mapping.
    const registered=await this.remote.register(b.company,b.local_company);
    if(registered!==b.local_company)throw Error('The server workspace identity differs. Review mapping before syncing; saved work is preserved.');
    const prior = await this.local.cursor();
    if (prior.epoch !== null) {
      const probe = await this.remote.pull(
        b.company,
        prior.cursor,
        prior.epoch,
      );
      if (probe.scopeChanged) {
        await new BusinessAccess(this.local.db).quarantine("scope-changed");
        throw Error(
          "Access scope changed. Saved work is locked for an explicit recovery review.",
        );
      }
    }
    await this.vault.reconcile();
    await this.downloadMissing();
    let drained = false;
    for (let batchNumber = 0; batchNumber < 20; batchNumber++) {
      const batch = b.receive_seed ? null : await this.local.prepare();
      if (!batch) {
        drained = true;
        break;
      }
      {
        const existing = await this.remote.stage(batch);
        if (existing && ["accepted", "conflict"].includes(existing.status)) {
          await this.local.acknowledge(batch, existing);
          if (existing.status === "conflict")
            throw Error(
              "Conflict requires review. Both versions are preserved.",
            );
          continue;
        }
        for (const r of batch.records)
          for (const a of photos(r).filter((a) => a.state === "ready")) {
            const intent = await this.remote.intent(
              batch.company,
              batch.id,
              a.id,
            );
            if (intent.hash !== a.hash || intent.bytes !== a.bytes)
              throw Error("Upload intent differs from saved evidence.");
            const bytes = await this.vault.read(a.id);
            if (!intent.ready) {
              const ack = await this.remote.upload(intent.id, bytes);
              if (!ack.ready || ack.hash !== a.hash || ack.bytes !== a.bytes)
                throw Error("Photo upload was not acknowledged.");
            }
          }
        const receipt = await this.remote.commit(batch.company, batch.id);
        await this.local.acknowledge(batch, receipt);
        if (receipt.status === "conflict")
          throw Error("Conflict requires review. Both versions are preserved.");
      }
    }
    if (!drained)
      throw Error(
        "Partial sync saved. More work remains; retry to continue from the last acknowledged batch.",
      );
    for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
      const cursor = await this.local.downloadCursor(),
        page = await this.remote.pull(b.company, cursor.cursor, cursor.epoch);
      if (page.scopeChanged) {
        await new BusinessAccess(this.local.db).quarantine("scope-changed");
        throw Error(
          "Access scope changed. Revalidate and review a fresh authorised workspace. Saved work is preserved.",
        );
      }
      if (page.protocol !== 2) throw Error("App/server sync protocol differs.");
      await this.local.stagePage(page);
      if (page.cursor === page.head) {
        await this.local.publishIncoming();
        await this.vault.reconcile();
        await this.downloadMissing();
        return;
      }
    }
    throw Error(
      "More incoming work remains. Retry to resume the saved download.",
    );
  }

  private async downloadMissing() {
    const b = (await this.local.binding())!;
    const rows = await this.local.db.getAllAsync<{ id: string }>(
      "SELECT id FROM media_journal WHERE company_id=? AND kind='photo' AND state IN ('missing','interrupted')",
      b.local_company,
    );
    for (const a of rows)
      await this.vault.importVerified(
        a.id,
        await this.remote.download(b.company, a.id),
      );
  }
}
export function transport(auth: AuthConnection): Transport {
  const transfer = async (
    method: "GET" | "POST",
    query: string,
    bytes?: Uint8Array,
  ) => {
    const controller = new AbortController();
    const untrack=auth.trackRequest(controller);
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const r = await fetch(
        auth.config.url + "/functions/v1/photo-transfer?" + query,
        {
          method,
          headers: {
            apikey: auth.config.key,
            Authorization: "Bearer " + (await auth.token()),
            ...(bytes ? { "Content-Type": "image/jpeg" } : {}),
          },
          ...(bytes ? { body: bytes.slice().buffer } : {}),
          signal: controller.signal,
        },
      );
      auth.assertActive();
      if (!r.ok)
        throw Error(
          "Photo transfer failed. Saved evidence is preserved; reconnect and retry.",
        );
      return method === "GET"
        ? new Uint8Array(await r.arrayBuffer())
        : r.json();
    } finally {
      clearTimeout(timeout);untrack();
    }
  };
  return {
    async authorise(company, user) {
      const rows = await auth.memberships();
      if (
        auth.session()?.user.id !== user ||
        !rows.some((m) => m.company_id === company && m.active)
      )
        throw Error("Company membership is unavailable.");
    },
    register: (c, lc) => auth.rpc("cp_sync_register", { c, lc }),
    stage: async (batch) => {
      const result = await auth.rpc("cp_sync_stage", { batch });
      return result?.id ? (result as Receipt) : undefined;
    },
    intent: (c, batch, asset) =>
      auth.rpc("cp_photo_intent", { c, batch, asset }),
    upload: (intent, b) =>
      transfer("POST", "intent=" + encodeURIComponent(intent), b),
    commit: (c, batch) => auth.rpc("cp_sync_commit", { c, batch }),
    pull: (c, after_cursor, known_epoch) =>
      auth.rpc("cp_sync_pull", { c, after_cursor, known_epoch }),
    download: (c, a) =>
      transfer(
        "GET",
        "company=" + encodeURIComponent(c) + "&asset=" + encodeURIComponent(a),
      ),
  };
}
