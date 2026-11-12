import type { AuthConnection } from "../../auth/session.ts";
import { BusinessAccess } from "./access.ts";
import { BusinessRepository } from "./repository.ts";
import { BusinessEngine, transport } from "./engine.ts";
import type { MediaVault } from "../../media/vault.ts";
import { canonical } from "../protocol.ts";
export type IsolatedTarget = {
  business: BusinessRepository;
  access: BusinessAccess;
  auth: AuthConnection;
  vault: MediaVault;
  activate(): Promise<void>;
  close(): Promise<void>;
};
/** Never copies source records/queues/files. Only freshly authorised server projections enter the new store. */
export async function isolateAuthorised(
  source: BusinessRepository,
  access: BusinessAccess,
  auth: AuthConnection,
  reviewed: string,
  create: () => Promise<IsolatedTarget>,
) {
  const generation = auth.revision?.(),
    review = await access.recoveryReview(auth),
    binding = await source.binding();
  if (!binding || canonical(review) !== reviewed)
    throw Error("Access changed. Review protected work again.");
  if (
    !(await source.db.getFirstAsync(
      "SELECT singleton FROM business_quarantine",
    ))
  )
    throw Error("No protected workspace recovery is pending.");
  const target = await create();
  try {
    await target.business.adopt(
      { ...binding, role: review.scope.role },
      canonical(await target.business.review(binding.local_company)),
      true,
    );
    await target.access.grant(target.auth);
    await new BusinessEngine(
      target.business,
      target.vault,
      transport(target.auth),
    ).run();
    const fresh = await access.recoveryReview(auth);
    if (canonical(fresh) !== reviewed || auth.revision?.() !== generation)
      throw Error(
        "Access changed during download. New workspace stays locked; review again.",
      );
    for (const site of await target.business.db.getAllAsync<{ id: string }>(
      "SELECT id FROM sites",
    ))
      if (fresh.scope.role !== "owner" && !fresh.scope.sites.includes(site.id))
        throw Error(
          "Unexpected site in authorised workspace. Activation refused.",
        );
    // A quarantine audit write is required before activation; its failure preserves the old active profile.
    await source.db.runAsync(
      "INSERT INTO business_access_audit VALUES(lower(hex(randomblob(16))),?,?,?)",
      "isolated-authorised-workspace",
      canonical({ scope: fresh.scope, pendingPreserved: fresh.pending }),
      new Date().toISOString(),
    );
    await target.activate();
  } finally {
    await target.close();
  }
}
