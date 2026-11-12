import {BusinessAccess} from "../sync/business/access.ts";
import type { Connection, TransactionalDatabase } from "./contracts.ts";
import type { Context } from "./catalogue.ts";
import { parseDraft, reviewDraft } from "../domain/inspection.ts";
import { requiredText, validDueDate } from "../domain/workflow.ts";
import type { InspectionDraft, DemoWorkspace } from "../domain/inspection.ts";
import type { Asset } from "../media/vault.ts";
export type Person = { id: string; name: string; active: number };
export type Action = {
  id: string;
  company_id: string;
  inspection_id: string;
  item_id: string;
  description: string;
  owner_id: string;
  owner_name: string;
  due_date: string;
  status: "open" | "resolved";
  resolution_note: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  revision: number;
};
export type Lifecycle = {
  status: "draft" | "completed";
  inspector: string;
  completed_at: string | null;
  snapshot_json: string | null;
  correction_of: string | null;
  correction_reason: string;
};
export type ReportData = {
  context: Context;
  draft: InspectionDraft;
  status: "draft" | "completed";
  inspector: string;
  completedAt: string | null;
  branding: { name: string; contact: string };
  actions: Action[];
  photos: Asset[];
  actionPhotos?: Asset[];
  generatedAt: string;
  correctionOf: string | null;
  correctionReason: string;
};
export class WorkflowRepository {
  constructor(
    private db: TransactionalDatabase,
    readonly company: string,
    private id: () => string,
    private now: () => string,
  ) {}
  private async event(
    tx: Connection,
    entity: string,
    kind: string,
    payload: unknown,
  ) {
    await tx.runAsync(
      "INSERT INTO local_events VALUES(?,?,?,?,?,?)",
      this.id(),
      this.company,
      entity,
      kind,
      JSON.stringify(payload),
      this.now(),
    );
  }
  async seed() {
    await this.db.transaction(async (tx) => {
      await tx.runAsync(
        "INSERT OR IGNORE INTO company_settings VALUES(?,?,?)",
        this.company,
        "Demo Alder Cleaning",
        "hello@example.test",
      );
      for (const [id, name] of [
        ["88888888-8888-4888-8888-888888888888", "Jamie (demo)"],
        ["99999999-9999-4999-8999-999999999999", "Morgan (demo)"],
      ])
        await tx.runAsync(
          "INSERT OR IGNORE INTO local_people(id,company_id,name) VALUES(?,?,?)",
          id!,
          this.company,
          name!,
        );
    });
  }
  people() {
    return this.db.getAllAsync<Person>(
      "SELECT id,name,active FROM local_people WHERE company_id=? ORDER BY name",
      this.company,
    );
  }
  async addPerson(name: string) {
    await new BusinessAccess(this.db).owner();
    name = requiredText(name, "Name", 120);
    const id = this.id();
    await this.db.transaction(async (tx) => {
      await tx.runAsync(
        "INSERT INTO local_people(id,company_id,name) VALUES(?,?,?)",
        id,
        this.company,
        name,
      );
      await this.event(tx, id, "local_person_created_v1", { id, name });
    });
  }
  async branding() {
    return (await this.db.getFirstAsync<{ name: string; contact: string }>(
      "SELECT name,contact FROM company_settings WHERE company_id=?",
      this.company,
    ))!;
  }
  async saveBranding(name: string, contact: string) {
    await new BusinessAccess(this.db).owner();
    name = requiredText(name, "Company name", 120);
    if (contact.length > 500) throw Error("Contact details are too long.");
    await this.db.transaction(async (tx) => {
      await tx.runAsync(
        "UPDATE company_settings SET name=?,contact=? WHERE company_id=?",
        name,
        contact.trim(),
        this.company,
      );
      await this.event(tx, this.company, "branding_saved_v1", {
        name,
        contact,
      });
    });
  }
  private async lifecycleIn(tx: Connection, id: string): Promise<Lifecycle> {
    const parent = await tx.getFirstAsync(
      "SELECT id FROM inspection_drafts WHERE company_id=? AND id=?",
      this.company,
      id,
    );
    if (!parent) throw Error("Inspection unavailable.");
    return (
      (await tx.getFirstAsync<Lifecycle>(
        "SELECT * FROM inspection_lifecycle WHERE company_id=? AND inspection_id=?",
        this.company,
        id,
      )) ?? {
        status: "draft",
        inspector: "",
        completed_at: null,
        snapshot_json: null,
        correction_of: null,
        correction_reason: "",
      }
    );
  }
  lifecycle(id: string) {
    return this.lifecycleIn(this.db, id);
  }
  actions(inspection?: string) {
    return this.db.getAllAsync<Action>(
      `SELECT * FROM corrective_actions WHERE company_id=? ${inspection ? "AND inspection_id=?" : ""} ORDER BY status,due_date,created_at`,
      ...(inspection ? [this.company, inspection] : [this.company]),
    );
  }
  actionHistory(id: string) {
    return this.db.getAllAsync<{
      event: string;
      snapshot_json: string;
      created_at: string;
      timezone: string;
    }>(
      "SELECT event,snapshot_json,created_at FROM action_history WHERE company_id=? AND action_id=? ORDER BY rowid",
      this.company,
      id,
    );
  }
  private async recordAction(tx: Connection, a: Action, event: string) {
    const evidence = await tx.getAllAsync<{
      id: string;
      hash: string;
      caption: string;
    }>(
      "SELECT id,hash,caption FROM media_journal WHERE company_id=? AND action_id=? AND state='ready'",
      this.company,
      a.id,
    );
    const snapshot = { ...a, evidence };
    await tx.runAsync(
      "INSERT INTO action_history VALUES(?,?,?,?,?,?)",
      this.id(),
      this.company,
      a.id,
      event,
      JSON.stringify(snapshot),
      this.now(),
    );
    await this.event(tx, a.id, "action_" + event + "_v1", a);
  }
  async createAction(
    inspection: string,
    item: string,
    description: string,
    owner: string,
    due: string,
  ) {
    description = requiredText(description, "Action description");
    validDueDate(due);
    const id = this.id();
    await this.db.transaction(async (tx) => {
      await this.lifecycleIn(tx, inspection);
      const d = await tx.getFirstAsync<{ payload_json: string }>(
        "SELECT payload_json FROM inspection_drafts WHERE company_id=? AND id=?",
        this.company,
        inspection,
      );
      if (JSON.parse(d!.payload_json).responses[item]?.result !== "fail")
        throw Error("Create actions from a failed checklist item.");
      const person = await tx.getFirstAsync<Person>(
        "SELECT id,name,active FROM local_people WHERE company_id=? AND id=? AND active=1",
        this.company,
        owner,
      );
      if (!person) throw Error("Choose a responsible person.");
      const a: Action = {
        id,
        company_id: this.company,
        inspection_id: inspection,
        item_id: item,
        description,
        owner_id: owner,
        owner_name: person.name,
        due_date: due,
        status: "open",
        resolution_note: "",
        created_at: this.now(),
        updated_at: this.now(),
        resolved_at: null,
        revision: 1,
      };
      await tx.runAsync(
        "INSERT INTO corrective_actions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        this.company,
        inspection,
        item,
        description,
        owner,
        person.name,
        due,
        "open",
        "",
        a.created_at,
        a.updated_at,
        null,
        1,
      );
      await this.recordAction(tx, a, "created");
    });
    return id;
  }
  async updateAction(
    id: string,
    revision: number,
    description: string,
    owner: string,
    due: string,
  ) {
    description = requiredText(description, "Action description");
    validDueDate(due);
    await this.db.transaction(async (tx) => {
      const a = await tx.getFirstAsync<Action>(
        "SELECT * FROM corrective_actions WHERE company_id=? AND id=?",
        this.company,
        id,
      );
      if (!a || a.revision !== revision || a.status !== "open")
        throw Error("Reload this open action before editing.");
      const p = await tx.getFirstAsync<Person>(
        "SELECT id,name,active FROM local_people WHERE company_id=? AND id=? AND active=1",
        this.company,
        owner,
      );
      if (!p) throw Error("Choose a responsible person.");
      const next = {
        ...a,
        description,
        owner_id: owner,
        owner_name: p.name,
        due_date: due,
        updated_at: this.now(),
        revision: a.revision + 1,
      };
      await tx.runAsync(
        "UPDATE corrective_actions SET description=?,owner_id=?,owner_name=?,due_date=?,updated_at=?,revision=? WHERE company_id=? AND id=? AND revision=?",
        description,
        owner,
        p.name,
        due,
        next.updated_at,
        next.revision,
        this.company,
        id,
        revision,
      );
      await this.recordAction(tx, next, "updated");
    });
  }
  async transitionAction(
    id: string,
    revision: number,
    status: "open" | "resolved",
    note: string,
  ) {
    if (!["open", "resolved"].includes(status))
      throw Error("Invalid action status.");
    note = requiredText(
      note,
      status === "resolved" ? "Resolution notes" : "Reason for reopening",
    );
    await this.db.transaction(async (tx) => {
      const a = await tx.getFirstAsync<Action>(
        "SELECT * FROM corrective_actions WHERE company_id=? AND id=?",
        this.company,
        id,
      );
      if (!a || a.revision !== revision)
        throw Error("This action changed. Reload it before saving.");
      if (a.status === status) throw Error("Choose a different action status.");
      const pending = await tx.getFirstAsync<{ n: number }>(
        "SELECT COUNT(*) n FROM media_journal WHERE company_id=? AND action_id=? AND state NOT IN ('ready','deleted')",
        this.company,
        id,
      );
      if (pending?.n)
        throw Error("Recover or remove unavailable action evidence first.");
      const next = {
        ...a,
        status,
        resolution_note: note,
        updated_at: this.now(),
        resolved_at: status === "resolved" ? this.now() : null,
        revision: a.revision + 1,
      };
      await tx.runAsync(
        "UPDATE corrective_actions SET status=?,resolution_note=?,updated_at=?,resolved_at=?,revision=? WHERE company_id=? AND id=? AND revision=?",
        next.status,
        note,
        next.updated_at,
        next.resolved_at,
        next.revision,
        this.company,
        id,
        revision,
      );
      await this.recordAction(
        tx,
        next,
        status === "resolved" ? "resolved" : "reopened",
      );
    });
  }
  private async reportIn(tx: Connection, id: string): Promise<ReportData> {
    const l = await this.lifecycleIn(tx, id);
    const row = await tx.getFirstAsync<{
      workspace_json: string;
      customer_name: string;
      address: string;
      timezone: string;
      payload_json: string;
    }>(
      "SELECT c.*,d.payload_json FROM inspection_context c JOIN inspection_drafts d ON d.id=c.inspection_id AND d.company_id=c.company_id WHERE c.company_id=? AND c.inspection_id=?",
      this.company,
      id,
    );
    if (!row) throw Error("Inspection unavailable.");
    const context: Context = {
      workspace: JSON.parse(row.workspace_json),
      customerName: row.customer_name,
      address: row.address,
      timezone: row.timezone,
    };
    const photos = await tx.getAllAsync<Asset>(
      "SELECT * FROM media_journal WHERE company_id=? AND inspection_id=? AND kind='photo' AND action_id IS NULL AND state!='deleted'",
      this.company,
      id,
    );
    const frozen = l.snapshot_json
      ? (JSON.parse(l.snapshot_json) as ReportData)
      : null;
    return {
      ...(frozen ?? {
        context,
        draft: parseDraft(JSON.parse(row.payload_json), context.workspace),
        branding: (await tx.getFirstAsync<{ name: string; contact: string }>(
          "SELECT name,contact FROM company_settings WHERE company_id=?",
          this.company,
        ))!,
        photos,
      }),
      status: l.status,
      inspector: l.inspector,
      completedAt: l.completed_at,
      actions: await tx.getAllAsync<Action>(
        "SELECT * FROM corrective_actions WHERE company_id=? AND inspection_id=? ORDER BY due_date,created_at",
        this.company,
        id,
      ),
      actionPhotos: await tx.getAllAsync<Asset>(
        "SELECT * FROM media_journal WHERE company_id=? AND inspection_id=? AND action_id IS NOT NULL AND state!='deleted'",
        this.company,
        id,
      ),
      generatedAt: this.now(),
      correctionOf: l.correction_of,
      correctionReason: l.correction_reason,
    };
  }
  report(id: string) {
    return this.db.transaction((tx) => this.reportIn(tx, id));
  }
  async complete(
    id: string,
    expectedRevision: number,
    inspector: string,
    verifiedMedia: { id: string; hash: string }[],
  ) {
    inspector = requiredText(inspector, "Inspector name", 120);
    await this.db.transaction(async (tx) => {
      const l = await this.lifecycleIn(tx, id);
      if (l.status !== "draft") throw Error("Inspection is already completed.");
      const row = await tx.getFirstAsync<{ local_revision: number }>(
        "SELECT local_revision FROM inspection_drafts WHERE company_id=? AND id=?",
        this.company,
        id,
      );
      if (row?.local_revision !== expectedRevision)
        throw Error("The inspection changed. Review the latest answers.");
      const data = await this.reportIn(tx, id);
      const issues = reviewDraft(data.draft, data.context.workspace);
      if (issues.length) throw Error(issues.map((i) => i.message).join(" "));
      for (const i of data.context.workspace.items)
        if (
          data.draft.responses[i.id]!.result === "fail" &&
          !data.actions.some((a) => a.item_id === i.id)
        )
          throw Error(
            "Every failed item needs a corrective action with an owner and due date.",
          );
      if (
        data.photos.some(
          (p) =>
            p.state !== "ready" ||
            !verifiedMedia.some((v) => v.id === p.id && v.hash === p.hash),
        )
      )
        throw Error("Verify every inspection photograph before completing.");
      const completedAt = this.now();
      const snapshot = { ...data, status: "completed", inspector, completedAt };
      await tx.runAsync(
        "INSERT INTO inspection_lifecycle(inspection_id,company_id,status,inspector,completed_at,snapshot_json) VALUES(?,?,'completed',?,?,?) ON CONFLICT(inspection_id) DO UPDATE SET status='completed',inspector=excluded.inspector,completed_at=excluded.completed_at,snapshot_json=excluded.snapshot_json",
        id,
        this.company,
        inspector,
        completedAt,
        JSON.stringify(snapshot),
      );
      await this.event(tx, id, "inspection_completed_locally_v1", snapshot);
    });
  }
  async correction(id: string, reason: string) {
    reason = requiredText(reason, "Correction reason", 500);
    const nextId = this.id();
    await this.db.transaction(async (tx) => {
      const l = await this.lifecycleIn(tx, id);
      if (l.status !== "completed")
        throw Error("Corrections start from completed inspections.");
      const data = await this.reportIn(tx, id);
      const workspace: DemoWorkspace = {
        ...data.context.workspace,
        inspectionId: nextId,
      };
      const draft = {
        ...data.draft,
        id: nextId,
        createdAt: this.now(),
        updatedAt: this.now(),
      };
      await tx.runAsync(
        "INSERT INTO inspection_drafts VALUES(?,?,?,?,0,NULL)",
        nextId,
        this.company,
        draft.siteId,
        JSON.stringify(draft),
      );
      await tx.runAsync(
        "INSERT INTO inspection_context VALUES(?,?,?,?,?,?)",
        nextId,
        this.company,
        JSON.stringify(workspace),
        data.context.customerName,
        data.context.address,
        data.context.timezone,
      );
      await tx.runAsync(
        "INSERT INTO inspection_lifecycle(inspection_id,company_id,status,correction_of,correction_reason) VALUES(?,?,'draft',?,?)",
        nextId,
        this.company,
        id,
        reason,
      );
      await this.event(tx, nextId, "correction_draft_created_v1", {
        source: id,
        reason,
        draft,
      });
    });
    return nextId;
  }
  history() {
    return this.db.getAllAsync<{
      id: string;
      workspace_json: string;
      saved_at: string | null;
      status: "draft" | "completed";
      completed_at: string | null;
      inspector: string;
      correction_of: string | null;
      created_at: string;
      timezone: string;
    }>(
      "SELECT json_extract(d.payload_json,'$.createdAt') created_at,c.timezone,d.id,c.workspace_json,d.saved_at,COALESCE(l.status,'draft') status,l.completed_at,COALESCE(l.inspector,'') inspector,l.correction_of FROM inspection_drafts d JOIN inspection_context c ON c.inspection_id=d.id AND c.company_id=d.company_id LEFT JOIN inspection_lifecycle l ON l.inspection_id=d.id AND l.company_id=d.company_id WHERE d.company_id=? ORDER BY COALESCE(l.completed_at,d.saved_at,json_extract(d.payload_json,'$.createdAt')) DESC,d.rowid DESC",
      this.company,
    );
  }
}
