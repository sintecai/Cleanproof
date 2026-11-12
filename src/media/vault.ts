import type {
  TransactionalDatabase,
  Connection,
} from "../storage/contracts.ts";
import { SerialQueue } from "../storage/contracts.ts";
export type Asset = {
  id: string;
  company_id: string;
  inspection_id: string;
  item_id: string | null;
  kind: "photo" | "pdf";
  action_id?: string | null;
  caption: string;
  state:
    | "writing"
    | "ready"
    | "deleting"
    | "deleted"
    | "interrupted"
    | "missing";
  bytes: number;
  hash: string;
  created_at: string;
};
export interface VaultFiles {
  write(name: string, bytes: Uint8Array): Promise<void>;
  read(name: string): Promise<Uint8Array>;
  move(from: string, to: string): Promise<void>;
  remove(name: string): Promise<void>;
  exists(name: string): boolean;
  list(): string[];
}
export interface VaultCrypto {
  seal(bytes: Uint8Array, context: string): Promise<Uint8Array>;
  open(bytes: Uint8Array, context: string): Promise<Uint8Array>;
  hash(bytes: Uint8Array): Promise<string>;
}
const name = (id: string) => `${id}.sealed`;
export const assetContext = (a: Asset) =>
  JSON.stringify([
    "cleanproof-media-v1",
    a.id,
    a.company_id,
    a.inspection_id,
    a.item_id,
    a.kind,
  ]);
