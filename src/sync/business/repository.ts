import type {
  Connection,
  TransactionalDatabase,
} from "../../storage/contracts.ts";
import { canonical } from "../protocol.ts";
import {
  tables,
  key,
  validate,
  immutable,
  photos,
  type Kind,
  type Row,
  type RecordData,
  type Source,
  type Batch,
  type Receipt,
} from "./model.ts";
export type Binding = {
  user_id: string;
  company: string;
  local_company: string;
  origin: string;
  role: "owner" | "inspector";
  receive_seed: number;
};
export const order: Kind[] = [
  "customer",
  "person",
  "branding",
  "template",
  "site",
  "inspection",
];
const columns: Record<string, string[]> = {
  customers: ["id", "company_id", "name", "contact", "archived"],
  local_people: ["id", "company_id", "name", "active"],
  company_settings: ["company_id", "name", "contact"],
  templates: ["id", "company_id", "name", "archived"],
  template_versions: [
    "id",
    "company_id",
    "template_id",
    "version",
    "name",
    "items_json",
  ],
  sites: [
    "id",
    "company_id",
    "customer_id",
    "name",
    "address",
    "timezone",
    "notes",
    "archived",
  ],
  inspection_drafts: [
    "id",
    "company_id",
    "site_id",
    "payload_json",
    "local_revision",
    "saved_at",
  ],
  inspection_context: [
    "inspection_id",
    "company_id",
    "workspace_json",
    "customer_name",
    "address",
    "timezone",
  ],
  inspection_lifecycle: [
    "inspection_id",
    "company_id",
    "status",
    "inspector",
    "completed_at",
    "snapshot_json",
    "correction_of",
    "correction_reason",
  ],
  corrective_actions: [
    "id",
    "company_id",
    "inspection_id",
    "item_id",
    "description",
    "owner_id",
    "owner_name",
    "due_date",
    "status",
    "resolution_note",
    "created_at",
    "updated_at",
    "resolved_at",
    "revision",
  ],
  action_history: [
    "id",
    "company_id",
    "action_id",
    "event",
    "snapshot_json",
    "created_at",
  ],
  media_journal: [
    "id",
    "company_id",
    "inspection_id",
    "item_id",
    "kind",
    "caption",
    "state",
    "bytes",
    "hash",
    "created_at",
    "action_id",
  ],
};
export class BusinessRepository {
  constructor(
    readonly db: TransactionalDatabase,
    private id: () => string,
    private now = () => new Date().toISOString(),
  ) {}
  binding() {
    return this.db.getFirstAsync<Binding>("SELECT * FROM business_binding");
  }
  async rows(tx: Connection, c: string) {
    const result: RecordData[] = [];
    for await (const record of this.iterate(tx, c)) result.push(record);
    return result;
  }
  async *iterate(tx: Connection, c: string): AsyncGenerator<RecordData> {
    for (const kind of order) {
      const list = tables[kind],
        first = list[0];
      let after = 0;
      for (;;) {
        const page = await tx.getAllAsync<Row>(
          `SELECT rowid AS __row,* FROM ${first} WHERE company_id=? AND rowid>? ORDER BY rowid LIMIT 40`,
          c,
          after,
        );
        if (!page.length) break;
        for (const original of page) {
          const { __row, ...row } = original;
          after = Number(__row);
          const id = String(row.id ?? row.company_id),
            data: Record<string, Row[]> = { [first]: [row] };
          for (const t of list.slice(1)) {
            if (t === "template_versions")
              data[t] = await tx.getAllAsync<Row>(
                "SELECT * FROM template_versions WHERE company_id=? AND template_id=? ORDER BY version,id",
                c,
                id,
              );
            else if (t === "action_history")
              data[t] = await tx.getAllAsync<Row>(
                "SELECT h.* FROM action_history h JOIN corrective_actions a ON a.id=h.action_id AND a.company_id=h.company_id WHERE a.company_id=? AND a.inspection_id=? ORDER BY h.created_at,h.id",
                c,
                id,
              );
            else
              data[t] = await tx.getAllAsync<Row>(
                `SELECT * FROM ${t} WHERE company_id=? AND inspection_id=? ORDER BY rowid`,
                c,
                id,
              );
          }
          if (kind === "inspection")
            data.media_journal = data
              .media_journal!.filter((a) => a.kind === "photo")
              .map((a) => ({
                ...a,
                state: ["deleting", "deleted"].includes(String(a.state))
                  ? "deleted"
                  : ["ready", "missing"].includes(String(a.state))
                    ? "ready"
                    : (a.state ?? "interrupted"),
              }));
          const v = await tx.getFirstAsync<{ revision: number }>(
            "SELECT revision FROM business_versions WHERE kind=? AND id=?",
            kind,
            id,
          );
          yield validate(
            {
              kind,
              id,
              siteId:
                kind === "site"
                  ? id
                  : kind === "inspection"
                    ? String(row.site_id)
                    : null,
              data,
              revision: v?.revision ?? 0,
            },
            c,
          );
        }
      }
    }
  }
  private async sources(tx: Connection, limit = 2147483647): Promise<Source[]> {
    const a = await tx.getAllAsync<Row>(
        "SELECT * FROM outbox WHERE NOT EXISTS(SELECT 1 FROM business_acks x WHERE x.kind='outbox' AND x.id=outbox.operation_id) ORDER BY rowid LIMIT ?",
        limit,
      ),
      b = await tx.getAllAsync<Row>(
        "SELECT * FROM local_events WHERE NOT EXISTS(SELECT 1 FROM business_acks x WHERE x.kind='event' AND x.id=local_events.id) ORDER BY rowid LIMIT ?",
        limit,
      );
    return [
      ...a.map((row) => ({
        kind: "outbox" as const,
        id: String(row.operation_id),
        row,
      })),
      ...b.map((row) => ({ kind: "event" as const, id: String(row.id), row })),
    ];
  }
  async review(company: string) {
    return this.db.transaction(async (tx) => ({
      company,
      records: await this.rows(tx, company),
      sources: await this.sources(tx),
    }));
  }
  async adopt(
    binding: Omit<Binding, "receive_seed">,
    review: string,
    receive = false,
  ) {
    await this.db.transaction(async (tx) => {
      const old = await tx.getFirstAsync<Binding>(
        "SELECT * FROM business_binding",
      );
      if (old) {
        if (
          old.user_id !== binding.user_id ||
          old.company !== binding.company ||
          old.origin !== binding.origin
        )
          throw Error(
            "This encrypted workspace is already bound to another identity/company. Unsent work has been preserved.",
          );
        return;
      }
      const actual = {
        company: binding.local_company,
        records: await this.rows(tx, binding.local_company),
        sources: await this.sources(tx),
      };
      if (canonical(actual) !== review)
        throw Error("Work changed since adoption review. Review again.");
      if (receive && actual.sources.length)
        throw Error("Receive mode requires no pending original work.");
      await tx.runAsync(
        "INSERT INTO business_binding VALUES(1,?,?,?,?,?,?,?)",
        binding.user_id,
        binding.company,
        binding.local_company,
        binding.origin,
        binding.role,
        receive ? 1 : 0,
        this.now(),
      );
      for (const r of actual.records)
        await tx.runAsync(
          "INSERT INTO business_identity VALUES(?,?,?,?)",
          r.kind,
          r.id,
          binding.company,
          r.id,
        );
    });
  }
  async prepare() {
    return this.db.transaction(async (tx) => {
      const b = await tx.getFirstAsync<Binding>(
        "SELECT * FROM business_binding",
      );
      if (!b) throw Error("Review and adopt this workspace first.");
      const pending = await tx.getFirstAsync<{ request_json: string }>(
        "SELECT request_json FROM business_batches WHERE state='pending' ORDER BY rowid LIMIT 1",
      );
      if (pending) return JSON.parse(pending.request_json) as Batch;
      if (
        await tx.getFirstAsync(
          "SELECT b.id FROM business_batches b WHERE b.state='conflict' AND NOT EXISTS(SELECT 1 FROM business_decisions d WHERE d.batch_id=b.id)",
        )
      )
        throw Error("Conflict requires review.");
      if (b.receive_seed) return null;
      const records: RecordData[] = [];
      let payloadBytes = 0;
      for await (const r of this.iterate(tx, b.local_company)) {
        const v = await tx.getFirstAsync<{ data_json: string }>(
          "SELECT data_json FROM business_versions WHERE kind=? AND id=?",
          r.kind,
          r.id,
        );
        if (!v || v.data_json !== canonical(r.data)) {
          const size = new TextEncoder().encode(canonical(r)).length;
          if (size > 7000000)
            throw Error(
              "One inspection exceeds the safe transfer limit. Work is preserved; ask the developer to review its history.",
            );
          if (records.length >= 40 || payloadBytes + size > 7000000) break;
          records.push(r);
          payloadBytes += size;
        }
      }
      // Publish parent-first aggregate state before delivering the exact audit rows.
      // A receipt never acknowledges a source row omitted from this durable batch.
      const sources: Source[] = [];
      if (!records.length)
        for (const source of await this.sources(tx, 100)) {
          const size = new TextEncoder().encode(canonical(source)).length;
          if (size > 7000000)
            throw Error(
              "One original operation exceeds the safe transfer limit. Its bytes remain protected.",
            );
          if (sources.length >= 100 || payloadBytes + size > 7000000) break;
          sources.push(source);
          payloadBytes += size;
        }
      if (!records.length && !sources.length) return null;
      if (
        b.role === "inspector" &&
        records.some((r) => r.kind !== "inspection")
      )
        throw Error(
          "Catalogue changes require an owner. Your work is preserved.",
        );
      const request: Batch = {
        protocol: 2,
        id: this.id(),
        company: b.company,
        localCompany: b.local_company,
        records,
        sources,
      };
      await tx.runAsync(
        "INSERT INTO business_batches VALUES(?,?,'pending',NULL,'')",
        request.id,
        canonical(request),
      );
      return request;
    });
  }
  async acknowledge(batch: Batch, receipt: Receipt) {
    if (
      receipt.id !== batch.id ||
      !["accepted", "conflict"].includes(receipt.status)
    )
      throw Error("No matching server receipt.");
    await this.db.transaction(async (tx) => {
      const saved = await tx.getFirstAsync<{
        request_json: string;
        state: string;
      }>("SELECT * FROM business_batches WHERE id=?", batch.id);
      if (!saved || saved.request_json !== canonical(batch))
        throw Error("Acknowledgement differs from durable request.");
      if (saved.state !== "pending") return;
      if (receipt.status === "accepted") {
        for (const r of batch.records) {
          const v = receipt.records.find((x) => key(x) === key(r));
          if (
            !v ||
            v.revision !== r.revision + 1 ||
            canonical(v.data) !== canonical(r.data)
          )
            throw Error("Server receipt contents differ.");
          await this.version(tx, v);
        }
        for (const source of batch.sources)
          await tx.runAsync(
            "INSERT INTO business_acks VALUES(?,?,?)",
            source.kind,
            source.id,
            batch.id,
          );
      }
      await tx.runAsync(
        "UPDATE business_batches SET state=?,receipt_json=?,error='' WHERE id=?",
        receipt.status,
        canonical(receipt),
        batch.id,
      );
    });
  }
  private async version(tx: Connection, r: RecordData) {
    await tx.runAsync(
      "INSERT INTO business_versions VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,data_json=excluded.data_json",
      r.kind,
      r.id,
      r.revision,
      canonical(r.data),
    );
  }
  async cursor() {
    return (await this.db.getFirstAsync<{
      cursor: number;
      epoch: number | null;
    }>("SELECT * FROM business_cursor"))!;
  }
  async downloadCursor() {
    return (
      (await this.db.getFirstAsync<{ cursor: number; epoch: number }>(
        "SELECT * FROM business_download",
      )) ?? (await this.cursor())
    );
  }
  async stagePage(page: {
    records: RecordData[];
    cursor: number;
    head: number;
    epoch: number;
  }) {
    const b = (await this.binding())!;
    await this.db.transaction(async (tx) => {
      const current =
        (await tx.getFirstAsync<{ cursor: number; epoch: number }>(
          "SELECT * FROM business_download",
        )) ??
        (await tx.getFirstAsync<{ cursor: number; epoch: number | null }>(
          "SELECT * FROM business_cursor",
        ));
      if (
        !current ||
        !Number.isSafeInteger(page.cursor) ||
        !Number.isSafeInteger(page.head) ||
        page.cursor < current.cursor ||
        page.cursor > page.head ||
        !Number.isSafeInteger(page.epoch) ||
        (current.epoch !== null && current.epoch !== page.epoch) ||
        page.records.length > 50
      )
        throw Error("Invalid/scope-changed download page.");
      for (const r of page.records) {
        validate(r, b.local_company);
        if (r.revision < 1) throw Error("Invalid incoming revision.");
        await tx.runAsync(
          "INSERT INTO business_incoming VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET record_json=excluded.record_json,revision=excluded.revision WHERE excluded.revision>=business_incoming.revision",
          r.kind,
          r.id,
          canonical(r),
          r.revision,
        );
      }
      await tx.runAsync(
        "INSERT INTO business_download VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET cursor=excluded.cursor,epoch=excluded.epoch",
        page.cursor,
        page.epoch,
      );
    });
  }
  async publishIncoming() {
    const cursor = await this.db.getFirstAsync<{
      cursor: number;
      epoch: number;
    }>("SELECT * FROM business_download");
    if (!cursor) return;
    const rows = await this.db.getAllAsync<{ record_json: string }>(
      "SELECT record_json FROM business_incoming",
    );
    await this.apply(
      rows.map((r) => JSON.parse(r.record_json)),
      cursor.cursor,
      cursor.epoch,
    );
    await this.db.transaction(async (tx) => {
      await tx.runAsync("DELETE FROM business_incoming");
      await tx.runAsync("DELETE FROM business_download");
    });
  }
  async apply(records: RecordData[], cursor: number, epoch: number) {
    await this.db.transaction(async (tx) => {
      const b = (await tx.getFirstAsync<Binding>(
          "SELECT * FROM business_binding",
        ))!,
        last = (await tx.getFirstAsync<{
          cursor: number;
          epoch: number | null;
        }>("SELECT * FROM business_cursor"))!;
      if (last.epoch !== null && last.epoch !== epoch)
        throw Error(
          "Scope changed. Revalidate access and review a fresh authorised workspace. Unsent work remains protected.",
        );
      if (!Number.isSafeInteger(cursor) || cursor < last.cursor)
        throw Error("Invalid incoming cursor.");
      for (const r of [...records].sort(
        (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
      ))
        await this.project(tx, r, b.local_company, !!b.receive_seed);
      await tx.runAsync(
        "UPDATE business_cursor SET cursor=?,epoch=?",
        cursor,
        epoch,
      );
      await tx.runAsync("UPDATE business_binding SET receive_seed=0");
    });
  }
  private async project(
    tx: Connection,
    r: RecordData,
    c: string,
    reviewed = false,
  ) {
    validate(r, c);
    if (r.revision < 1) throw Error("Invalid incoming revision.");
    const v = await tx.getFirstAsync<{ revision: number; data_json: string }>(
      "SELECT * FROM business_versions WHERE kind=? AND id=?",
      r.kind,
      r.id,
    );
    if (v && v.revision > r.revision)
      throw Error(
        "Conflict review is older than the saved server baseline. Refresh the review.",
      );
    if (v && v.revision === r.revision && !reviewed) return;
    const local = (await this.rows(tx, c)).find((x) => key(x) === key(r));
    if (local) {
      if (
        !reviewed &&
        ((v && canonical(local.data) !== v.data_json) ||
          (!v && canonical(local.data) !== canonical(r.data)))
      )
        throw Error(
          "Incoming work conflicts with acknowledged local changes; review required.",
        );
      immutable(local, r);
    }
    for (const t of tables[r.kind])
      for (const incoming of r.data[t]!) {
        const allowed = columns[t];
        if (!allowed || Object.keys(incoming).some((k) => !allowed.includes(k)))
          throw Error("Unsupported relational projection.");
        const pk =
            t === "company_settings"
              ? "company_id"
              : ["inspection_context", "inspection_lifecycle"].includes(t)
                ? "inspection_id"
                : "id",
          row = { ...incoming };
        const old = await tx.getFirstAsync<Row>(
          `SELECT * FROM ${t} WHERE ${pk}=?`,
          row[pk]!,
        );
        if (
          t === "media_journal" &&
          row.state === "deleted" &&
          old &&
          old.state !== "deleted"
        )
          row.state = "deleting";
        if (old && old.company_id !== row.company_id)
          throw Error("Existing local identity belongs to another company.");
        if (
          old &&
          ["media_journal", "corrective_actions"].includes(t) &&
          (old.inspection_id !== row.inspection_id ||
            old.item_id !== row.item_id)
        )
          throw Error("Existing local evidence/action scope differs.");
        if (
          old &&
          t === "media_journal" &&
          (old.hash !== row.hash ||
            old.kind !== row.kind ||
            old.action_id !== row.action_id)
        )
          throw Error("Existing evidence identity differs.");
        if (t === "media_journal" && row.state === "ready")
          row.state =
            old?.hash === row.hash && old?.state === "ready"
              ? "ready"
              : "missing";
        if (old && canonical(old) === canonical(row)) continue;
        if (old && ["template_versions", "action_history"].includes(t))
          throw Error("Immutable history differs.");
        const names = allowed.filter((k) => Object.hasOwn(row, k));
        await tx.runAsync(
          `INSERT INTO ${t}(${names.join(",")}) VALUES(${names.map(() => "?")}) ON CONFLICT(${pk}) DO UPDATE SET ${names.filter((k) => k !== pk).map((k) => `${k}=excluded.${k}`)}`,
          ...names.map((k) => row[k]!),
        );
      }
    await this.version(tx, r);
    const binding = (await tx.getFirstAsync<Binding>(
      "SELECT * FROM business_binding",
    ))!;
    await tx.runAsync(
      "INSERT OR IGNORE INTO business_identity VALUES(?,?,?,?)",
      r.kind,
      r.id,
      binding.company,
      r.id,
    );
  }
  conflicts() {
    return this.db.getAllAsync<{
      id: string;
      request_json: string;
      receipt_json: string;
    }>(
      "SELECT b.* FROM business_batches b WHERE b.state='conflict' AND NOT EXISTS(SELECT 1 FROM business_decisions d WHERE d.batch_id=b.id)",
    );
  }
  async resolve(id: string, decision: "keep-local" | "use-server") {
    await this.db.transaction(async (tx) => {
      const saved = await tx.getFirstAsync<{
        request_json: string;
        receipt_json: string;
      }>("SELECT * FROM business_batches WHERE id=? AND state='conflict'", id);
      if (!saved) throw Error("Conflict is unavailable.");
      const request = JSON.parse(saved.request_json) as Batch,
        result = JSON.parse(saved.receipt_json) as Receipt;
      const local = await this.rows(tx, request.localCompany);
      await tx.runAsync(
        "INSERT INTO business_decisions VALUES(?,?,?,?,?)",
        id,
        decision,
        this.now(),
        canonical(local),
        canonical(result.records),
      );
      for (const remote of result.records) {
        const proposed = local.find((r) => key(r) === key(remote));
        if (decision === "keep-local") {
          if (proposed) immutable(remote, proposed);
          await this.version(tx, remote);
        } else {
          const merged = structuredClone(remote);
          if (proposed) {
            for (const table of ["corrective_actions", "media_journal"])
              for (const row of proposed.data[table] ?? [])
                if (!merged.data[table]?.some((x) => x.id === row.id))
                  merged.data[table]!.push(row);
            for (const h of proposed.data.action_history ?? [])
              if (!merged.data.action_history!.some((x) => x.id === h.id))
                merged.data.action_history!.push(h);
          }
          await this.project(tx, merged, request.localCompany, true);
          await this.version(tx, remote);
        }
      }
    });
  }
  async progress() {
    const pending = await this.db.getFirstAsync<{ n: number }>(
      "SELECT (SELECT count(*) FROM outbox o WHERE NOT EXISTS(SELECT 1 FROM business_acks a WHERE a.kind='outbox' AND a.id=o.operation_id))+(SELECT count(*) FROM local_events e WHERE NOT EXISTS(SELECT 1 FROM business_acks a WHERE a.kind='event' AND a.id=e.id)) n",
    );
    const receipts = await this.db.getFirstAsync<{ n: number }>(
      "SELECT count(*) n FROM business_batches WHERE state='accepted'",
    );
    return {
      remainingOperations: pending?.n ?? 0,
      acknowledgedBatches: receipts?.n ?? 0,
    };
  }
  async state() {
    if ((await this.conflicts()).length) return "Conflict requires review";
    if (
      await this.db.getFirstAsync(
        "SELECT id FROM business_batches WHERE state='pending'",
      )
    )
      return "Waiting to sync";
    const b = await this.binding();
    if (!b) return "Saved on this device";
    try {
      for (const r of await this.db.transaction((tx) =>
        this.rows(tx, b.local_company),
      )) {
        const v = await this.db.getFirstAsync<{ data_json: string }>(
          "SELECT data_json FROM business_versions WHERE kind=? AND id=?",
          r.kind,
          r.id,
        );
        if (!v || v.data_json !== canonical(r.data)) return "Waiting to sync";
      }
      if (
        await this.db.getFirstAsync(
          "SELECT id FROM media_journal WHERE kind='photo' AND state NOT IN ('ready','deleted') LIMIT 1",
        )
      )
        return "Sync needs attention";
      if ((await this.progress()).remainingOperations) return "Waiting to sync";
      return "Synced";
    } catch {
      return "Sync needs attention";
    }
  }
}
