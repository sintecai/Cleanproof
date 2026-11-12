import {closePdfExport} from './pdfExport.web';
// Browser-local report document. Native report generation stays unchanged.
let documentHtml: string | null = null;
const listeners = new Set<() => void>();
export function closeReportPreviews() {
  documentHtml = null;
  closePdfExport();
  for (const listener of listeners) listener();
}
export function showReportPreview(html: string) {
  closePdfExport();
  documentHtml = html;
  for (const listener of listeners) listener();
}
export function reportPreviewSnapshot() { return documentHtml; }
export function subscribeReportPreview(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
