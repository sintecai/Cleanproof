import { createDraft, parseDraft } from "../domain/inspection.ts";
import type { DemoWorkspace, InspectionDraft } from "../domain/inspection.ts";
import type {
  Connection,
  DraftRepository,
  SavedDraft,
  TransactionalDatabase,
} from "./contracts.ts";
import { SerialQueue } from "./contracts.ts";
import { migrate } from "./migrations.ts";
export class LocalRevisionConflict extends Error {
  constructor() {
    super("The draft changed on this device. Reopen it before editing.");
  }
}
type DraftRow = {
  payload_json: string;
  local_revision: number;
  saved_at: string | null;
};
export class InspectionRepository implements DraftRepository {
  private readonly queue = new SerialQueue();
  constructor(
    private readonly db: TransactionalDatabase,
    private readonly workspace: DemoWorkspace,
    private readonly clock: () => string,
    private readonly operationId: () => string,
  ) {}
  async initialise(): Promise<void> {
    await migrate(this.db);
    await this.queue.run(() =>
      this.db.transaction(async (tx) => {
        const existing = await tx.getFirstAsync<{ id: string }>(
          "SELECT id FROM inspection_drafts WHERE id = ?",
          this.workspace.inspectionId,
        );
        if (!existing) {
          const draft = createDraft(this.workspace, this.clock());
          await tx.runAsync(
            "INSERT INTO inspection_drafts(id, company_id, site_id, payload_json, local_revision, saved_at) VALUES(?, ?, ?, ?, 0, NULL)",
            draft.id,
            draft.companyId,
            draft.siteId,
            JSON.stringify(draft),
          );
        }
      }),
    );
  }
  private async read(connection: Connection): Promise<SavedDraft> {
    const row = await connection.getFirstAsync<DraftRow>(
      "SELECT payload_json, local_revision, saved_at FROM inspection_drafts WHERE company_id = ? AND site_id = ? AND id = ?",
      this.workspace.companyId,
      this.workspace.siteId,
      this.workspace.inspectionId,
    );
    if (!row)
      throw new Error(
        "Demo workspace could not be loaded; existing data has been preserved.",
      );
    const hasReceipts = await connection.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='business_acks'",
    );
    const receiptClause = hasReceipts
      ? " AND NOT EXISTS(SELECT 1 FROM business_acks a WHERE a.kind='outbox' AND a.id=outbox.operation_id)"
      : "";
    const count = await connection.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM outbox WHERE company_id = ? AND inspection_id = ? AND state = 'pending'" +
        receiptClause,
      this.workspace.companyId,
      this.workspace.inspectionId,
    );
    return {
      draft: parseDraft(JSON.parse(row.payload_json), this.workspace),
      localRevision: row.local_revision,
      savedAt: row.saved_at,
      pendingOperations: count?.count ?? 0,
    };
  }
  load(): Promise<SavedDraft> {
    return this.queue.run(() => this.read(this.db));
  }
  save(draft: InspectionDraft, expectedRevision: number): Promise<SavedDraft> {
    const parsed = parseDraft(draft, this.workspace); // Snapshot before entering the queue.
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
      return Promise.reject(new Error("Invalid revision."));
    return this.queue.run(() =>
      this.db.transaction(async (tx) => {
        const savedAt = this.clock();
        const payload = JSON.stringify({ ...parsed, updatedAt: savedAt });
        const result = await tx.runAsync(
          "UPDATE inspection_drafts SET payload_json = ?, local_revision = local_revision + 1, saved_at = ? WHERE company_id = ? AND site_id = ? AND id = ? AND local_revision = ?",
          payload,
          savedAt,
          this.workspace.companyId,
          this.workspace.siteId,
          this.workspace.inspectionId,
          expectedRevision,
        );
        if (result.changes !== 1) throw new LocalRevisionConflict();
        await tx.runAsync(
          "INSERT INTO outbox(operation_id, company_id, inspection_id, operation_kind, local_revision, payload_json, created_at, state) VALUES(?, ?, ?, 'save_draft_v1', ?, ?, ?, 'pending')",
          this.operationId(),
          parsed.companyId,
          parsed.id,
          expectedRevision + 1,
          payload,
          savedAt,
        );
        return this.read(tx);
      }),
    );
  }
}
