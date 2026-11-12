import type { Operation, Receipt, PullPage } from "./protocol.ts";
import { validateOperation } from "./protocol.ts";
import { SyncStore } from "./store.ts";
export interface SyncTransport {
  authorise(company: string, user: string): Promise<void>;
  push(operation: Operation): Promise<Receipt>;
  pull(
    company: string,
    cursor: number,
    epoch: number | null,
  ): Promise<PullPage>;
}
/** One foreground worker per scoped store. Receipts/cursor survive restarts; no background delivery promise. */
export class SyncWorker {
  private running: Promise<void> | null = null;
  constructor(
    private store: SyncStore,
    private remote: SyncTransport,
  ) {}
  run() {
    return (this.running ??= this.perform().finally(() => {
      this.running = null;
    }));
  }
  private async perform() {
    await this.remote.authorise(this.store.companyId, this.store.userId);
    for (let count = 0; count < 100; count++) {
      const next = await this.store.next();
      if (!next) break;
      try {
        const o = validateOperation(JSON.parse(next.request_json));
        const r = await this.remote.push(o);
        await this.store.acknowledge(o, r);
      } catch (e) {
        await this.store.failed(
          next.operation_id,
          next.attempts,
          "Delivery was not acknowledged. Retry when connected.",
        );
        throw e;
      }
    }
    for (let count = 0; count < 100; count++) {
      const c = await this.store.cursor();
      const page = await this.remote.pull(
        this.store.companyId,
        c.cursor,
        c.epoch,
      );
      await this.store.applyPage(page);
      if (!page.resetRequired && page.cursor === page.head) return;
    }
    throw Error(
      "More changes remain. Retry to continue from the saved position.",
    );
  }
}
