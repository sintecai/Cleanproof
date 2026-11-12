import { counts } from "../domain/inspection.ts";
import type { DemoWorkspace, InspectionDraft } from "../domain/inspection.ts";
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function demoReport(
  w: DemoWorkspace,
  d: InspectionDraft,
  photos: { itemId: string; caption: string; base64: string }[],
) {
  const c = counts(d);
  const denom = c.pass + c.fail;
  const score = denom
    ? `${Math.round((c.pass / denom) * 100)}% of applicable answered items passed`
    : "No applicable answered items — no percentage";
  for (const p of photos)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64))
      throw Error("Invalid embedded photo");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:18mm}body{font:11pt sans-serif;color:#15364b}h1{color:#087e80}p{white-space:pre-wrap;overflow-wrap:anywhere}.item{border-top:1px solid #ccd;padding:12px 0}figure{break-inside:avoid;margin:10px 0}img{max-width:100%;max-height:450px}footer{font-size:9pt;color:#567}</style></head><body><h1>CleanProof</h1><h2>DEMONSTRATION • INCOMPLETE DRAFT</h2><p>${escapeHtml(w.companyName)}\n${escapeHtml(w.siteName)}\n${escapeHtml(w.templateName)}\nReference ${escapeHtml(d.id)}\nSynthetic inspector • ${escapeHtml(d.updatedAt)}</p><p>${c.answered}/${c.total} answered · ${c.pass} Pass · ${c.fail} Fail · ${c.na} N/A</p><p>${score}</p>${w.items
    .map(
      (i) =>
        `<section class="item"><h3>${i.section ? `${escapeHtml(i.section)} · ` : ""}${escapeHtml(i.title)}</h3><b>${escapeHtml(d.responses[i.id]!.result ?? "Unanswered")}</b><p>${escapeHtml(d.responses[i.id]!.note)}</p>${photos
          .filter((p) => p.itemId === i.id)
          .map(
            (p) =>
              `<figure><img src="data:image/jpeg;base64,${p.base64}"/><figcaption>${escapeHtml(p.caption)}</figcaption></figure>`,
          )
          .join("")}</section>`,
    )
    .join(
      "",
    )}<footer>Local compatibility sample. Not submitted or approved. No secure client link. Exported copies cannot be revoked.</footer></body></html>`;
}
