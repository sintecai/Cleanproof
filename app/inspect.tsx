import { Alert } from "../src/application/platformAlert";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams, usePreventRemove } from "expo-router";
import {
  Button,
  Field,
  Loading,
  Page,
  Pill,
  colour,
  ui,
} from "../src/application/ui";
import { useTask, useWorkspace } from "../src/application/workspace";
import { DraftEditor, type EditorState } from "../src/application/draftEditor";
import {
  demo,
  reviewDraft,
  type DemoWorkspace,
  type Result,
} from "../src/domain/inspection";
import { score } from "../src/domain/workflow";
import type { Lifecycle } from "../src/storage/workflowRepository";
import type { MediaVault, Asset } from "../src/media/vault";
export default function Inspection() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const inspection = id ?? demo.inspectionId;
  const { handle, refresh, revision } = useWorkspace();
  const task = useTask();
  const [section, setSection] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<DemoWorkspace | null>(null),
    [state, setState] = useState<EditorState | null>(null),
    [life, setLife] = useState<Lifecycle | null>(null),
    [inspector, setInspector] = useState(""),
    [problem, setProblem] = useState(""),
    [assets, setAssets] = useState<Asset[]>([]),
    [actions, setActions] = useState(0),
    [correction, setCorrection] = useState(false),
    [reason, setReason] = useState("");
  const editor = useRef<DraftEditor | null>(null),
    vault = useRef<MediaVault | null>(null);
  useEffect(() => {
    let active = true;
    let ed: DraftEditor | undefined;
    void (async () => {
      try {
        const selected = await handle.forInspection(inspection);
        const initial = await selected.repository.load();
        if (!active) return;
        ed = new DraftEditor(
          selected.repository,
          initial,
          selected.workspace,
          (next) => {
            if (active) setState(next);
          },
        );
        editor.current = ed;
        setWorkspace(selected.workspace);
        setState(ed.snapshot);
        setLife(await handle.workflow.lifecycle(inspection));
      } catch (e) {
        setProblem(
          e instanceof Error ? e.message : "Unable to open this inspection.",
        );
      }
    })();
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") void ed?.flush();
    });
    return () => {
      active = false;
      sub.remove();
      editor.current = null;
      void ed?.dispose();
    };
  }, [handle, inspection]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const m = await handle.media();
        vault.current = m.vault;
        const photos = await m.vault.list(inspection),
          a = await handle.workflow.actions(inspection),
          l = await handle.workflow.lifecycle(inspection);
        if (active) {
          setAssets(photos);
          setActions(a.length);
          setLife(l);
        }
      } catch (e) {
        if (active)
          setProblem(
            e instanceof Error ? e.message : "Photos could not be opened.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [handle, inspection, revision]);
  const flush = async () => {
    const ed = editor.current;
    if (!ed) return false;
    await ed.flush();
    if (!["saved", "new"].includes(ed.snapshot.phase)) {
      Alert.alert(
        "Changes are not saved",
        "Stay on this inspection and retry saving before leaving.",
      );
      return false;
    }
    return true;
  };
  usePreventRemove(
    task.busy || (!!state && !["saved", "new"].includes(state.phase)),
    ({ repeat }) => {
      if (task.busy) {
        Alert.alert(
          "Saving your inspection",
          "Please wait for this operation to finish.",
        );
        return;
      }
      void flush().then((ok) => {
        if (ok) repeat();
      });
    },
  );
  const complete = async () => {
    await task.run(async () => {
      if (!(await flush()))
        throw Error("Save the inspection before completing.");
      const issues = reviewDraft(editor.current!.snapshot.draft, workspace!);
      if (issues.length)
        throw Error(
          issues
            .map(
              (i) =>
                `${workspace!.items.find((x) => x.id === i.itemId)?.title}: ${i.message}`,
            )
            .join("\n"),
        );
      if (!vault.current)
        throw Error(
          "Photos are unavailable. Reopen this inspection before completing.",
        );
      const photos = (await vault.current.list(inspection)).filter(
        (a) => a.kind === "photo" && !a.action_id,
      );
      for (const a of photos) await vault.current.read(a.id);
      const saved = await (
        await handle.forInspection(inspection)
      ).repository.load();
      await handle.workflow.complete(
        inspection,
        saved.localRevision,
        inspector,
        photos.map((p) => ({ id: p.id, hash: p.hash })),
      );
      setLife(await handle.workflow.lifecycle(inspection));
      refresh();
    }, "Inspection completed and preserved on this device.");
  };
  const c = state ? score(state.draft) : null;
  const completed = life?.status === "completed";
  return (
    <Page
      title={completed ? "Inspection summary" : "Active inspection"}
      subtitle={workspace?.siteName ?? "Opening your inspection…"}
    >
      {problem && <Text style={ui.error}>{problem}</Text>}
      {!state || !workspace ? (
        <Loading />
      ) : (
        <>
          <View style={ui.row}>
            <Pill
              text={completed ? "Completed locally" : "Draft"}
              tone={completed ? "teal" : "amber"}
            />
            <Text style={ui.muted}>{workspace.templateName}</Text>
          </View>
          {life?.correction_of && (
            <Text style={ui.muted}>
              Correction of an earlier record · {life.correction_reason}
            </Text>
          )}
          <View style={ui.card}>
            <Text style={ui.h}>
              {c!.answered} of {c!.total} items answered
            </Text>
            <View
              style={{ height: 7, backgroundColor: "#e1eaee", borderRadius: 8 }}
            >
              <View
                style={{
                  height: 7,
                  width: `${c!.total ? (100 * c!.answered) / c!.total : 0}%`,
                  backgroundColor: colour.teal,
                  borderRadius: 8,
                }}
              />
            </View>
            <View style={[ui.row, {gap: 8}]} accessibilityLabel={`${c!.pass} passed, ${c!.fail} failed, ${c!.total-c!.answered} remaining`}>
              <Pill text={`${c!.pass} passed`} />
              <Pill text={`${c!.fail} failed`} tone="red" />
              <Pill text={`${c!.total - c!.answered} remaining`} tone="amber" />
            </View>
            <Text style={ui.body}>
              {c!.percentage === null
                ? "No applicable answers to score."
                : `${c!.percentage}% pass rate${c!.answered < c!.total ? " so far" : ""}`}
            </Text>
            <Text style={ui.muted}>
              Pass ÷ (Pass + Fail). N/A and unanswered items are excluded.
            </Text>
          </View>
          <View
            accessibilityLiveRegion="polite"
            style={[
              ui.card,
              state.phase === "error" && { backgroundColor: "#fbe8e6" },
            ]}
          >
            <Text
              testID="save-status"
              style={state.phase === "error" ? ui.error : ui.muted}
            >
              {completed
                ? "Completed record · read only"
                : state.phase === "error"
                  ? "Not saved. Keep this inspection open and retry."
                  : state.phase === "saving"
                    ? "Saving your changes…"
                    : state.phase === "saved"
                      ? "Saved on this device"
                      : state.phase === "new"
                        ? "New draft · ready to inspect"
                        : "Changes not saved yet…"}
            </Text>
            {state.phase === "error" && (
              <Button
                label="Retry saving"
                onPress={() => void editor.current?.flush()}
              />
            )}
          </View>
          {[...new Set(workspace.items.map(i => i.section).filter(Boolean))].length > 0 && <View style={ui.section}>
            <Text style={ui.h}>Inspection sections</Text>
            <View style={ui.row}><Button label="All items" secondary={section !== null} onPress={() => setSection(null)} />
              {[...new Set(workspace.items.map(i => i.section).filter(Boolean))].map(name => <Button key={name} label={name!} secondary={section !== name} onPress={() => setSection(name!)} />)}
            </View>
          </View>}
          {workspace.items.map((item, n) => {
            if (section && item.section !== section) return null;
            const answer = state.draft.responses[item.id]!;
            const photos = assets.filter(
              (a) =>
                a.kind === "photo" && a.item_id === item.id && !a.action_id,
            );
            return (
              <View key={item.id} style={[ui.card, answer.result === "fail" && { backgroundColor: "#fff5f5", borderColor: "#fee2e2" }]}>
                <Text style={ui.label}>
                  {item.section ? `${item.section} · ` : ""}ITEM {n + 1}
                </Text>
                <Text style={ui.h}>{item.title}</Text>
                <View style={ui.row}>
                  {(["pass", "fail", "na"] as Result[]).map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}: ${value === "na" ? "Not applicable" : value}`}
                      accessibilityState={{
                        selected: answer.result === value,
                        disabled: completed,
                      }}
                      disabled={completed || task.busy}
                      onPress={() =>
                        editor.current?.edit(item.id, { result: value }, true)
                      }
                      testID={`result-${item.id}-${value}`}
                      style={{
                        minHeight: 52,
                        minWidth: 0,
                        paddingVertical: 12,
                        paddingHorizontal: 4,
                        justifyContent: "center",
                        flexGrow: 1,
                        flexBasis: 0,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor:
                          answer.result === value ? (value === "fail" ? colour.red : value === "na" ? colour.muted : colour.teal) : "#eff5f2",
                        backgroundColor:
                          answer.result === value ? (value === "fail" ? colour.red : value === "na" ? colour.muted : colour.teal) : "#eff5f2",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color:
                            answer.result === value ? "white" : colour.navy,
                        }}
                      >
                        {value === "na"
                          ? "⊖ N/A"
                          : value === "pass"
                            ? "✓ Pass"
                            : "× Fail"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={ui.label}>
                  {answer.result === "fail"
                    ? "Explain the failure *"
                    : answer.result === "na"
                      ? "Reason for N/A *"
                      : "Comment (optional)"}
                </Text>
                {completed ? (
                  <Text style={ui.body}>{answer.note || "No comment"}</Text>
                ) : (
                  <TextInput
                    accessibilityLabel={`Comment for ${item.title}`}
                    testID={`note-${item.id}`}
                    value={answer.note}
                    onChangeText={(note) =>
                      editor.current?.edit(item.id, { note })
                    }
                    onBlur={() => void editor.current?.flush()}
                    editable={!task.busy}
                    style={[
                      ui.input,
                      { minHeight: 88, textAlignVertical: "top" },
                    ]}
                    multiline
                    maxLength={2000}
                    placeholder="Add a concise, useful observation"
                  />
                )}
                <Button
                  secondary
                  label={`${photos.length ? "View" : "Add"} photographs${photos.length ? ` (${photos.length})` : ""}`}
                  disabled={task.busy}
                  onPress={() =>
                    void flush().then((ok) => {
                      if (ok)
                        router.push({
                          pathname: "/photos",
                          params: { id: inspection, item: item.id },
                        });
                    })
                  }
                />
                {answer.result === "fail" && (
                  <Button
                    label="Create corrective action"
                    secondary
                    disabled={task.busy}
                    onPress={() =>
                      void flush().then((ok) => {
                        if (ok)
                          router.push({
                            pathname: "/actions",
                            params: {
                              id: inspection,
                              item: item.id,
                              create: "1",
                            },
                          });
                      })
                    }
                  />
                )}
              </View>
            );
          })}
          <Button
            label={`Corrective actions (${actions})`}
            secondary
            disabled={task.busy}
            onPress={() =>
              void flush().then((ok) => {
                if (ok)
                  router.push({
                    pathname: "/actions",
                    params: { id: inspection },
                  });
              })
            }
          />
          {!completed && (
            <View style={ui.card}>
              <Text style={ui.h}>Review & complete</Text>
              <Text style={ui.body}>
                Check every answer and photograph. Each failed item needs an
                action with a responsible person and due date.
              </Text>
              <Field
                label="Inspector name * (saved on completion)"
                value={inspector}
                onChange={setInspector}
                max={120}
                disabled={task.busy}
              />
              <Text style={ui.muted}>
                Completion preserves this local record. It does not submit,
                approve or upload it.
              </Text>
              <Button
                label={
                  task.busy ? "Completing inspection…" : "Complete inspection"
                }
                disabled={task.busy}
                onPress={() => void complete()}
              />
            </View>
          )}
          {completed && (
            <View style={ui.card}>
              <Text style={ui.h}>Need to correct this record?</Text>
              <Text style={ui.muted}>
                Create a linked draft. The original answers, photos and
                completion details remain unchanged. Add fresh evidence and
                actions to the correction where needed.
              </Text>
              <Button
                label="Create a correction draft"
                secondary
                onPress={() => setCorrection(true)}
              />
              {correction && (
                <>
                  <Field
                    label="Reason for correction *"
                    value={reason}
                    onChange={setReason}
                    max={500}
                    disabled={task.busy}
                  />
                  <Button
                    label="Open linked correction"
                    disabled={task.busy}
                    onPress={() =>
                      void task.run(async () => {
                        const id = await handle.workflow.correction(
                          inspection,
                          reason,
                        );
                        router.push({ pathname: "/inspect", params: { id } });
                      })
                    }
                  />
                </>
              )}
            </View>
          )}
          {task.error && (
            <Text accessibilityLiveRegion="polite" style={ui.error}>
              {task.error}
            </Text>
          )}
          {task.message && (
            <Text accessibilityLiveRegion="polite" style={ui.body}>
              {task.message}
            </Text>
          )}
          <Button
            label="Preview & export report"
            secondary
            disabled={task.busy}
            onPress={() =>
              void flush().then((ok) => {
                if (ok)
                  router.push({
                    pathname: "/reports",
                    params: { id: inspection },
                  });
              })
            }
          />
          <Text style={ui.muted}>
            Saved on this device. Open Synchronisation to check delivery or
            retry.
          </Text>
        </>
      )}
    </Page>
  );
}
