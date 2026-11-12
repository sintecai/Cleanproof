export const SCHEMA_VERSION = 1;
export const SCHEMA_SQL = `
CREATE TABLE inspection_drafts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  local_revision INTEGER NOT NULL DEFAULT 0 CHECK(local_revision >= 0),
  saved_at TEXT,
  UNIQUE(company_id, id)
);
CREATE TABLE outbox (
  operation_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  inspection_id TEXT NOT NULL,
  operation_kind TEXT NOT NULL CHECK(operation_kind = 'save_draft_v1'),
  local_revision INTEGER NOT NULL CHECK(local_revision > 0),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  created_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state = 'pending'),
  UNIQUE(company_id, inspection_id, local_revision),
  FOREIGN KEY(company_id, inspection_id) REFERENCES inspection_drafts(company_id, id)
);
CREATE INDEX outbox_inspection ON outbox(company_id, inspection_id, local_revision);
PRAGMA user_version = 1;
`;
