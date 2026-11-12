import { uuid } from "../auth/session.ts";
export type Kind =
  | "customer"
  | "site"
  | "template"
  | "template_version"
  | "inspection_snapshot"
  | "action_event";
export type Operation = {
  protocol: 1;
  operationId: string;
  companyId: string;
  entityId: string;
  kind: Kind;
  siteId: string | null;
  parentId: string | null;
  expectedRevision: number;
  deleted: boolean;
  payload: Record<string, unknown>;
};
export type RemoteRecord = {
  company_id: string;
  id: string;
  kind: Kind;
  site_id: string | null;
  parent_id: string | null;
  payload: Record<string, unknown>;
  revision: number;
  deleted: boolean;
  actor_id: string | null; // Deleted login; immutable company content is retained.
};
export type Receipt = {
  status: "accepted" | "conflict";
  operationId: string;
  record: RemoteRecord | null;
  sequence?: number;
};
export type PullPage = {
  protocol?: number;
  resetRequired: boolean;
  epoch: number;
  cursor?: number;
  head?: number;
  changes?: { sequence: number; record: RemoteRecord }[];
};
const kinds = [
  "customer",
  "site",
  "template",
  "template_version",
  "inspection_snapshot",
  "action_event",
];
export function validateOperation(o: Operation) {
  if (
    o.protocol !== 1 ||
    !uuid(o.operationId) ||
    !uuid(o.companyId) ||
    !uuid(o.entityId) ||
    !kinds.includes(o.kind) ||
    !Number.isSafeInteger(o.expectedRevision) ||
    o.expectedRevision < 0 ||
    typeof o.deleted !== "boolean" ||
    !o.payload ||
    Array.isArray(o.payload) ||
    typeof o.payload !== "object" ||
    (o.siteId !== null && !uuid(o.siteId)) ||
    (o.parentId !== null && !uuid(o.parentId)) ||
    JSON.stringify(o).length > 250000
  )
    throw Error("Invalid queued operation. Existing work preserved.");
  return o;
}
export function validateRecord(r: RemoteRecord, c: string) {
  if (
    !r ||
    r.company_id !== c ||
    !uuid(r.id) ||
    !kinds.includes(r.kind) ||
    !Number.isSafeInteger(r.revision) ||
    r.revision < 1 ||
    typeof r.deleted !== "boolean" ||
    !r.payload ||
    typeof r.payload !== "object" ||
    Array.isArray(r.payload)
  )
    throw Error("Unexpected server record. Existing work preserved.");
  return r;
}
export function validateReceipt(r: Receipt, o: Operation) {
  if (
    !r ||
    r.operationId !== o.operationId ||
    !["accepted", "conflict"].includes(r.status)
  )
    throw Error("No matching server acknowledgement.");
  if (r.record) {
    validateRecord(r.record, o.companyId);
    if (r.record.id !== o.entityId)
      throw Error("Receipt belongs to another record.");
  }
  if (
    r.status === "accepted" &&
    (!r.record ||
      r.record.revision !== o.expectedRevision + 1 ||
      r.record.kind !== o.kind ||
      r.record.site_id !== o.siteId ||
      r.record.parent_id !== o.parentId ||
      r.record.deleted !== o.deleted ||
      canonical(r.record.payload) !== canonical(o.payload) ||
      !Number.isSafeInteger(r.sequence) ||
      r.sequence! < 1)
  )
    throw Error("Incomplete server acknowledgement.");
  return r;
}

/** Key order is irrelevant; arrays and JSON values retain their order/value. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonical((v as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}
