import type { TransactionalDatabase, Connection } from "./contracts.ts";
import { SCHEMA_SQL } from "./schema.ts";
export const LATEST_SCHEMA = 8;
const mediaSQL = `
CREATE TABLE local_secrets(name TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE media_journal(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, inspection_id TEXT NOT NULL, item_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('photo','pdf')), caption TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('writing','ready','deleting','deleted','interrupted','missing')),
 bytes INTEGER NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(company_id,inspection_id) REFERENCES inspection_drafts(company_id,id));
CREATE TABLE local_events(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, entity_id TEXT NOT NULL, kind TEXT NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), created_at TEXT NOT NULL);
PRAGMA user_version=2;`;
const catalogueSQL = `
CREATE TABLE customers(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, contact TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, UNIQUE(company_id,id));
CREATE TABLE sites(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, customer_id TEXT NOT NULL, name TEXT NOT NULL, address TEXT NOT NULL, timezone TEXT NOT NULL, notes TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, UNIQUE(company_id,id), FOREIGN KEY(company_id,customer_id) REFERENCES customers(company_id,id));
CREATE TABLE templates(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, UNIQUE(company_id,id));
CREATE TABLE template_versions(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, template_id TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL, items_json TEXT NOT NULL CHECK(json_valid(items_json)), UNIQUE(company_id,id), UNIQUE(company_id,template_id,version), FOREIGN KEY(company_id,template_id) REFERENCES templates(company_id,id));
CREATE TRIGGER immutable_template_version BEFORE UPDATE ON template_versions BEGIN SELECT RAISE(ABORT,'Template versions are immutable'); END;
CREATE TRIGGER retained_template_version BEFORE DELETE ON template_versions BEGIN SELECT RAISE(ABORT,'Template versions are retained'); END;
CREATE TABLE inspection_context(inspection_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, workspace_json TEXT NOT NULL CHECK(json_valid(workspace_json)), customer_name TEXT NOT NULL, address TEXT NOT NULL, timezone TEXT NOT NULL, FOREIGN KEY(company_id,inspection_id) REFERENCES inspection_drafts(company_id,id));
PRAGMA user_version=3;`;
const workflowSQL = `
CREATE TABLE local_people(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,UNIQUE(company_id,id));
CREATE TABLE company_settings(company_id TEXT PRIMARY KEY,name TEXT NOT NULL,contact TEXT NOT NULL);
CREATE TABLE inspection_lifecycle(inspection_id TEXT PRIMARY KEY,company_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','completed')),inspector TEXT NOT NULL DEFAULT '',completed_at TEXT,snapshot_json TEXT,correction_of TEXT,correction_reason TEXT NOT NULL DEFAULT '',FOREIGN KEY(company_id,inspection_id) REFERENCES inspection_drafts(company_id,id));
CREATE TABLE corrective_actions(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,inspection_id TEXT NOT NULL,item_id TEXT NOT NULL,description TEXT NOT NULL,owner_id TEXT NOT NULL,owner_name TEXT NOT NULL,due_date TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('open','resolved')),resolution_note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,resolved_at TEXT,revision INTEGER NOT NULL DEFAULT 1,UNIQUE(company_id,id),FOREIGN KEY(company_id,inspection_id) REFERENCES inspection_drafts(company_id,id),FOREIGN KEY(company_id,owner_id) REFERENCES local_people(company_id,id));
CREATE TABLE action_history(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,action_id TEXT NOT NULL,event TEXT NOT NULL,snapshot_json TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(company_id,action_id) REFERENCES corrective_actions(company_id,id));
ALTER TABLE media_journal ADD COLUMN action_id TEXT REFERENCES corrective_actions(id);
CREATE TRIGGER completed_answers BEFORE UPDATE ON inspection_drafts WHEN EXISTS(SELECT 1 FROM inspection_lifecycle l WHERE l.inspection_id=OLD.id AND l.status='completed') BEGIN SELECT RAISE(ABORT,'Completed inspection is read only. Create a correction.'); END;
CREATE TRIGGER completed_deletion BEFORE DELETE ON inspection_drafts WHEN EXISTS(SELECT 1 FROM inspection_lifecycle l WHERE l.inspection_id=OLD.id AND l.status='completed') BEGIN SELECT RAISE(ABORT,'Completed history must be retained.'); END;
CREATE TRIGGER completed_snapshot BEFORE UPDATE ON inspection_lifecycle WHEN OLD.status='completed' BEGIN SELECT RAISE(ABORT,'Completed snapshot is immutable.'); END;
CREATE TRIGGER retained_completion BEFORE DELETE ON inspection_lifecycle WHEN OLD.status='completed' BEGIN SELECT RAISE(ABORT,'Completed snapshot must be retained.'); END;
CREATE TRIGGER retained_action_history_update BEFORE UPDATE ON action_history BEGIN SELECT RAISE(ABORT,'Action history is immutable.'); END;
CREATE TRIGGER retained_action_history_delete BEFORE DELETE ON action_history BEGIN SELECT RAISE(ABORT,'Action history is immutable.'); END;
PRAGMA user_version=4;`;
const syncSQL = `
CREATE TABLE auth_sessions(namespace TEXT PRIMARY KEY,session_json TEXT NOT NULL CHECK(json_valid(session_json)));
CREATE TABLE sync_operations(operation_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,company_id TEXT NOT NULL,entity_id TEXT NOT NULL,request_json TEXT NOT NULL CHECK(json_valid(request_json)),state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','conflict')),attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',receipt_json TEXT,created_at TEXT NOT NULL);
CREATE INDEX sync_pending ON sync_operations(user_id,company_id,state,created_at);
CREATE TABLE sync_inbox(user_id TEXT NOT NULL,company_id TEXT NOT NULL,entity_id TEXT NOT NULL,record_json TEXT NOT NULL CHECK(json_valid(record_json)),revision INTEGER NOT NULL,PRIMARY KEY(user_id,company_id,entity_id));
CREATE TABLE sync_cursors(user_id TEXT NOT NULL,company_id TEXT NOT NULL,cursor INTEGER NOT NULL DEFAULT 0,epoch INTEGER,PRIMARY KEY(user_id,company_id));
PRAGMA user_version=5;`;
const businessSQL = `
CREATE TABLE business_binding(singleton INTEGER PRIMARY KEY CHECK(singleton=1),user_id TEXT NOT NULL,company TEXT NOT NULL,local_company TEXT NOT NULL,origin TEXT NOT NULL,role TEXT NOT NULL,receive_seed INTEGER NOT NULL,adopted_at TEXT NOT NULL);
CREATE TABLE business_identity(kind TEXT NOT NULL,local_id TEXT NOT NULL,company TEXT NOT NULL,remote_id TEXT NOT NULL,PRIMARY KEY(kind,local_id));
CREATE TABLE business_versions(kind TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,data_json TEXT NOT NULL,PRIMARY KEY(kind,id));
CREATE TABLE business_batches(id TEXT PRIMARY KEY,request_json TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('pending','accepted','conflict')),receipt_json TEXT,error TEXT NOT NULL);
CREATE TABLE business_acks(kind TEXT NOT NULL,id TEXT NOT NULL,batch_id TEXT NOT NULL,PRIMARY KEY(kind,id));
CREATE TABLE business_decisions(batch_id TEXT PRIMARY KEY,decision TEXT NOT NULL,created_at TEXT NOT NULL,local_json TEXT NOT NULL,remote_json TEXT NOT NULL);
CREATE TABLE business_cursor(singleton INTEGER PRIMARY KEY CHECK(singleton=1),cursor INTEGER NOT NULL,epoch INTEGER);
INSERT INTO business_cursor VALUES(1,0,NULL);
CREATE TABLE business_access(singleton INTEGER PRIMARY KEY CHECK(singleton=1),user_id TEXT NOT NULL,valid_until INTEGER NOT NULL,max_clock INTEGER NOT NULL,signed_out INTEGER NOT NULL);
PRAGMA user_version=6;`;
/** DDL and user_version commit together. SQLite rollback retains v1 data/outbox on any failure. */
export async function migrate(
  db: TransactionalDatabase,
  afterStep?: (version: number, tx: Connection) => Promise<void>,
) {
  await db.transaction(async (tx) => {
    const row = await tx.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    let version = row?.user_version;
    if (version === undefined || version > LATEST_SCHEMA)
      throw new Error("Unsupported database version; preserved.");
    if (version === 0) {
      await tx.execAsync(SCHEMA_SQL);
      version = 1;
      await afterStep?.(1, tx);
    }
    if (version === 1) {
      await tx.execAsync(mediaSQL);
      await afterStep?.(2, tx);
      version = 2;
    }
    if (version === 2) {
      await tx.execAsync(catalogueSQL);
      await afterStep?.(3, tx);
      version = 3;
    }
    if (version === 3) {
      await tx.execAsync(workflowSQL);
      await afterStep?.(4, tx);
      version = 4;
    }
    if (version === 4) {
      await tx.execAsync(syncSQL);
      await afterStep?.(5, tx);
      version = 5;
    }
    if (version === 5) {
      await tx.execAsync(businessSQL);
      await afterStep?.(6, tx);
      version = 6;
    }
    if (version === 6) {
      await tx.execAsync(
        `CREATE TABLE business_incoming(kind TEXT NOT NULL,id TEXT NOT NULL,record_json TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(kind,id));CREATE TABLE business_download(singleton INTEGER PRIMARY KEY CHECK(singleton=1),cursor INTEGER NOT NULL,epoch INTEGER NOT NULL);PRAGMA user_version=7;`,
      );
      await afterStep?.(7, tx);
      version = 7;
    }
    if (version === 7) {
      await tx.execAsync(
        `CREATE TABLE business_quarantine(singleton INTEGER PRIMARY KEY CHECK(singleton=1),reason TEXT NOT NULL,review_json TEXT NOT NULL,created_at TEXT NOT NULL);CREATE TABLE business_access_audit(id TEXT PRIMARY KEY,event TEXT NOT NULL,detail_json TEXT NOT NULL,created_at TEXT NOT NULL);PRAGMA user_version=8;`,
      );
      await tx.execAsync(
        `CREATE TABLE business_generation(singleton INTEGER PRIMARY KEY,generation INTEGER NOT NULL);INSERT INTO business_generation VALUES(1,0);CREATE TABLE business_import_review(id TEXT PRIMARY KEY,company TEXT NOT NULL,generation INTEGER NOT NULL,state TEXT NOT NULL);CREATE TABLE business_import_rows(review TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(review,kind,id));`,
      );
      for (const table of [
        "customers",
        "sites",
        "templates",
        "template_versions",
        "inspection_drafts",
        "inspection_context",
        "inspection_lifecycle",
        "corrective_actions",
        "action_history",
        "media_journal",
        "local_people",
        "company_settings",
        "outbox",
        "local_events",
      ])
        for (const event of ["INSERT", "UPDATE", "DELETE"])
          await tx.execAsync(
            `CREATE TRIGGER generation_${table}_${event} AFTER ${event} ON ${table} BEGIN UPDATE business_generation SET generation=generation+1;END;`,
          );
      await afterStep?.(8, tx);
    }
  });
}
