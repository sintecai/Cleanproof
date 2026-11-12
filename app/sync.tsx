import { Alert } from "../src/application/platformAlert";
import { useState } from "react";
import { Text, View } from "react-native";
import { router, usePreventRemove } from "expo-router";
import { Button, Page, ui, Loading } from "../src/application/ui";
import { useQuery, useTask, useWorkspace } from "../src/application/workspace";
import * as Crypto from "expo-crypto";
import { Adoption } from "../src/sync/business/adoption";
import { canonical } from "../src/sync/protocol";
import { BusinessEngine, transport } from "../src/sync/business/engine";
function describe(record: {
  kind: string;
  data: Record<string, Record<string, unknown>[]>;
}) {
  if (record.kind !== "inspection")
    return Object.entries(record.data)
      .map(
        ([table, rows]) =>
          table +
          ": " +
          rows.map((row) => String(row.name ?? row.id)).join(", "),
      )
      .join("\n");
  const context = record.data.inspection_context?.[0],
    life = record.data.inspection_lifecycle?.[0];
  const w = JSON.parse(String(context?.workspace_json)),
    draft = JSON.parse(
      String(record.data.inspection_drafts?.[0]?.payload_json),
    );
  return [
    w.siteName + " · " + String(life?.status ?? "draft"),
    ...w.items.map(
      (item: { id: string; title: string }) =>
        item.title +
        ": " +
        String(draft.responses[item.id]?.result ?? "Unanswered") +
        " — " +
        String(draft.responses[item.id]?.note ?? ""),
    ),
    ...(record.data.corrective_actions ?? []).map(
      (a) =>
        "Action: " +
        String(a.description) +
        " · " +
        String(a.owner_name) +
        " · " +
        String(a.due_date) +
        " · " +
        String(a.status) +
        " · " +
        String(a.resolution_note),
    ),
    String(record.data.media_journal?.length ?? 0) + " photograph manifests",
  ].join("\n");
}
export default function Sync() {
  const { handle } = useWorkspace(),
    task = useTask();
  const [review, setReview] = useState<Awaited<
      ReturnType<Adoption["page"]>
    > | null>(null),
    [company, setCompany] = useState(""),
    [members, setMembers] = useState<
      { company_id: string; role: "owner" | "inspector"; active: boolean }[]
    >([]);
  const state = useQuery(async () => ({
    binding: await handle.business.binding(),
    state: await handle.business.state(),
    conflicts: await handle.business.conflicts(),
    progress: await handle.business.progress(),
  }));
  usePreventRemove(task.busy, () => {});
  async function accounts() {
    const auth = handle.connection();
    if (!auth)
      throw Error("Configure local Supabase first. See setup instructions.");
    await auth.restore();
    setMembers(await auth.memberships());
  }
  async function adopt(receive: boolean) {
    const auth = handle.connection();
    if (!auth || !review || !company)
      throw Error("Select an account/company and review current work first.");
    const user = auth.session()?.user.id,
      member = members.find((m) => m.company_id === company);
    if (!user || !member) throw Error("Verify account membership first.");
    const remote = transport(auth);
    await remote.register(company, review.company);
    await new Adoption(handle.business, Crypto.randomUUID).adopt(
      {
        user_id: user,
        company,
        local_company: review.company,
        origin: auth.config.url,
        role: member.role,
      },
      review.id,
      receive,
    );
    await handle.access.grant(auth);
  }
  async function sync() {
    const auth = handle.connection();
    if (!auth) throw Error("Backend configuration required.");
    try {
      await auth.restore();
      await handle.access.grant(auth);
      await new BusinessEngine(
        handle.business,
        (await handle.media()).vault,
        transport(auth),
      ).run();
    } catch (e) {
      if (
        e instanceof Error &&
        /membership|scope changed|access denied/i.test(e.message)
      )
        await handle.access.signOut();
      throw e;
    }
  }
  if (process.env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY === "1") return (
    <Page title="Synchronisation" subtitle="Local browser demo">
      <Text style={ui.h}>Saved on this device</Text>
      <Text style={ui.body}>This preview saves work in your browser. No backend is connected, so sign-in, cross-device sync, server permissions and secure client sharing are unavailable. Nothing here is marked Synced.</Text>
      <Button label="Return to Home" onPress={() => router.replace("/")} />
    </Page>
  );
  return (
    <Page
      title="Synchronisation"
      subtitle="Saved locally, delivered only after verified server acknowledgement."
    >
      {!state.data ? (
        <Loading />
      ) : (
        <>
          <View style={ui.card}>
            <Text accessibilityLiveRegion="polite" style={ui.h}>
              {task.busy ? "Syncing" : state.data.state}
            </Text>
            <Text style={ui.body}>
              Completed locally stays separate from Synced. No Submitted or
              Approved state is implied.
            </Text>
            <Text style={ui.muted}>
              {state.data.progress.remainingOperations} original operations
              waiting · {state.data.progress.acknowledgedBatches} batches
              acknowledged. Partial sync is not completion.
            </Text>
            {state.data.binding ? (
              <>
                <Button
                  label="Sync now / retry"
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(
                      sync,
                      "Sync finished. Required photographs verified.",
                    )
                  }
                />
                <Text style={ui.muted}>
                  This encrypted workspace is bound to one account/company.
                  Company switching is blocked while this workspace is retained;
                  no data is reset.
                </Text>
              </>
            ) : (
              <>
                <Button
                  label="Account sign-in"
                  secondary
                  onPress={() => router.push("/account")}
                />
                <Button
                  label="Verify saved account"
                  secondary
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(accounts, "Membership verified.")
                  }
                />
                {members.map((m) => (
                  <Button
                    key={m.company_id}
                    secondary
                    label={`${m.role} · ${m.company_id.slice(0, 8)}${company === m.company_id ? " · selected" : ""}`}
                    disabled={task.busy}
                    onPress={() => setCompany(m.company_id)}
                  />
                ))}
                <Button
                  label="Review existing local data"
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(async () => {
                      const adoption = new Adoption(
                        handle.business,
                        Crypto.randomUUID,
                      );
                      const id = await adoption.begin(
                        handle.workspace.companyId,
                      );
                      let page = await adoption.page(id);
                      for (let i = 0; i < 20 && page.state === "capturing"; i++)
                        page = await adoption.step(id);
                      setReview(page);
                    }, "Review prepared. No adoption has occurred.")
                  }
                />
                {review && (
                  <>
                    <Text style={ui.body}>
                      {review.totalRecords} captured business records and{" "}
                      {review.totalSources} captured original operations. Review
                      state: {review.state}. Original IDs, immutable snapshots
                      and encryption contexts will be retained. Upload
                      associates this workspace with the selected authenticated
                      company.
                    </Text>
                    {review.state === "capturing" && (
                      <Button
                        label="Continue saved review"
                        onPress={() =>
                          void task.run(async () => {
                            setReview(
                              await new Adoption(
                                handle.business,
                                Crypto.randomUUID,
                              ).step(review.id),
                            );
                          }, "Review checkpoint saved.")
                        }
                      />
                    )}
                    <Button
                      label="Next review page"
                      secondary
                      disabled={task.busy || review.totalRecords <= 40}
                      onPress={() =>
                        void task.run(async () => {
                          setReview(
                            await new Adoption(
                              handle.business,
                              Crypto.randomUUID,
                            ).page(
                              review.id,
                              review.offset + 40 >= review.totalRecords
                                ? 0
                                : review.offset + 40,
                            ),
                          );
                        }, "Review page loaded.")
                      }
                    />
                    <View style={ui.card}>
                      <Text style={ui.h}>
                        Reviewed records · {review.offset + 1}–
                        {review.offset + review.records.length}
                      </Text>
                      {review.records.map((r) => (
                        <Text key={r.kind + r.id} style={ui.body}>
                          {r.kind} · {r.id.slice(0, 8)} ·{" "}
                          {r.kind === "inspection"
                            ? String(
                                JSON.parse(
                                  String(
                                    r.data.inspection_context?.[0]
                                      ?.workspace_json,
                                  ),
                                ).siteName,
                              ) +
                              " · " +
                              String(
                                r.data.inspection_lifecycle?.[0]?.status ??
                                  "draft",
                              )
                            : String(
                                r.data[Object.keys(r.data)[0]!]![0]?.name ??
                                  r.id,
                              )}
                        </Text>
                      ))}
                    </View>
                    <Button
                      label="Adopt reviewed local work"
                      disabled={
                        task.busy || !company || review.state !== "complete"
                      }
                      onPress={() =>
                        Alert.alert(
                          "Adopt this workspace?",
                          "Associate only the reviewed synthetic local company with this authenticated company. This can upload its records and photographs when Sync is pressed.",
                          [
                            { text: "Cancel" },
                            {
                              text: "Adopt",
                              onPress: () =>
                                void task.run(
                                  () => adopt(false),
                                  "Workspace adopted. Saved work retained.",
                                ),
                            },
                          ],
                        )
                      }
                    />
                    <Button
                      secondary
                      label="Receive company data on this device"
                      disabled={
                        task.busy || !company || review.state !== "complete"
                      }
                      onPress={() =>
                        Alert.alert(
                          "Receive into this workspace?",
                          "Allowed only with no pending original operations. Reviewed pristine demo seed records may be replaced by incoming company records. Acknowledged work is never silently discarded.",
                          [
                            { text: "Cancel" },
                            {
                              text: "Receive",
                              onPress: () =>
                                void task.run(
                                  () => adopt(true),
                                  "Receive mode adopted. Press Sync after unlocking.",
                                ),
                            },
                          ],
                        )
                      }
                    />
                  </>
                )}
              </>
            )}
          </View>
          {state.data.conflicts.map((c) => (
            <View style={ui.warning} key={c.id}>
              <Text style={ui.h}>Conflict requires review</Text>
              <Text style={ui.body}>
                Both versions and all original source operations are retained.
                Review the proposed and current records before choosing.
                Completed snapshots cannot be overwritten.
              </Text>
              <Text style={ui.muted}>
                Proposed records:{" "}
                {JSON.parse(c.request_json)
                  .records.map(
                    (r: { kind: string; id: string }) =>
                      `${r.kind} ${r.id.slice(0, 8)}`,
                  )
                  .join(", ")}
              </Text>
              <Text style={ui.muted}>
                Server revisions:{" "}
                {JSON.parse(c.receipt_json)
                  .records.map(
                    (r: { kind: string; revision: number }) =>
                      `${r.kind} v${r.revision}`,
                  )
                  .join(", ")}
              </Text>
              <Text style={ui.h}>Your proposed values</Text>
              {JSON.parse(c.request_json).records.map((r: any) => (
                <Text key={r.kind + r.id} style={ui.body}>
                  {describe(r)}
                </Text>
              ))}
              <Text style={ui.h}>Current server values</Text>
              {JSON.parse(c.receipt_json).records.map((r: any) => (
                <Text key={r.kind + r.id} style={ui.body}>
                  {describe(r)}
                </Text>
              ))}
              <Button
                secondary
                label="Keep local proposal (retry at current revision)"
                disabled={task.busy}
                onPress={() =>
                  void task.run(
                    () => handle.business.resolve(c.id, "keep-local"),
                    "Decision retained. Sync again to deliver the reviewed proposal.",
                  )
                }
              />
              <Button
                secondary
                label="Use server values; retain both histories"
                disabled={task.busy}
                onPress={() =>
                  void task.run(
                    () => handle.business.resolve(c.id, "use-server"),
                    "Decision retained. Local proposal is backed up; sync the retained history.",
                  )
                }
              />
            </View>
          ))}
        </>
      )}
      {!!task.error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {task.error}
        </Text>
      )}
      {!!task.message && <Text style={ui.muted}>{task.message}</Text>}
      {!!state.error && <Text style={ui.error}>{state.error}</Text>}
      <Text style={ui.muted}>
        Private photograph transfers use authenticated service access. PDFs
        remain local exports; secure client report links are a later phase.
      </Text>
    </Page>
  );
}
