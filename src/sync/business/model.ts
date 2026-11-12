import { canonical } from "../protocol.ts";
import { uuid } from "../../auth/session.ts";
import { parseDraft, reviewDraft } from "../../domain/inspection.ts";
import { validateItems } from "../../storage/catalogue.ts";
import type { Asset } from "../../media/vault.ts";
export type Row = Record<string, string | number | null>;
export const tables = {
  customer: ["customers"],
  person: ["local_people"],
  branding: ["company_settings"],
  template: ["templates", "template_versions"],
  site: ["sites"],
  inspection: [
    "inspection_drafts",
    "inspection_context",
    "inspection_lifecycle",
    "corrective_actions",
    "action_history",
    "media_journal",
  ],
} as const;
export type Kind = keyof typeof tables;
export type RecordData = {
  kind: Kind;
  id: string;
  siteId: string | null;
  data: Record<string, Row[]>;
  revision: number;
};
export type Source = { kind: "outbox" | "event"; id: string; row: Row };
export type Batch = {
  protocol: 2;
  id: string;
  company: string;
  localCompany: string;
  records: RecordData[];
  sources: Source[];
};
export type Receipt = {
  id: string;
  status: "accepted" | "conflict";
  records: RecordData[];
};
export const key = (r: Pick<RecordData, "kind" | "id">) => `${r.kind}:${r.id}`;
export const photos = (r: RecordData) =>
  (r.data.media_journal ?? []) as unknown as Asset[];
export function validate(r: RecordData, c: string) {
  if (
    !uuid(r.id) ||
    !Object.hasOwn(tables, r.kind) ||
    !Number.isSafeInteger(r.revision) ||
    r.revision < 0 ||
    !r.data ||
    Object.keys(r.data).length !== tables[r.kind].length
  )
    throw Error("Unsupported business record.");
  for (const t of tables[r.kind]) {
    const rows = r.data[t];
    if (!Array.isArray(rows) || rows.length > 5000)
      throw Error("Missing business rows.");
    for (const row of rows)
      if (
        row.company_id !== c ||
        Object.values(row).some(
          (v) => v !== null && !["string", "number"].includes(typeof v),
        )
      )
        throw Error("Company mapping/row validation failed.");
  }
  if (r.kind !== "inspection") {
    const rows = r.data[tables[r.kind][0]]!;
    if (rows.length !== 1 || (rows[0]!.id ?? rows[0]!.company_id) !== r.id)
      throw Error("Business identity mismatch.");
    if (r.kind === "site" && r.siteId !== r.id)
      throw Error("Site scope mismatch.");
    if (!["site", "inspection"].includes(r.kind) && r.siteId !== null)
      throw Error("Catalogue scope mismatch.");
    if (r.kind === "template")
      for (const v of r.data.template_versions!) {
        if (v.template_id !== r.id) throw Error("Template parent mismatch.");
        validateItems(JSON.parse(String(v.items_json)));
      }
    return r;
  }
  const rows = r.data.inspection_drafts!,
    contexts = r.data.inspection_context!,
    life = r.data.inspection_lifecycle!;
  if (
    rows.length !== 1 ||
    contexts.length !== 1 ||
    life.length > 1 ||
    rows[0]!.id !== r.id ||
    contexts[0]!.inspection_id !== r.id ||
    rows[0]!.site_id !== r.siteId
  )
    throw Error("Inspection context mismatch.");
  const w = JSON.parse(String(contexts[0]!.workspace_json));
  validateItems(w.items);
  if (w.inspectionId !== r.id || w.companyId !== c || w.siteId !== r.siteId)
    throw Error("Frozen scope mismatch.");
  const d = parseDraft(JSON.parse(String(rows[0]!.payload_json)), w);
  for (const l of life) {
    if (
      l.inspection_id !== r.id ||
      !["draft", "completed"].includes(String(l.status))
    )
      throw Error("Invalid lifecycle.");
    if (l.status === "completed") {
      const s = JSON.parse(String(l.snapshot_json));
      if (
        reviewDraft(d, w).length ||
        !String(l.inspector).trim() ||
        !l.completed_at ||
        canonical(s.draft) !== canonical(d) ||
        canonical(s.context.workspace) !== canonical(w)
      )
        throw Error("Invalid completion snapshot.");
    }
  }
  const ids = new Set(w.items.map((i: { id: string }) => i.id)),
    actions = new Set<string>();
  for (const a of r.data.corrective_actions!) {
    if (
      !uuid(a.id) ||
      a.inspection_id !== r.id ||
      !ids.has(a.item_id) ||
      !uuid(a.owner_id) ||
      !String(a.description).trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(a.due_date)) ||
      !["open", "resolved"].includes(String(a.status)) ||
      (a.status === "resolved" && !String(a.resolution_note).trim())
    )
      throw Error("Invalid corrective action.");
    actions.add(String(a.id));
  }
  for (const h of r.data.action_history!)
    if (!uuid(h.id) || !actions.has(String(h.action_id)))
      throw Error("Invalid action history.");
  if (life[0]?.status === "completed")
    for (const i of w.items)
      if (
        d.responses[i.id]?.result === "fail" &&
        !r.data.corrective_actions!.some((a) => a.item_id === i.id)
      )
        throw Error("Failure action missing.");
  for (const a of photos(r))
    if (
      !uuid(a.id) ||
      a.inspection_id !== r.id ||
      a.kind !== "photo" ||
      !ids.has(a.item_id) ||
      a.bytes < 1 ||
      a.bytes > 1000000 ||
      !/^[a-f0-9]{64}$/.test(a.hash) ||
      !["ready", "deleted"].includes(a.state) ||
      (a.action_id && !actions.has(a.action_id))
    )
      throw Error("Photo manifest invalid.");
  return r;
}
export function immutable(before: RecordData, after: RecordData) {
  if (key(before) !== key(after) || before.siteId !== after.siteId)
    throw Error("Business scope cannot change.");
  for (const t of ["template_versions", "action_history"])
    for (const old of before.data[t] ?? [])
      if (!after.data[t]?.some((n) => canonical(n) === canonical(old)))
        throw Error("History cannot change or disappear.");
  if (before.data.inspection_lifecycle?.[0]?.status === "completed")
    for (const t of [
      "inspection_drafts",
      "inspection_context",
      "inspection_lifecycle",
    ])
      if (canonical(before.data[t]) !== canonical(after.data[t]))
        throw Error("Completed history is immutable; create a correction.");
  for (const a of photos(before)) {
    const n = photos(after).find((x) => x.id === a.id);
    if (
      !n ||
      a.hash !== n.hash ||
      a.item_id !== n.item_id ||
      a.action_id !== n.action_id ||
      (a.state === "deleted" && n.state !== "deleted")
    )
      throw Error("Evidence identity/tombstone cannot change.");
  }
}
