import test from 'node:test';
import assert from 'node:assert/strict';
import { DraftEditor } from '../src/application/draftEditor.ts';
import { createDraft, demo } from '../src/domain/inspection.ts';
import type { DraftRepository, SavedDraft } from '../src/storage/contracts.ts';
const initial = (): SavedDraft => ({ draft: createDraft(demo, '2026-10-20T12:00:00.000Z'), savedAt: null, localRevision: 0, pendingOperations: 0 });
const deferred = () => { let release!: () => void; const promise = new Promise<void>((resolve) => { release = resolve; }); return { release, promise }; };
test('a save acknowledgment never replaces newer text or labels it saved prematurely', async () => {
  const gate = deferred(); let calls = 0;
  const repository: DraftRepository = { load: async () => initial(), save: async (draft, revision) => {
    calls++; if (calls === 1) await gate.promise;
    return { draft, localRevision: revision + 1, pendingOperations: revision + 1, savedAt: '2026-10-20T12:00:01.000Z' };
  } };
  const phases: string[] = [];
  const editor = new DraftEditor(repository, initial(), demo, (state) => phases.push(state.phase), 10000);
  editor.edit('floors', { note: 'first' }); const save = editor.flush();
  editor.edit('floors', { note: 'newer' }); void editor.flush();
  assert.notEqual(editor.snapshot.phase, 'saved'); gate.release(); await save;
  assert.equal(editor.snapshot.phase, 'saved'); assert.equal(editor.snapshot.draft.responses.floors?.note, 'newer'); assert.equal(calls, 2); assert.equal(editor.snapshot.pendingOperations, 2);
  await editor.dispose();
});
test('failed save retains the current form and never announces success; retry works', async () => {
  let fail = true;
  const repository: DraftRepository = { load: async () => initial(), save: async (draft, revision) => {
    if (fail) throw Error('disk failure');
    return { draft, localRevision: revision + 1, pendingOperations: 1, savedAt: '2026-10-20T12:00:01.000Z' };
  } };
  const editor = new DraftEditor(repository, initial(), demo, () => undefined, 10000);
  editor.edit('floors', { result: 'fail', note: 'Needs recleaning' }); await editor.flush();
  assert.equal(editor.snapshot.phase, 'error'); assert.equal(editor.snapshot.savedAt, null); assert.equal(editor.snapshot.draft.responses.floors?.note, 'Needs recleaning');
  fail = false; await editor.flush(); assert.equal(editor.snapshot.phase, 'saved'); assert.equal(editor.snapshot.pendingOperations, 1); await editor.dispose();
});
test('note edits are not acknowledged before their durable repository save', async () => {
  let calls = 0;
  const repository: DraftRepository = { load: async () => initial(), save: async (draft, revision) => {
    calls++; return { draft, localRevision: revision + 1, pendingOperations: 1, savedAt: '2026-10-20T12:00:01.000Z' };
  } };
  const editor = new DraftEditor(repository, initial(), demo, () => undefined, 10000);
  editor.edit('bins', { note: 'Typing' }); assert.equal(editor.snapshot.phase, 'unsaved'); assert.equal(calls, 0);
  await editor.flush(); assert.equal(calls, 1); assert.equal(editor.snapshot.phase, 'saved'); await editor.dispose();
});
