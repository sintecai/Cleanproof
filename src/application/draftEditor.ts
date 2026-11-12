import { changeResponse } from '../domain/inspection.ts';
import type { DemoWorkspace, InspectionDraft, Response } from '../domain/inspection.ts';
import type { DraftRepository, SavedDraft } from '../storage/contracts.ts';
export interface EditorState {
  draft: InspectionDraft;
  phase: 'new' | 'unsaved' | 'saving' | 'saved' | 'error';
  savedAt: string | null;
  pendingOperations: number;
}
const copyDraft = (draft: InspectionDraft): InspectionDraft => ({ ...draft,
  responses: Object.fromEntries(Object.entries(draft.responses).map(([key, value]) => [key, { ...value }])) });
/** A single writer. Newer UI edits are never replaced by an older async save. */
export class DraftEditor {
  private state: EditorState;
  private generation = 0;
  private committedGeneration = 0;
  private revision: number;
  private requested = false;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listener: (state: EditorState) => void;
  constructor(private readonly repository: DraftRepository, initial: SavedDraft,
    private readonly workspace: DemoWorkspace, listener: (state: EditorState) => void, private readonly delay = 400) {
    this.revision = initial.localRevision;
    this.state = { draft: initial.draft, phase: initial.savedAt ? 'saved' : 'new', savedAt: initial.savedAt, pendingOperations: initial.pendingOperations };
    this.listener = listener;
  }
  get snapshot(): EditorState { return { ...this.state, draft: copyDraft(this.state.draft) }; }
  private publish() { this.listener(this.snapshot); }
  edit(itemId: string, patch: Partial<Response>, immediate = false) {
    this.state.draft = changeResponse(this.state.draft, itemId, patch, this.workspace);
    this.generation++; this.state.phase = 'unsaved'; this.publish();
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (immediate) void this.flush();
    else this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, this.delay);
  }
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.generation === this.committedGeneration && !this.inFlight) return Promise.resolve();
    this.requested = true;
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.pump().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
  private async pump() {
    while (this.requested) {
      this.requested = false;
      const generation = this.generation;
      const draft = copyDraft(this.state.draft);
      this.state.phase = 'saving'; this.publish();
      try {
        const saved = await this.repository.save(draft, this.revision);
        this.revision = saved.localRevision;
        this.committedGeneration = generation;
        this.state.savedAt = saved.savedAt;
        this.state.pendingOperations = saved.pendingOperations;
        if (this.generation === generation) {
          this.state.draft = saved.draft;
          this.state.phase = 'saved';
        } else this.state.phase = 'unsaved';
      } catch {
        this.state.phase = 'error';
        this.requested = false; // Preserve current form; retry is explicit or a later edit.
        this.publish(); return;
      }
      this.publish();
    }
  }
  async dispose(): Promise<void> {
    await this.flush();
    this.listener = () => undefined;
  }
}
