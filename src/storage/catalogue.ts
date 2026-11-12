import {validatedChecklist,validatedChecklistItems} from '../domain/checklistValidation.ts';
import { createDraft, demo } from "../domain/inspection.ts";
import type { ChecklistItem, DemoWorkspace } from "../domain/inspection.ts";
import {BusinessAccess} from "../sync/business/access.ts";
import type { Connection, TransactionalDatabase } from "./contracts.ts";
export type Customer = {
  id: string;
  name: string;
  contact: string;
  archived: number;
};
export type Site = {
  id: string;
  customer_id: string;
  name: string;
  address: string;
  timezone: string;
  notes: string;
  archived: number;
};
export type Template = { id: string; name: string; archived: number };
export type Version = {
  id: string;
  template_id: string;
  version: number;
  name: string;
  items_json: string;
};
export type Context = {
  workspace: DemoWorkspace;
  customerName: string;
  address: string;
  timezone: string;
};
export function text(value: string, max: number, required = false) {
  const v = value.trim();
  if (v.length > max || (required && !v))
    throw Error(`Enter ${required ? "1–" : "at most "}${max} characters.`);
  return v;
}
export function validateItems(items:readonly ChecklistItem[]){return validatedChecklistItems(items,false);}

export class Catalogue {
  constructor(
    private db: TransactionalDatabase,
    readonly companyId: string,
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
      this.companyId,
      entity,
      kind,
      JSON.stringify(payload),
      this.now(),
    );
  }
  async seed() {
    await this.db.transaction(async (tx) => {
      const customer = "55555555-5555-4555-8555-555555555555";
      await tx.runAsync(
        "INSERT OR IGNORE INTO customers(id,company_id,name,contact) VALUES(?,?,?,?)",
        customer,
        this.companyId,
        "Demo North Offices",
        "office@example.test",
      );
      await tx.runAsync(
        "INSERT OR IGNORE INTO sites(id,company_id,customer_id,name,address,timezone,notes) VALUES(?,?,?,?,?,?,?)",
        demo.siteId,
        this.companyId,
        customer,
        demo.siteName,
        "1 Example Street",
        "Europe/London",
        "Synthetic premises only",
      );
      const starters = [
        {
          id: demo.templateVersionId,
          name: "Office general areas",
          items: demo.items,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          name: "Washrooms",
          items: [
            { id: "sinks", title: "Sinks and taps are clean" },
            { id: "toilets", title: "Toilets are clean" },
            { id: "stock", title: "Agreed supplies are stocked" },
          ],
        },
        {
          id: "77777777-7777-4777-8777-777777777777",
          name: "Kitchen or break area",
          items: [
            { id: "worktops", title: "Worktops are clean" },
            { id: "sink", title: "Sink is clean" },
            { id: "waste", title: "Waste is removed" },
          ],
        },
      ];
      for (const t of starters) {
        await tx.runAsync(
          "INSERT OR IGNORE INTO templates(id,company_id,name) VALUES(?,?,?)",
          t.id,
          this.companyId,
          t.name,
        );
        await tx.runAsync(
          "INSERT OR IGNORE INTO template_versions VALUES(?,?,?,?,?,?)",
          t.id,
          this.companyId,
          t.id,
          1,
          t.name,
          JSON.stringify(t.items),
        );
      }
      // All CP001 IDs and payloads remain unchanged; add an immutable historical context beside them.
      await tx.runAsync(
        "INSERT OR IGNORE INTO inspection_context VALUES(?,?,?,?,?,?)",
        demo.inspectionId,
        this.companyId,
        JSON.stringify(demo),
        "Demo North Offices",
        "1 Example Street",
        "Europe/London",
      );
    });
  }
  customers() {
    return this.db.getAllAsync<Customer>(
      "SELECT id,name,contact,archived FROM customers WHERE company_id=? ORDER BY name",
      this.companyId,
    );
  }
  sites() {
    return this.db.getAllAsync<Site>(
      "SELECT id,customer_id,name,address,timezone,notes,archived FROM sites WHERE company_id=? ORDER BY name",
      this.companyId,
    );
  }
  templates() {
    return this.db.getAllAsync<Template>(
      "SELECT id,name,archived FROM templates WHERE company_id=? ORDER BY name",
      this.companyId,
    );
  }
  versions() {
    return this.db.getAllAsync<Version>(
      "SELECT id,template_id,version,name,items_json FROM template_versions WHERE company_id=? ORDER BY version DESC",
      this.companyId,
    );
  }
  /** Company-scoped choices for offline inspection creation. A saved immutable
   * version is published for local use; server availability still needs sync. */
  async inspectionOptions(){
    const [sites,templates,versions,binding]=await Promise.all([
      this.db.getAllAsync<Site>('SELECT s.* FROM sites s JOIN customers c ON c.id=s.customer_id AND c.company_id=s.company_id WHERE s.company_id=? AND s.archived=0 AND c.archived=0 ORDER BY s.name',this.companyId),
      this.templates(),this.versions(),
      this.db.getFirstAsync<{role:string;local_company:string}>('SELECT role,local_company FROM business_binding')
    ]);
    const checklists:(Version&{itemCount:number})[]=[];
    let incomplete=0,invalid=0;
    for(const template of templates.filter(t=>!t.archived)){
      const version=versions.filter(v=>v.template_id===template.id).sort((a,b)=>b.version-a.version)[0];
      if(!version){incomplete++;continue;}
      try{const items=validateItems(JSON.parse(version.items_json));if(!Number.isSafeInteger(version.version)||version.version<1)throw Error();checklists.push({...version,itemCount:items.length});}
      catch{invalid++;}
    }
    return {sites,checklists,incomplete,invalid,archived:templates.filter(t=>t.archived).length,canCreate:!binding||(binding.local_company===this.companyId&&binding.role==='owner')};
  }
  history() {
    return this.db.getAllAsync<{
      id: string;
      local_revision: number;
      saved_at: string | null;
      workspace_json: string;
    }>(
      "SELECT d.id,d.local_revision,d.saved_at,c.workspace_json FROM inspection_drafts d JOIN inspection_context c ON c.inspection_id=d.id AND c.company_id=d.company_id WHERE d.company_id=? ORDER BY d.rowid DESC",
      this.companyId,
    );
  }
  async customer(name: string, contact: string, id = this.id()) {
    await new BusinessAccess(this.db).owner();
    name = text(name, 120, true);
    contact = text(contact, 240);
    await this.db.transaction(async (tx) => {
      const existing = await tx.getFirstAsync<{ company_id: string }>(
        "SELECT company_id FROM customers WHERE id=?",
        id,
      );
      if (existing && existing.company_id !== this.companyId)
        throw Error("Invalid company scope");
      await tx.runAsync(
        "INSERT INTO customers(id,company_id,name,contact) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,contact=excluded.contact",
        id,
        this.companyId,
        name,
        contact,
      );
      await this.event(tx, id, "customer_saved_v1", { id, name, contact });
    });
    return id;
  }
  async site(
    customerId: string,
    name: string,
    address: string,
    timezone: string,
    notes: string,
    id = this.id(),
  ) {
    await new BusinessAccess(this.db).owner();
    name = text(name, 120, true);
    address = text(address, 500);
    notes = text(notes, 2000);
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      throw Error("Use a valid IANA timezone.");
    }
    await this.db.transaction(async (tx) => {
      const parent = await tx.getFirstAsync(
        "SELECT id FROM customers WHERE company_id=? AND id=? AND archived=0",
        this.companyId,
        customerId,
      );
      if (!parent) throw Error("Choose an active customer.");
      const old = await tx.getFirstAsync<{ company_id: string }>(
        "SELECT company_id FROM sites WHERE id=?",
        id,
      );
      if (old && old.company_id !== this.companyId)
        throw Error("Invalid company scope");
      if (!old) {
        const n = await tx.getFirstAsync<{ n: number }>(
          "SELECT COUNT(*) n FROM sites WHERE company_id=? AND archived=0",
          this.companyId,
        );
        if ((n?.n ?? 0) >= 10)
          throw Error("Local demo limit: ten active sites.");
      }
      await tx.runAsync(
        "INSERT INTO sites(id,company_id,customer_id,name,address,timezone,notes) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET customer_id=excluded.customer_id,name=excluded.name,address=excluded.address,timezone=excluded.timezone,notes=excluded.notes",
        id,
        this.companyId,
        customerId,
        name,
        address,
        timezone,
        notes,
      );
      await this.event(tx, id, "site_saved_v1", {
        id,
        customerId,
        name,
        address,
        timezone,
        notes,
      });
    });
    return id;
  }
  async archive(kind: "customers" | "sites" | "templates", id: string) {
    await new BusinessAccess(this.db).owner();
    await this.db.transaction(async (tx) => {
      if (kind === "customers")
        await tx.runAsync(
          "UPDATE sites SET archived=1 WHERE company_id=? AND customer_id=?",
          this.companyId,
          id,
        );
      const r = await tx.runAsync(
        `UPDATE ${kind} SET archived=1 WHERE company_id=? AND id=?`,
        this.companyId,
        id,
      );
      if (r.changes !== 1) throw Error("Record unavailable");
      await this.event(tx, id, "archive_v1", { kind, id });
    });
  }
  async template(
    name: string,
    items: readonly ChecklistItem[],
    templateId = this.id(),
    versionId = this.id(),
  ) {
    await new BusinessAccess(this.db).owner();
    const checked=validatedChecklist(name,items);name=checked.name;
    const clean=checked.items;
    await this.db.transaction(async (tx) => {
      const published=await tx.getFirstAsync<Version&{company_id:string}>('SELECT * FROM template_versions WHERE id=?',versionId);
      if(published){
        if(published.company_id!==this.companyId||published.template_id!==templateId||published.name!==name||published.items_json!==JSON.stringify(clean))throw Error('This publication request already saved different content. Reopen the checklist before editing.');
        return;
      }
      const old = await tx.getFirstAsync<{
        company_id: string;
        archived: number;
      }>("SELECT company_id,archived FROM templates WHERE id=?", templateId);
      if (old && (old.company_id !== this.companyId || old.archived))
        throw Error("Template unavailable");
      await tx.runAsync(
        "INSERT INTO templates(id,company_id,name) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name",
        templateId,
        this.companyId,
        name,
      );
      const row = await tx.getFirstAsync<{ v: number }>(
        "SELECT COALESCE(MAX(version),0) v FROM template_versions WHERE company_id=? AND template_id=?",
        this.companyId,
        templateId,
      );
      await tx.runAsync(
        "INSERT INTO template_versions VALUES(?,?,?,?,?,?)",
        versionId,
        this.companyId,
        templateId,
        (row?.v ?? 0) + 1,
        name,
        JSON.stringify(clean),
      );
      await this.event(tx, versionId, "template_version_created_v1", {
        templateId,
        versionId,
        name,
        items: clean,
      });
    });
    return versionId;
  }
  async context(id: string): Promise<Context> {
    const c = await this.db.getFirstAsync<{
      workspace_json: string;
      customer_name: string;
      address: string;
      timezone: string;
    }>(
      "SELECT workspace_json,customer_name,address,timezone FROM inspection_context WHERE company_id=? AND inspection_id=?",
      this.companyId,
      id,
    );
    if (!c) throw Error("Inspection unavailable");
    return {
      workspace: JSON.parse(c.workspace_json),
      customerName: c.customer_name,
      address: c.address,
      timezone: c.timezone,
    };
  }
  async newDraft(siteId: string, versionId: string, id = this.id()) {
    if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw Error("Invalid inspection creation request.");
    await this.db.transaction(async (tx) => {
      const prior=await tx.getFirstAsync<{company_id:string;site_id:string;workspace_json:string}>(
        'SELECT d.company_id,d.site_id,c.workspace_json FROM inspection_drafts d JOIN inspection_context c ON c.inspection_id=d.id AND c.company_id=d.company_id WHERE d.id=?',id);
      if(prior){
        if(prior.company_id!==this.companyId||prior.site_id!==siteId||JSON.parse(prior.workspace_json).templateVersionId!==versionId)throw Error('Inspection request belongs to different selections. Existing work is preserved.');
        return;
      }
      const s = await tx.getFirstAsync<Site & { customer_name: string }> (
        "SELECT s.*,c.name customer_name FROM sites s JOIN customers c ON c.id=s.customer_id AND c.company_id=s.company_id WHERE s.company_id=? AND s.id=? AND s.archived=0 AND c.archived=0",
        this.companyId,
        siteId,
      );
      const v = await tx.getFirstAsync<Version>(
        "SELECT v.* FROM template_versions v JOIN templates t ON t.id=v.template_id AND t.company_id=v.company_id WHERE v.company_id=? AND v.id=? AND t.archived=0",
        this.companyId,
        versionId,
      );
      if (!s || !v) throw Error("Choose an active site and template version.");
      const companyBrand=await tx.getFirstAsync<{name:string}>('SELECT name FROM company_settings WHERE company_id=?',this.companyId);
      const w: DemoWorkspace = {
        ...demo,
        companyName: companyBrand?.name ?? (this.companyId===demo.companyId ? demo.companyName : ''),
        companyId: this.companyId,
        siteId: s.id,
        siteName: s.name,
        inspectionId: id,
        templateVersionId: v.id,
        templateName: `${v.name} · v${v.version}`,
        items: validateItems(JSON.parse(v.items_json)),
      };
      const draft = createDraft(w, this.now());
      await tx.runAsync(
        "INSERT INTO inspection_drafts VALUES(?,?,?,?,0,NULL)",
        id,
        this.companyId,
        siteId,
        JSON.stringify(draft),
      );
      await tx.runAsync(
        "INSERT INTO inspection_context VALUES(?,?,?,?,?,?)",
        id,
        this.companyId,
        JSON.stringify(w),
        s.customer_name,
        s.address,
        s.timezone,
      );
      await this.event(tx, id, "draft_created_v1", { draft, workspace: w });
    });
    return id;
  }
}
