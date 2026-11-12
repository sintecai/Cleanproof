import { AuthConnection, ConnectionError } from "../auth/session.ts";
import type { SyncTransport } from "./worker.ts";
export function supabaseTransport(connection: AuthConnection): SyncTransport {
  return {
    async authorise(company, user) {
      const memberships = await connection.memberships();
      if (
        connection.session()?.user.id !== user ||
        !memberships.some((m) => m.company_id === company && m.active)
      )
        throw new ConnectionError(
          "permission",
          "Company access is no longer available. Queued work has been preserved.",
        );
    },
    push: (operation) => connection.rpc("cp_apply_operation", { operation }),
    pull: (company, after_sequence, known_epoch) =>
      connection.rpc("cp_pull_changes", {
        company,
        after_sequence,
        known_epoch,
        page_size: 100,
      }),
  };
}
