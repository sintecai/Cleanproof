import { Alert } from "../src/application/platformAlert";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { useLocalSearchParams, usePreventRemove } from "expo-router";
import {
  Button,
  Empty,
  Field,
  Loading,
  Page,
  Pill,
  colour,
  ui,
} from "../src/application/ui";
import { useQuery, useTask, useWorkspace } from "../src/application/workspace";
import { capturePhoto } from "../src/media/nativeMedia";
import { base64 } from "../src/media/base64";
import type { MediaVault, Asset } from "../src/media/vault";
import { demo } from "../src/domain/inspection";
function EvidenceImage({ asset, vault }: { asset: Asset; vault: MediaVault }) {
  const [uri, setUri] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { let active = true; void vault.read(asset.id).then(bytes => { if (active) setUri(`data:image/jpeg;base64,${base64(bytes)}`); }).catch(() => { if (active) setError('Photograph unavailable. Use the recovery controls below.'); }); return () => { active = false; }; }, [asset.id, vault]);
  return uri ? <Image accessibilityLabel={asset.caption || 'Saved inspection photograph'} source={{ uri }} style={{ width: '100%', height: 240, borderRadius: 8, backgroundColor: colour.soft }} resizeMode="contain" /> : <Text style={ui.muted}>{error || 'Opening photograph…'}</Text>;
}
export default function Photos() {
  const p = useLocalSearchParams<{
    id?: string;
    item?: string;
    action?: string;
  }>(),
    id = p.id ?? demo.inspectionId;
  const { handle } = useWorkspace();
  const task = useTask();
  const [caption, setCaption] = useState(""),
    [preview, setPreview] = useState("");
  const { data, error } = useQuery(async () => {
    const m = await handle.media(),
      c = await handle.catalogue.context(id),
      l = await handle.workflow.lifecycle(id),
      actions = await handle.workflow.actions(id);
    return {
      ...m,
      context: c,
      life: l,
      actions,
      assets: (await m.vault.list(id)).filter(
        (a) =>
          a.kind === "photo" &&
          a.item_id === p.item &&
          (p.action ? a.action_id === p.action : !a.action_id),
      ),
    };
  }, [id, p.item, p.action]);
  usePreventRemove(task.busy, () =>
    Alert.alert(
      "Saving a photograph",
      "Please wait for the photograph operation to finish.",
    ),
  );
  const readOnly = p.action
    ? data?.actions.find((a) => a.id === p.action)?.status === "resolved"
    : data?.life.status === "completed";
  return (
    <Page
      title={p.action ? "Resolution evidence" : "Inspection evidence"}
      subtitle={
        data?.context.workspace.items.find((i) => i.id === p.item)?.title
      }
    >
      {error && <Text style={ui.error}>{error}</Text>}
      {!data ? (
        <Loading />
      ) : (
        <>
          {!readOnly && (
            <View style={ui.card}>
              <Text style={ui.h}>Capture clear evidence</Text>
              <Text style={ui.muted}>Add a photograph and a concise observation to this checklist item.</Text>
              <Field
                label="Caption (optional)"
                value={caption}
                onChange={setCaption}
                max={300}
                disabled={task.busy}
              />
              <Button
                label="Take a photograph"
                disabled={task.busy}
                onPress={() =>
                  void task.run(async () => {
                    const a = await capturePhoto(
                      data.vault,
                      id,
                      p.item!,
                      caption,
                      true,
                      p.action ?? null,
                    );
                    if (!a)
                      throw Error(
                        "Capture cancelled. No photograph was saved.",
                      );
                    setCaption("");
                  }, "Photograph saved on this device.")
                }
              />
              <Button
                label="Choose a JPEG or PNG"
                secondary
                disabled={task.busy}
                onPress={() =>
                  void task.run(async () => {
                    const a = await capturePhoto(
                      data.vault,
                      id,
                      p.item!,
                      caption,
                      false,
                      p.action ?? null,
                    );
                    if (!a)
                      throw Error(
                        "Selection cancelled. No photograph was saved.",
                      );
                    setCaption("");
                  }, "Photograph saved on this device.")
                }
              />
              <Text style={ui.muted}>
                Use synthetic scenes only. Avoid faces, documents and access
                codes.
              </Text>
            </View>
          )}
          {readOnly && (
            <Text style={ui.muted}>
              This evidence belongs to preserved history and is read only.
            </Text>
          )}
          {!data.assets.length && (
            <Empty
              title="No photographs yet"
              detail={
                readOnly
                  ? "No photographs were attached to this record."
                  : "A clear photograph can make a finding easier to understand."
              }
            />
          )}{" "}
          {data.assets.map((a) => (
            <View key={a.id} style={ui.card}>
              {a.state === 'ready' && <EvidenceImage asset={a} vault={data.vault} />}
              <Pill
                text={
                  a.state === "ready"
                    ? "Saved on this device"
                    : "Needs recovery"
                }
                tone={a.state === "ready" ? "teal" : "amber"}
              />
              <Text style={ui.body}>
                {a.caption || "Inspection photograph"}
              </Text>
              {a.state === "ready" && (
                <Button
                  secondary
                  label="View photograph"
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(async () => {
                      setPreview(
                        `data:image/jpeg;base64,${base64(await data.vault.read(a.id))}`,
                      );
                    }, "Photograph opened.")
                  }
                />
              )}{" "}
              {["missing", "interrupted"].includes(a.state) && (
                <>
                  <Text style={ui.muted}>
                    The photograph is unavailable. Verify its encrypted copy
                    before continuing.
                  </Text>
                  <Button
                    label="Try recovering photograph"
                    disabled={task.busy}
                    onPress={() =>
                      void task.run(
                        () => data.vault.recover(a.id),
                        "Photograph recovered.",
                      )
                    }
                  />
                </>
              )}
              {!readOnly && (
                <Button
                  secondary
                  label="Delete photograph"
                  disabled={task.busy}
                  onPress={() =>
                    Alert.alert(
                      "Delete this photograph?",
                      "There is no remote backup. This cannot be undone.",
                      [
                        { text: "Cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () =>
                            void task.run(
                              () => data.vault.remove(a.id),
                              "Photograph deleted locally.",
                            ),
                        },
                      ],
                    )
                  }
                />
              )}
            </View>
          ))}
          {preview && (
            <View style={ui.card}>
              <Image
                accessibilityLabel="Attached synthetic inspection photograph"
                source={{ uri: preview }}
                style={{ width: "100%", height: 300 }}
                resizeMode="contain"
              />
              <Button
                label="Close preview"
                secondary
                onPress={() => setPreview("")}
              />
            </View>
          )}
        </>
      )}
      {task.error && (
        <Text accessibilityLiveRegion="polite" style={ui.error}>
          {task.error}
        </Text>
      )}
      {task.message && (
        <Text accessibilityLiveRegion="polite" style={ui.muted}>
          {task.message}
        </Text>
      )}
    </Page>
  );
}
