import type { BusinessRepository, Binding } from "./repository.ts";
import type { Row, RecordData } from "./model.ts";
import { canonical } from "../protocol.ts";
/** Durable, bounded review snapshot inside the existing encrypted database. */
export class Adoption {
  constructor(
    private business: BusinessRepository,
    private id: () => string,
  ) {}
  async begin(company: string) {
    return this.business.db.transaction(async (tx) => {
      const generation = (await tx.getFirstAsync<{ generation: number }>(
        "SELECT generation FROM business_generation",
      ))!.generation;
      const old = await tx.getFirstAsync<{ id: string }>(
        "SELECT id FROM business_import_review WHERE company=? AND generation=? AND state IN ('capturing','complete') ORDER BY rowid DESC LIMIT 1",
        company,
        generation,
      );
      if (old) return old.id;
      const id = this.id();
      await tx.runAsync(
        "INSERT INTO business_import_review VALUES(?,?,?,'capturing')",
        id,
        company,
        generation,
      );
      return id;
    });
  }
  async step(id: string) {
    await this.business.db.transaction(async (tx) => {
      const review = await tx.getFirstAsync<{
        company: string;
        generation: number;
        state: string;
      }>("SELECT * FROM business_import_review WHERE id=?", id);
      const current = await tx.getFirstAsync<{ generation: number }>(
        "SELECT generation FROM business_generation",
      );
      if (!review || current?.generation !== review.generation)
        throw Error(
          "Local work changed. Start a fresh adoption review. Previous snapshot remains protected.",
        );
      if (review.state === "complete") return;
      if (review.state !== "capturing") throw Error("Review already adopted.");
      let count = 0;
      for await (const r of this.business.iterate(tx, review.company)) {
        if (
          await tx.getFirstAsync(
            "SELECT id FROM business_import_rows WHERE review=? AND kind=? AND id=?",
            id,
            r.kind,
            r.id,
          )
        )
          continue;
        await tx.runAsync(
          "INSERT INTO business_import_rows VALUES(?,?,?,?)",
          id,
          r.kind,
          r.id,
          canonical(r),
        );
        if (++count === 40) return;
      }
      // Capture exact original queue rows after records. This does not acknowledge them.
      for (const [table, kind, pk] of [
        ["outbox", "outbox", "operation_id"],
        ["local_events", "event", "id"],
      ] as const) {
        const rows = await tx.getAllAsync<Row>(
          `SELECT * FROM ${table} WHERE NOT EXISTS(SELECT 1 FROM business_import_rows r WHERE r.review=? AND r.kind=? AND r.id=${table}.${pk}) AND NOT EXISTS(SELECT 1 FROM business_acks a WHERE a.kind=? AND a.id=${table}.${pk}) ORDER BY rowid LIMIT 100`,
          id,
          kind,
          kind,
        );
        for (const row of rows)
          await tx.runAsync(
            "INSERT INTO business_import_rows VALUES(?,?,?,?)",
            id,
            kind,
            String(row[pk]),
            canonical(row),
          );
        if (rows.length) return;
      }
      await tx.runAsync(
        "UPDATE business_import_review SET state='complete' WHERE id=?",
        id,
      );
    });
    return this.page(id);
  }
  async page(id: string, offset = 0) {
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw Error("Invalid review page");
    const r = await this.business.db.getFirstAsync<{
      company: string;
      state: string;
      generation: number;
    }>("SELECT * FROM business_import_review WHERE id=?", id);
    if (!r) throw Error("Review unavailable");
    const totals = await this.business.db.getFirstAsync<{
      records: number;
      sources: number;
    }>(
      "SELECT count(CASE WHEN kind NOT IN ('outbox','event') THEN 1 END) records,count(CASE WHEN kind IN ('outbox','event') THEN 1 END) sources FROM business_import_rows WHERE review=?",
      id,
    );
    const rows = await this.business.db.getAllAsync<{ body: string }>(
      "SELECT body FROM business_import_rows WHERE review=? AND kind NOT IN ('outbox','event') ORDER BY kind,id LIMIT 40 OFFSET ?",
      id,
      offset,
    );
    return {
      id,
      company: r.company,
      state: r.state,
      generation: r.generation,
      offset,
      totalRecords: totals?.records ?? 0,
      totalSources: totals?.sources ?? 0,
      records: rows.map((row) => JSON.parse(row.body) as RecordData),
    };
  }
  async adopt(
    binding: Omit<Binding, "receive_seed">,
    id: string,
    receive = false,
  ) {
    await this.business.db.transaction(async (tx) => {
      const review = await tx.getFirstAsync<{
        company: string;
        generation: number;
        state: string;
      }>("SELECT * FROM business_import_review WHERE id=?", id);
      const current = await tx.getFirstAsync<{ generation: number }>(
        "SELECT generation FROM business_generation",
      );
      if (
        !review ||
        review.state !== "complete" ||
        review.company !== binding.local_company ||
        review.generation !== current?.generation
      )
        throw Error("Work changed or review incomplete. Review again.");
      const old = await tx.getFirstAsync<Binding>(
        "SELECT * FROM business_binding",
      );
      if (old)
        throw Error("Workspace already adopted. Preserve existing binding.");
      if (
        receive &&
        (await tx.getFirstAsync(
          "SELECT id FROM business_import_rows WHERE review=? AND kind IN ('outbox','event')",
          id,
        ))
      )
        throw Error("Receive requires no unsent work");
      await tx.runAsync(
        "INSERT INTO business_binding VALUES(1,?,?,?,?,?,?,?)",
        binding.user_id,
        binding.company,
        binding.local_company,
        binding.origin,
        binding.role,
        receive ? 1 : 0,
        new Date().toISOString(),
      );
      let offset = 0;
      for (;;) {
        const page = await tx.getAllAsync<{ kind: string; id: string }>(
          "SELECT kind,id FROM business_import_rows WHERE review=? AND kind NOT IN ('outbox','event') ORDER BY kind,id LIMIT 40 OFFSET ?",
          id,
          offset,
        );
        if (!page.length) break;
        for (const row of page)
          await tx.runAsync(
            "INSERT INTO business_identity VALUES(?,?,?,?)",
            row.kind,
            row.id,
            binding.company,
            row.id,
          );
        offset += page.length;
      }
      await tx.runAsync(
        "UPDATE business_import_review SET state='adopted' WHERE id=?",
        id,
      );
    });
  }
}
