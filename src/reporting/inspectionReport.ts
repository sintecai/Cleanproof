import type { ReportData } from "../storage/workflowRepository.ts";
import { score, displayDate } from "../domain/workflow.ts";
import { escapeHtml } from "./demoReport.ts";
export type ReportPhoto = {
  id: string;
  itemId: string;
  caption: string;
  base64: string;
  actionId?: string | null;
};
function chunks(text: string) {
  if (!text) return [""];
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + 750, text.length);
    let lines = 0;
    for (let i = start; i < end; i++)
      if (text[i] === "\n" && ++lines >= 15) {
        end = i + 1;
        break;
      }
    out.push(text.slice(start, end));
    start = end;
  }
  return out;
}
export function inspectionReport(
  data: ReportData,
  photos: ReportPhoto[],
  missing: string[] = [],
) {
  const e = escapeHtml,
    c = score(data.draft),
    w = data.context.workspace;
  for (const p of photos)
    if (
      !/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64) ||
      !w.items.some((i) => i.id === p.itemId)
    )
      throw Error("Invalid report photograph.");
  const short = (value: string, max: number) =>
    value.length > max ? value.slice(0, max - 3) + "..." : value;
  const longDetails =
    data.branding.name.length > 70 ||
    data.branding.contact.length > 100 ||
    data.context.address.length > 170;
  const ref = `CP-${data.draft.id.slice(0, 8).toUpperCase()}`;
  const status =
    data.status === "completed" ? "COMPLETED LOCALLY" : "DRAFT - NOT COMPLETED";
  const pages: string[] = [];
  const context = `<div class="context"><div><span class="label">CUSTOMER</span><h2>${e(data.context.customerName)}</h2><span class="label">SITE</span><h2>${e(w.siteName)}</h2><p>${e(short(data.context.address || "Address not recorded", 170))}</p></div><div><span class="label">INSPECTION DATE</span><p>${e(displayDate(data.completedAt ?? data.draft.updatedAt, data.context.timezone))}</p><span class="label">INSPECTOR</span><p>${e(data.inspector || "Not yet recorded")}</p><span class="label">CHECKLIST</span><p>${e(w.templateName)}</p></div></div>`;
  pages.push(
    `<p class="eyebrow">CLEANING QUALITY RECORD</p><h1>Inspection report</h1><div class="status">${status}</div>${context}<table class="scores"><tr><td><strong>${c.pass}</strong>Pass</td><td><strong>${c.fail}</strong>Fail</td><td><strong>${c.na}</strong>N/A</td><td><strong>${c.percentage === null ? "-" : c.percentage + "%"}</strong>Pass rate</td></tr></table><p class="small">${c.answered} of ${c.total} items answered. Pass rate = Pass ÷ (Pass + Fail); N/A and unanswered items are excluded. ${c.percentage === null ? "No applicable answers: no percentage is reported." : ""}</p><div class="summary"><h2>${c.fail ? "Follow-up required" : "Inspection summary"}</h2><p>${c.fail ? `${c.fail} failed item${c.fail === 1 ? "" : "s"} recorded. See the checklist findings and corrective actions.` : c.answered < c.total ? "This inspection is still in progress. Unanswered items are shown in the findings." : "No failed items recorded in this inspection."}</p><p>${data.actions.filter((a) => a.status === "open").length} open corrective action(s) as of ${e(displayDate(data.generatedAt, data.context.timezone))}.</p></div>${data.correctionOf ? `<p class="small">Correction of CP-${e(data.correctionOf.slice(0, 8).toUpperCase())}: ${e(data.correctionReason)}</p>` : ""}${missing.length ? '<p class="alert">Some photographs are unavailable. This preview is incomplete and PDF generation is blocked until evidence is recovered.</p>' : ""}`,
  );
  if (longDetails)
    pages.push(
      `<h1 class="section-title">Company & site details</h1><h2>${e(data.branding.name)}</h2><p class="note">${e(data.branding.contact)}</p><h2>${e(data.context.customerName)}</h2><h2>${e(w.siteName)}</h2><p class="note">${e(data.context.address)}</p><p class="small">Timezone: ${e(data.context.timezone)}</p>`,
    );
  let body = "",
    height = 0;
  const flush = () => {
    if (body) {
      pages.push('<h1 class="section-title">Checklist findings</h1>' + body);
      body = "";
      height = 0;
    }
  };
  w.items.forEach((i, index) => {
    const r = data.draft.responses[i.id]!;
    chunks(r.note).forEach((chunk, n) => {
      const h =
        90 +
        Math.ceil(i.title.length / 65) * 18 +
        Math.max(chunk.split("\n").length, Math.ceil(chunk.length / 70)) * 17;
      if (height + h > 680) flush();
      body += `<div class="finding"><div class="finding-head"><span class="number">${index + 1}</span><h2>${e(i.title)}${n ? " (continued)" : ""}</h2><span class="result ${r.result ?? "unanswered"}">${r.result === "pass" ? "PASS" : r.result === "fail" ? "FAIL" : r.result === "na" ? "N/A" : "UNANSWERED"}</span></div>${i.section ? `<p class="small">${e(i.section)}</p>` : ""}<p class="note">${e(chunk || "No comment recorded.")}</p></div>`;
      height += h;
    });
  });
  flush();
  for (const p of photos) {
    const item = w.items.find((i) => i.id === p.itemId)!;
    pages.push(
      `<h1 class="section-title">${p.actionId ? "Corrective-action evidence" : "Photographic evidence"}</h1><h2>${e(item.title)}</h2><figure><img src="data:image/jpeg;base64,${p.base64}" alt="Inspection evidence"/><figcaption>${e(p.caption || "Inspection photograph")}</figcaption></figure><p class="small">Evidence recorded on the device; not independently verified. Reference ${e(p.id.slice(0, 8))}.</p>`,
    );
  }
  if (data.actions.length) {
    let actionsBody = "",
      used = 0;
    const finish = () => {
      if (actionsBody) {
        pages.push(
          '<h1 class="section-title">Corrective actions</h1><p class="small">Status as of report generation. Assignment does not imply a notification was sent.</p>' +
            actionsBody,
        );
        actionsBody = "";
        used = 0;
      }
    };
    for (const a of data.actions) {
      const text = [
        ...chunks(a.description),
        ...(a.resolution_note ? chunks(a.resolution_note) : []),
      ];
      text.forEach((chunk, n) => {
        const h =
          150 +
          Math.max(chunk.split("\n").length, Math.ceil(chunk.length / 70)) * 17;
        if (used + h > 560) finish();
        actionsBody += `<div class="action"><p class="label">${e(a.status.toUpperCase())} · ${e(a.id.slice(0, 8))}${n ? " · CONTINUED" : ""}</p><p class="note">${e(chunk)}</p><p class="small">Responsible: ${e(a.owner_name)} · Due ${e(displayDate(a.due_date, data.context.timezone))}<br/>${e(w.items.find((i) => i.id === a.item_id)?.title ?? "Linked finding")}${a.resolved_at ? `<br/>Resolved ${e(displayDate(a.resolved_at, data.context.timezone))}` : ""}</p></div>`;
        used += h;
      });
    }
    finish();
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ref} Inspection report</title><style>@page{size:A4;margin:14mm 16mm}*{box-sizing:border-box}body{margin:0;font:10.5pt/1.5 Arial,sans-serif;color:#172b4d;background:#f8f9ff}h1,h2,p{margin:0 0 10px}h1{font-size:30pt;line-height:1.16;color:#0b1c30}h2{font-size:13pt;line-height:1.4;color:#0b1c30;overflow-wrap:anywhere}.sheet{background:white;width:210mm;max-width:calc(100% - 32px);min-height:297mm;margin:24px auto;padding:14mm 16mm;display:flex;flex-direction:column;box-shadow:0 3px 18px #0b1c3014;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}.header{display:table;width:100%;border-bottom:2px solid #006c49;padding:0 0 15px;margin-bottom:22px}.brand{display:table-cell;font-size:17pt;font-weight:bold;color:#0b1c30;width:70%;overflow-wrap:anywhere}.brand small{display:block;font-size:9pt;font-weight:normal;color:#526477}.reference{display:table-cell;vertical-align:top;overflow-wrap:anywhere;text-align:right;font-size:9pt;color:#526477}.eyebrow,.label{font-size:8pt;letter-spacing:1px;color:#526477;font-weight:bold}.status{display:inline-block;padding:7px 12px;background:#ddf8ec;color:#006c49;font-size:9pt;font-weight:bold;margin:12px 0 22px}.context{display:table;width:100%;margin-bottom:24px}.context>div{display:table-cell;width:54%;padding-right:20px;vertical-align:top}.context>div+div{width:46%;padding-right:0}.context p{white-space:pre-wrap;overflow-wrap:anywhere}.scores{width:100%;border-collapse:collapse;background:#eff4ff;margin:10px 0 12px}.scores td{padding:14px 8px;text-align:center;width:25%;font-size:9pt;color:#526477}.scores strong{display:block;font-size:25pt;color:#0b1c30}.small{font-size:9pt;color:#526477;overflow-wrap:anywhere}.summary{border-left:4px solid #006c49;background:#eff4ff;padding:16px;margin:22px 0}.summary p{margin-bottom:6px}.alert{color:#9d302d;border:1px solid #d9aaa6;padding:10px}.section-title{font-size:22pt;margin-bottom:23px}.finding{border-bottom:1px solid #e2e8f0;padding:0 0 13px;margin-bottom:17px}.finding-head{display:table;width:100%;margin-bottom:9px}.finding-head h2{display:table-cell;width:76%;padding:0 12px}.number{display:table-cell;color:#006c49;font-weight:bold;width:5%}.result{display:table-cell;text-align:right;font-size:8pt;font-weight:bold}.pass{color:#006c49}.fail{color:#9d302d}.na,.unanswered{color:#78520a}.note{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}figure{margin:18px 0;break-inside:avoid}img{display:block;max-width:100%;max-height:160mm;width:auto;height:auto;object-fit:contain;margin:0 auto 14px}figcaption{font-size:10pt;color:#526477;overflow-wrap:anywhere}.action{border:1px solid #e2e8f0;padding:14px;margin:15px 0}.page-content{flex:1;min-width:0}.footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:9px;display:block;width:100%;font-size:8pt;color:#526477}.footer>span{display:inline-block;vertical-align:top;width:80%}.footer>span+span{width:20%;text-align:right}@media screen and (max-width:600px){.sheet{max-width:100%;width:100%;min-height:0;margin:0 0 16px;padding:24px 20px;box-shadow:none}h1{font-size:25pt}.header{display:block}.brand{display:block;width:100%;font-size:16pt}.reference{display:block;text-align:left;margin-top:10px}.context{display:block;margin-bottom:20px}.context>div,.context>div+div{display:block;width:100%;padding:0}.context>div+div{margin-top:18px}.scores td{padding:12px 4px;font-size:8pt}.scores strong{font-size:21pt}.footer>span{width:85%}.footer>span+span{width:15%}}@media print{body{background:white}.sheet{margin:0;padding:0;width:auto;max-width:none;min-height:266mm;box-shadow:none}.footer{break-inside:avoid}}</style></head><body>${pages.map((p, n) => `<section class="sheet"><header class="header"><div class="brand">${e(short(data.branding.name, 70))}<small>${e(short(data.branding.contact, 100))}</small></div><div class="reference">${ref}<br/>${status}</div></header><main class="page-content">${p}</main><footer class="footer"><span>Local inspection record · Not submitted or approved<br/>Generated ${e(displayDate(data.generatedAt, data.context.timezone))} · Exported copies cannot be revoked</span><span>${n + 1} / ${pages.length}</span></footer></section>`).join("")}</body></html>`;
}
