import type { BusinessRepository } from "../sync/business/repository.ts";
import type { WorkflowRepository } from "../storage/workflowRepository.ts";
import type { Catalogue } from "../storage/catalogue.ts";
import type { InspectionRepository } from "../storage/inspectionRepository.ts";
import type { DemoWorkspace } from "../domain/inspection.ts";
import type { MediaVault } from "../media/vault.ts";
type SeedHandle = {
  business: BusinessRepository;
  workflow: WorkflowRepository;
  catalogue: Catalogue;
  forInspection(
    id: string,
  ): Promise<{ workspace: DemoWorkspace; repository: InspectionRepository }>;
  media(): Promise<{ vault: MediaVault }>;
};
import { changeResponse } from "../domain/inspection.ts";
import { syntheticPhoto } from "./photo.ts";
/** Only called on a newly created development-only workspace, never on the user's active store. */
export async function seedSynthetic(handle: SeedHandle) {
  if (await handle.business.binding())
    throw Error("Demo seed refuses an adopted workspace.");
  const db = handle.business.db;
  if (
    await db.getFirstAsync(
      "SELECT value FROM local_secrets WHERE name='synthetic-seed-finished-v1'",
    )
  )
    return;
  await handle.workflow.saveBranding(
    "Synthetic Alder Cleaning",
    "Sicy internal trial · synthetic@example.test",
  );
  const customer = await handle.catalogue.customer(
    "Alder Business Centre",
    "Facilities desk · synthetic@example.test",
  );
  const site = await handle.catalogue.site(
    customer,
    "Riverside Offices",
    "12 Example Quay, Belfast",
    "Europe/London",
    "Synthetic office premises",
  );
  const second = await handle.catalogue.customer(
    "Birch Community Offices",
    "Synthetic facilities contact",
  );
  await handle.catalogue.site(
    second,
    "Birch Meeting Rooms",
    "8 Sample Road, Belfast",
    "Europe/London",
    "Synthetic premises",
  );
  const template = await handle.catalogue.template("Daily office quality", [
    { id: "floor", title: "Entrance floor clean" },
    { id: "desks", title: "Desks wiped" },
    { id: "bins", title: "Bins emptied" },
  ]);
  const completed = await handle.catalogue.newDraft(site, template),
    draft = await handle.catalogue.newDraft(site, template);
  for (const [id, complete] of [
    [completed, true],
    [draft, false],
  ] as const) {
    const { workspace, repository } = await handle.forInspection(id);
    const saved = await repository.load();
    let changed = saved.draft;
    for (const item of workspace.items)
      changed = changeResponse(
        changed,
        item.id,
        {
          result: item.id === "floor" ? "fail" : complete ? "pass" : null,
          note:
            item.id === "floor"
              ? "Entrance needs a second clean after deliveries."
              : "",
        },
        workspace,
      );
    await repository.save(changed, saved.localRevision);
    const person = (await handle.workflow.people())[0]!;
    const action = await handle.workflow.createAction(
      id,
      "floor",
      "Reclean entrance and check matting",
      person.id,
      "2026-10-30",
    );
    const photo = await (
      await handle.media()
    ).vault.add(
      id,
      "floor",
      "photo",
      "Synthetic entrance evidence",
      Uint8Array.from(atob(syntheticPhoto), (c) => c.charCodeAt(0)),
    );
    if (complete) {
      await handle.workflow.transitionAction(
        action,
        1,
        "resolved",
        "Entrance recleaned and checked.",
      );
      await handle.workflow.complete(
        id,
        saved.localRevision + 1,
        "Synthetic Inspector",
        [{ id: photo.id, hash: photo.hash }],
      );
    }
  }
  await db.runAsync(
    "INSERT INTO local_secrets VALUES('synthetic-seed-finished-v1','1')",
  );
}