export class MediaVault {
  private queue = new SerialQueue();
  constructor(
    private db: TransactionalDatabase,
    private files: VaultFiles,
    private crypto: VaultCrypto,
    private company: string,
    private id: () => string,
    private now: () => string,
  ) {}
  list(inspection: string) {
    return this.db.getAllAsync<Asset>(
      "SELECT * FROM media_journal WHERE company_id=? AND inspection_id=? AND state!='deleted' ORDER BY created_at",
      this.company,
      inspection,
    );
  }
  private async event(tx: Connection, a: Asset, kind: string) {
    await tx.runAsync(
      "INSERT INTO local_events VALUES(?,?,?,?,?,?)",
      this.id(),
      this.company,
      a.id,
      kind,
      JSON.stringify(a),
      this.now(),
    );
  }
  async add(
    inspection: string,
    item: string | null,
    kind: "photo" | "pdf",
    caption: string,
    bytes: Uint8Array,
    actionId: string | null = null,
  ) {
    return this.queue.run(async () => {
      if (
        caption.length > 300 ||
        !bytes.length ||
        bytes.length > (kind === "photo" ? 1_000_000 : 10_000_000)
      )
        throw Error("Attachment exceeds the local limit.");
      if (
        kind === "photo" &&
        (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
      )
        throw Error("Expected a normalised JPEG.");
      if (
        kind === "pdf" &&
        String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-"
      )
        throw Error("Expected a PDF.");
      const a: Asset = {
        id: this.id(),
        company_id: this.company,
        inspection_id: inspection,
        item_id: item,
        kind,
        action_id: actionId,
        caption,
        state: "writing",
        bytes: bytes.length,
        hash: await this.crypto.hash(bytes),
        created_at: this.now(),
      };
      await this.db.transaction(async (tx) => {
        const parent = await tx.getFirstAsync<{ payload_json: string }>(
          "SELECT payload_json FROM inspection_drafts WHERE company_id=? AND id=?",
          this.company,
          inspection,
        );
        if (!parent) throw Error("Inspection unavailable");
        if (
          kind === "photo" &&
          (!item ||
            !Object.hasOwn(JSON.parse(parent.payload_json).responses, item))
        )
          throw Error("Unknown checklist item");
        if (actionId) {
          const action = await tx.getFirstAsync(
            "SELECT id FROM corrective_actions WHERE company_id=? AND id=? AND inspection_id=? AND item_id=? AND status='open'",
            this.company,
            actionId,
            inspection,
            item,
          );
          if (!action || kind !== "photo")
            throw Error(
              "Action evidence must belong to an open action on this item.",
            );
        } else if (
          kind === "photo" &&
          (await tx.getFirstAsync(
            "SELECT inspection_id FROM inspection_lifecycle WHERE company_id=? AND inspection_id=? AND status='completed'",
            this.company,
            inspection,
          ))
        )
          throw Error(
            "Completed inspection evidence is read only. Create a correction.",
          );
        const n = await tx.getFirstAsync<{ n: number }>(
          "SELECT COUNT(*) n FROM media_journal WHERE company_id=? AND inspection_id=? AND kind='photo' AND state!='deleted'",
          this.company,
          inspection,
        );
        if (kind === "photo" && (n?.n ?? 0) >= 20)
          throw Error("Maximum twenty photos per inspection.");
        await tx.runAsync(
          "INSERT INTO media_journal(id,company_id,inspection_id,item_id,kind,caption,state,bytes,hash,created_at,action_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          a.id,
          this.company,
          inspection,
          item,
          kind,
          caption,
          a.state,
          a.bytes,
          a.hash,
          a.created_at,
          actionId,
        );
      });
      try {
        const sealed = await this.crypto.seal(bytes, assetContext(a));
        await this.files.write(`${a.id}.part`, sealed);
        const check = await this.crypto.open(
          await this.files.read(`${a.id}.part`),
          assetContext(a),
        );
        if ((await this.crypto.hash(check)) !== a.hash)
          throw Error("Attachment verification failed");
        await this.files.move(`${a.id}.part`, name(a.id));
        await this.ready(a);
        return { ...a, state: "ready" as const };
      } catch (error) {
        await this.db
          .runAsync(
            "UPDATE media_journal SET state='interrupted' WHERE company_id=? AND id=? AND state='writing'",
            this.company,
            a.id,
          )
          .catch(() => undefined);
        throw error;
      }
    });
  }
  private async ready(a: Asset) {
    await this.db.transaction(async (tx) => {
      const r = await tx.runAsync(
        "UPDATE media_journal SET state='ready' WHERE company_id=? AND id=? AND state IN ('writing','interrupted','missing')",
        this.company,
        a.id,
      );
      if (r.changes !== 1) throw Error("Asset state changed");
      await this.event(tx, { ...a, state: "ready" }, "asset_ready_v1");
    });
  }
  private async get(id: string) {
    const a = await this.db.getFirstAsync<Asset>(
      "SELECT * FROM media_journal WHERE company_id=? AND id=?",
      this.company,
      id,
    );
    if (!a) throw Error("Asset unavailable");
    return a;
  }
  private async verified(a: Asset) {
    const bytes = await this.crypto.open(
      await this.files.read(name(a.id)),
      assetContext(a),
    );
    if (bytes.length !== a.bytes || (await this.crypto.hash(bytes)) !== a.hash)
      throw Error("Asset integrity check failed");
    return bytes;
  }
  read(id: string) {
    return this.queue.run(async () => {
      const a = await this.get(id);
      if (a.state !== "ready") throw Error("Attachment needs recovery");
      try {
        return await this.verified(a);
      } catch (error) {
        await this.db.runAsync(
          "UPDATE media_journal SET state='missing' WHERE company_id=? AND id=?",
          this.company,
          id,
        );
        throw error;
      }
    });
  }
  /** No device key leaves the device: downloaded verified bytes use original AAD and this vault's key. */
  importVerified(id:string,bytes:Uint8Array){return this.queue.run(async()=>{
    const a=await this.get(id);if(a.kind!=='photo'||!['ready','missing','interrupted'].includes(a.state)||a.bytes!==bytes.length||await this.crypto.hash(bytes)!==a.hash)throw Error('Downloaded evidence failed integrity checks.');
    if(a.state==='ready'){await this.verified(a);return;}
    if(this.files.exists(name(id))){try{await this.verified(a);await this.db.runAsync("UPDATE media_journal SET state='ready' WHERE company_id=? AND id=?",this.company,id);return;}catch{throw Error('Existing sealed evidence differs. Preserve it for recovery review.');}}
    const part=`${id}.part`;if(this.files.exists(part))await this.files.remove(part);
    try{await this.files.write(part,await this.crypto.seal(bytes,assetContext(a)));const check=await this.crypto.open(await this.files.read(part),assetContext(a));if(check.length!==a.bytes||await this.crypto.hash(check)!==a.hash)throw Error('Local re-encryption failed.');await this.files.move(part,name(id));await this.db.runAsync("UPDATE media_journal SET state='ready' WHERE company_id=? AND id=? AND state IN ('missing','interrupted')",this.company,id);}catch(e){await this.db.runAsync("UPDATE media_journal SET state='interrupted' WHERE company_id=? AND id=? AND state!='ready'",this.company,id).catch(()=>undefined);throw e;}
  });}
  recover(id: string) {
    return this.queue.run(async () => {
      const a = await this.get(id);
      if (!["interrupted", "missing"].includes(a.state))
        throw Error("Not recoverable");
      if (!this.files.exists(name(id)) && this.files.exists(`${id}.part`)) {
        const bytes = await this.crypto.open(
          await this.files.read(`${id}.part`),
          assetContext(a),
        );
        if (
          (await this.crypto.hash(bytes)) !== a.hash ||
          bytes.length !== a.bytes
        )
          throw Error("Partial attachment could not be verified");
        await this.files.move(`${id}.part`, name(id));
      }
      await this.verified(a);
      await this.ready(a);
    });
  }
  remove(id: string) {
    return this.queue.run(async () => {
      const a = await this.get(id);
      if (a.state === "deleted") return;
      await this.db.transaction(async (tx) => {
        if (a.kind === "photo") {
          const historical = a.action_id
            ? await tx.getFirstAsync(
                "SELECT h.id FROM action_history h, json_each(h.snapshot_json,'$.evidence') e WHERE h.company_id=? AND h.action_id=? AND h.event='resolved' AND json_extract(e.value,'$.id')=?",
                this.company,
                a.action_id,
                a.id,
              )
            : null;
          const frozen = a.action_id
            ? (historical ??
              (await tx.getFirstAsync(
                "SELECT id FROM corrective_actions WHERE company_id=? AND id=? AND status='resolved'",
                this.company,
                a.action_id,
              )))
            : await tx.getFirstAsync(
                "SELECT inspection_id FROM inspection_lifecycle WHERE company_id=? AND inspection_id=? AND status='completed'",
                this.company,
                a.inspection_id,
              );
          if (frozen)
            throw Error(
              "This evidence is part of completed history and cannot be deleted.",
            );
        }
        await tx.runAsync(
          "UPDATE media_journal SET state='deleting' WHERE company_id=? AND id=?",
          this.company,
          id,
        );
        await this.event(tx, { ...a, state: "deleting" }, "asset_deleted_v1");
      });
      await this.finishDelete(id);
    });
  }
  private async finishDelete(id: string) {
    await this.files.remove(name(id));
    await this.files.remove(`${id}.part`);
    await this.db.runAsync(
      "UPDATE media_journal SET state='deleted' WHERE company_id=? AND id=? AND state='deleting'",
      this.company,
      id,
    );
  }
  reconcile() {
    return this.queue.run(async () => {
      const rows = await this.db.getAllAsync<Asset>(
        "SELECT * FROM media_journal WHERE company_id=?",
        this.company,
      );
      for (const a of rows) {
        if (a.state === "deleting") await this.finishDelete(a.id);
        else if (a.state === "writing")
          await this.db.runAsync(
            "UPDATE media_journal SET state='interrupted' WHERE id=? AND company_id=?",
            a.id,
            this.company,
          );
        else if (a.state === "ready" && !this.files.exists(name(a.id)))
          await this.db.runAsync(
            "UPDATE media_journal SET state='missing' WHERE id=? AND company_id=?",
            a.id,
            this.company,
          );
      }
      const known = new Set(rows.flatMap((a) => [name(a.id), `${a.id}.part`]));
      return this.files.list().filter((n) => !known.has(n));
    });
  }
}
