import type { TransactionalDatabase } from "../../storage/contracts.ts";
import { canonical } from "../protocol.ts";
import type { AuthConnection } from "../../auth/session.ts";
export class BusinessAccess {
  constructor(
    private db: TransactionalDatabase,
    private now = () => Date.now(),
  ) {}
  async grant(auth: AuthConnection) {
    const generation = auth.revision?.();
    const b = await this.db.getFirstAsync<{
      user_id: string;
      company: string;
      origin: string;
    }>("SELECT * FROM business_binding");
    if (!b) return;
    if (auth.session()?.user.id !== b.user_id || auth.config.url !== b.origin)
      throw Error(
        "Use the account bound to this workspace. Another identity cannot open it.",
      );
    const members = await auth.memberships(),
      member = members.find((m) => m.company_id === b.company && m.active);
    if (!member) {
      await this.quarantine("membership-removed");
      throw Error("Membership revoked. Unsent work is quarantined.");
    }
    const page = await auth.rpc("cp_sync_pull", {
      c: b.company,
      after_cursor: 0,
      known_epoch: null,
    });
    const cursor = await this.db.getFirstAsync<{ epoch: number | null }>(
      "SELECT epoch FROM business_cursor",
    );
    if (
      cursor?.epoch !== null &&
      cursor?.epoch !== undefined &&
      cursor.epoch !== page.epoch
    ) {
      await this.quarantine("scope-changed");
      throw Error(
        "Access scope changed. This workspace is quarantined for a fresh authorised workspace review. Do not reset it.",
      );
    }
    if (
      await this.db.getFirstAsync("SELECT singleton FROM business_quarantine")
    )
      throw Error(
        "Protected work requires an explicit access recovery review.",
      );
    const now = this.now();
    await this.db.transaction(async (tx) => {
      await tx.runAsync(
        "INSERT INTO business_access VALUES(1,?,?,?,0) ON CONFLICT(singleton) DO UPDATE SET user_id=excluded.user_id,valid_until=excluded.valid_until,max_clock=excluded.max_clock,signed_out=0",
        b.user_id,
        now + 7 * 86400000,
        now,
      );
      await tx.runAsync("UPDATE business_binding SET role=?", member.role);
      if (
        auth.revision?.() !== generation ||
        auth.session()?.user.id !== b.user_id
      )
        throw Error(
          "Access verification was cancelled. Saved work remains locked.",
        );
    });
  }
  async offline(user: string) {
    await this.db.transaction(async (tx) => {
      const b = await tx.getFirstAsync<{ user_id: string }>(
          "SELECT user_id FROM business_binding",
        ),
        lease = await tx.getFirstAsync<{
          user_id: string;
          valid_until: number;
          max_clock: number;
          signed_out: number;
        }>("SELECT * FROM business_access");
      const now = this.now();
      if (await tx.getFirstAsync("SELECT singleton FROM business_quarantine"))
        throw Error("Work is quarantined. Reconnect for an access review.");
      if (
        !lease ||
        !b ||
        user !== b.user_id ||
        user !== lease.user_id ||
        lease.signed_out ||
        now > lease.valid_until ||
        now < lease.max_clock - 300000
      )
        throw Error("Connect and verify membership before opening saved work.");
      await tx.runAsync(
        "UPDATE business_access SET max_clock=?",
        Math.max(now, lease.max_clock),
      );
    });
  }
  async quarantine(reason: "membership-removed" | "scope-changed") {
    await this.db.transaction(async (tx) => {
      await tx.runAsync("UPDATE business_access SET signed_out=1");
      await tx.runAsync(
        "INSERT INTO business_quarantine VALUES(1,?,'',?) ON CONFLICT(singleton) DO UPDATE SET reason=excluded.reason,review_json='',created_at=excluded.created_at",
        reason,
        new Date(this.now()).toISOString(),
      );
      await tx.runAsync(
        "INSERT INTO business_access_audit VALUES(?,?,?,?)",
        "quarantine-" + this.now() + "-" + String(Math.random()),
        "quarantined",
        JSON.stringify({ reason }),
        new Date(this.now()).toISOString(),
      );
    });
  }
  async recoveryReview(auth: AuthConnection) {
    const generation = auth.revision?.();
    const b = await this.db.getFirstAsync<{
      user_id: string;
      company: string;
      origin: string;
    }>("SELECT * FROM business_binding");
    if (
      !b ||
      auth.session()?.user.id !== b.user_id ||
      auth.config.url !== b.origin
    )
      throw Error(
        "Use the original account and company. No ownership change is allowed.",
      );
    const scope = await auth.rpc("cp_access_scope", { c: b.company });
    if (
      auth.revision?.() !== generation ||
      auth.session()?.user.id !== b.user_id
    )
      throw Error("Access verification was cancelled.");
    if (
      scope.user !== b.user_id ||
      scope.company !== b.company ||
      !["owner", "inspector"].includes(scope.role) ||
      !Number.isSafeInteger(scope.epoch) ||
      !Array.isArray(scope.sites)
    )
      throw Error("Invalid access review.");
    const sites = await this.db.getAllAsync<{ id: string }>(
      "SELECT id FROM sites WHERE company_id=?",
      (await this.db.getFirstAsync<{ local_company: string }>(
        "SELECT local_company FROM business_binding",
      ))!.local_company,
    );
    const covered =
      scope.role === "owner" || sites.every((s) => scope.sites.includes(s.id));
    const pending = await this.db.getFirstAsync<{ n: number }>(
      "SELECT (SELECT count(*) FROM outbox o WHERE NOT EXISTS(SELECT 1 FROM business_acks a WHERE a.kind='outbox' AND a.id=o.operation_id))+(SELECT count(*) FROM local_events e WHERE NOT EXISTS(SELECT 1 FROM business_acks a WHERE a.kind='event' AND a.id=e.id)) n",
    );
    const conflicts = await this.db.getFirstAsync<{ n: number }>(
      "SELECT count(*) n FROM business_batches b WHERE state='conflict' AND NOT EXISTS(SELECT 1 FROM business_decisions d WHERE d.batch_id=b.id)",
    );
    const review = {
      scope,
      covered,
      pending: pending?.n ?? 0,
      conflicts: conflicts?.n ?? 0,
    };
    await this.db.runAsync(
      "UPDATE business_quarantine SET review_json=?",
      canonical(review),
    );
    return review;
  }
  async recover(auth: AuthConnection, reviewed: string) {
    const generation = auth.revision?.();
    // Fresh server authorisation is mandatory, even after reviewing. Reduced scope cannot
    // expose a populated old workspace; it stays sealed until permissions are restored.
    const current = await this.recoveryReview(auth);
    if (canonical(current) !== reviewed)
      throw Error("Access/work changed. Review again.");
    if (!current.covered)
      throw Error(
        "Reduced site access: this workspace remains protected. Ask the company owner to restore access; selective isolated-workspace recovery is not yet available.",
      );
    await this.db.transaction(async (tx) => {
      const q = await tx.getFirstAsync<{ review_json: string }>(
        "SELECT review_json FROM business_quarantine",
      );
      if (!q || q.review_json !== reviewed)
        throw Error("Recovery review is unavailable.");
      const now = this.now();
      await tx.runAsync(
        "INSERT INTO business_access_audit VALUES(?,?,?,?)",
        "recover-" + now + "-" + String(Math.random()),
        "restored-after-review",
        reviewed,
        new Date(now).toISOString(),
      );
      await tx.runAsync(
        "UPDATE business_binding SET role=?",
        current.scope.role,
      );
      // Replay a full authorised incoming scan; retain every version, queue and frozen row.
      await tx.runAsync(
        "UPDATE business_cursor SET cursor=0,epoch=?",
        current.scope.epoch,
      );
      await tx.runAsync("DELETE FROM business_incoming");
      await tx.runAsync("DELETE FROM business_download");
      await tx.runAsync("DELETE FROM business_quarantine");
      await tx.runAsync(
        "INSERT INTO business_access VALUES(1,?,?,?,0) ON CONFLICT(singleton) DO UPDATE SET user_id=excluded.user_id,valid_until=excluded.valid_until,max_clock=excluded.max_clock,signed_out=0",
        current.scope.user,
        now + 7 * 86400000,
        now,
      );
      if (
        auth.revision?.() !== generation ||
        auth.session()?.user.id !== current.scope.user
      )
        throw Error("Recovery was cancelled; sign in and review again.");
    });
  }
  async signOut() {
    await this.db.runAsync("UPDATE business_access SET signed_out=1");
  }
  async owner() {
    const b = await this.db.getFirstAsync<{ role: string }>(
      "SELECT role FROM business_binding",
    );
    if (b && b.role !== "owner")
      throw Error(
        "Company details/templates require an owner. Your inspection work is preserved.",
      );
  }
}
