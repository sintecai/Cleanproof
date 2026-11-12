import test from 'node:test';
import assert from 'node:assert/strict';
import { changeResponse, counts, createDraft, demo, MAX_NOTE_LENGTH, parseDraft, reviewDraft } from '../src/domain/inspection.ts';
const now = '2026-10-20T12:00:00.000Z';
test('incomplete drafts save, but review identifies every unanswered item', () => {
  const draft = createDraft(demo, now);
  assert.equal(parseDraft(draft, demo).responses.floors?.result, null);
  assert.equal(reviewDraft(draft, demo).length, 5);
});
test('Fail and N/A require explanation; Pass does not; all-N/A has no pass claims', () => {
  let draft = createDraft(demo, now);
  for (const item of demo.items) draft = changeResponse(draft, item.id, { result: 'pass' }, demo);
  assert.deepEqual(reviewDraft(draft, demo), []);
  draft = changeResponse(draft, 'floors', { result: 'fail', note: '  ' }, demo);
  assert.equal(reviewDraft(draft, demo)[0]?.itemId, 'floors');
  for (const item of demo.items) draft = changeResponse(draft, item.id, { result: 'na', note: 'Area not part of demo contract.' }, demo);
  assert.deepEqual(reviewDraft(draft, demo), []);
  assert.deepEqual(counts(draft), { answered: 5, pass: 0, fail: 0, na: 5, total: 5 });
});
test('reject forged scope, invalid outcomes, unexpected items and oversized notes', () => {
  const draft = createDraft(demo, now);
  assert.throws(() => parseDraft({ ...draft, companyId: '55555555-5555-4555-8555-555555555555' }, demo));
  assert.throws(() => parseDraft({ ...draft, role: 'owner' }, demo));
  assert.throws(() => changeResponse(draft, 'unknown', { result: 'pass' }, demo));
  assert.throws(() => changeResponse(draft, 'floors', { result: 'bad' as never }, demo));
  assert.throws(() => changeResponse(draft, 'floors', { note: 'x'.repeat(MAX_NOTE_LENGTH + 1) }, demo));
});
test('quotes, Unicode and multiline notes are preserved as data', () => {
  const draft = changeResponse(createDraft(demo, now), 'floors', { note: "£29 — café\n'); DROP TABLE outbox; --" }, demo);
  assert.equal(parseDraft(draft, demo).responses.floors?.note, draft.responses.floors?.note);
});
