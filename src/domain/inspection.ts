export type Result = 'pass' | 'fail' | 'na';
export interface ChecklistItem { id: string; title: string; section?: string }
export interface Response { result: Result | null; note: string }
export interface InspectionDraft {
  id: string;
  companyId: string;
  siteId: string;
  templateVersionId: string;
  responses: Record<string, Response>;
  createdAt: string;
  updatedAt: string;
}
export interface DemoWorkspace {
  companyId: string;
  companyName: string;
  siteId: string;
  siteName: string;
  templateVersionId: string;
  templateName: string;
  inspectionId: string;
  items: readonly ChecklistItem[];
}
export const demo: DemoWorkspace = {
  companyId: '11111111-1111-4111-8111-111111111111',
  companyName: 'Demo Alder Cleaning',
  siteId: '22222222-2222-4222-8222-222222222222',
  siteName: 'Demo North Office',
  templateVersionId: '33333333-3333-4333-8333-333333333333',
  templateName: 'Office essentials · v1',
  inspectionId: '44444444-4444-4444-8444-444444444444',
  items: [
    { id: 'floors', title: 'Floors are clean and free of debris' },
    { id: 'surfaces', title: 'Accessible surfaces have been wiped' },
    { id: 'bins', title: 'Waste bins have been emptied' },
    { id: 'washrooms', title: 'Washroom sinks and taps are clean' },
    { id: 'supplies', title: 'Agreed washroom supplies are stocked' },
  ],
};
export const MAX_NOTE_LENGTH = 2000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
function exactKeys(value: Record<string, unknown>, expected: string[]) {
  const actual = Object.keys(value).sort();
  if (actual.join('|') !== [...expected].sort().join('|')) throw new Error('Draft has unexpected or missing fields.');
}
export function createDraft(workspace: DemoWorkspace, now: string): InspectionDraft {
  const draft: InspectionDraft = {
    id: workspace.inspectionId, companyId: workspace.companyId,
    siteId: workspace.siteId, templateVersionId: workspace.templateVersionId,
    responses: Object.fromEntries(workspace.items.map((item) => [item.id, { result: null, note: '' }])),
    createdAt: now, updatedAt: now,
  };
  return parseDraft(draft, workspace);
}
/** Validation intentionally permits incomplete drafts; review enforces completion. */
export function parseDraft(value: unknown, workspace: DemoWorkspace): InspectionDraft {
  if (!isObject(value)) throw new Error('Invalid draft.');
  exactKeys(value, ['id', 'companyId', 'siteId', 'templateVersionId', 'responses', 'createdAt', 'updatedAt']);
  for (const field of ['id', 'companyId', 'siteId', 'templateVersionId'] as const) {
    if (typeof value[field] !== 'string' || !uuid.test(value[field])) throw new Error('Invalid draft identifier.');
    const expected = field === 'id' ? workspace.inspectionId : workspace[field];
    if (value[field] !== expected) throw new Error('Draft belongs to another workspace.');
  }
  for (const field of ['createdAt', 'updatedAt'] as const) {
    if (typeof value[field] !== 'string' || !Number.isFinite(Date.parse(value[field]))) throw new Error('Invalid draft date.');
  }
  if (!isObject(value.responses)) throw new Error('Invalid draft responses.');
  exactKeys(value.responses, workspace.items.map((item) => item.id));
  const responses: Record<string, Response> = {};
  for (const item of workspace.items) {
    const response = value.responses[item.id];
    if (!isObject(response)) throw new Error('Invalid response.');
    exactKeys(response, ['result', 'note']);
    if (![null, 'pass', 'fail', 'na'].includes(response.result as Result | null)) throw new Error('Invalid outcome.');
    if (typeof response.note !== 'string' || response.note.length > MAX_NOTE_LENGTH) throw new Error('Invalid note length.');
    responses[item.id] = { result: response.result as Result | null, note: response.note };
  }
  return { id: value.id as string, companyId: value.companyId as string, siteId: value.siteId as string,
    templateVersionId: value.templateVersionId as string, responses,
    createdAt: value.createdAt as string, updatedAt: value.updatedAt as string };
}
export function changeResponse(draft: InspectionDraft, itemId: string, patch: Partial<Response>, workspace: DemoWorkspace): InspectionDraft {
  const old = draft.responses[itemId];
  if (!old || !workspace.items.some((item) => item.id === itemId)) throw new Error('Unknown checklist item.');
  return parseDraft({ ...draft, responses: { ...draft.responses, [itemId]: { ...old, ...patch } } }, workspace);
}
export interface ReviewIssue { itemId: string; message: string }
export function reviewDraft(draft: InspectionDraft, workspace: DemoWorkspace): ReviewIssue[] {
  const parsed = parseDraft(draft, workspace);
  return workspace.items.flatMap((item): ReviewIssue[] => {
    const response = parsed.responses[item.id]!;
    if (!response.result) return [{ itemId: item.id, message: 'Choose Pass, Fail or N/A.' }];
    if (response.result === 'fail' && !response.note.trim()) return [{ itemId: item.id, message: 'Explain the failure in the note.' }];
    if (response.result === 'na' && !response.note.trim()) return [{ itemId: item.id, message: 'Explain why this item is not applicable.' }];
    return [];
  });
}
export function counts(draft: InspectionDraft) {
  const values = Object.values(draft.responses);
  return { answered: values.filter((v) => v.result !== null).length,
    pass: values.filter((v) => v.result === 'pass').length,
    fail: values.filter((v) => v.result === 'fail').length,
    na: values.filter((v) => v.result === 'na').length, total: values.length };
}
