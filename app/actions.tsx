import { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import { displayDate, dueToday } from "../src/domain/workflow";
export default function Actions() {
  const params = useLocalSearchParams<{
    id?: string;
    item?: string;
    create?: string;
  }>();
  const { handle } = useWorkspace();
  const task = useTask();
  const [editDescription, setEditDescription] = useState(""),
    [editOwner, setEditOwner] = useState(""),
    [editDue, setEditDue] = useState("");
  const [description, setDescription] = useState(""),
    [owner, setOwner] = useState(""),
    [due, setDue] = useState(""),
    [note, setNote] = useState(""),
    [selected, setSelected] = useState(""),
    [filter, setFilter] = useState("open"),
    [form, setForm] = useState(params.create === "1");
  const { data, error } = useQuery(
    async () => ({
      actions: await handle.workflow.actions(params.id),
      people: await handle.workflow.people(),
      history: await handle.workflow.history(),
    }),
    [params.id],
  );
  const history = useQuery(
    () =>
      selected ? handle.workflow.actionHistory(selected) : Promise.resolve([]),
    [selected],
  );
  return (
    <Page
      title="Corrective actions"
      subtitle="A clear owner, due date and resolution for every finding."
      tab={params.id ? undefined : "Actions"}
    >
      {error && <Text style={ui.error}>{error}</Text>}
      {task.error && (
        <Text accessibilityLiveRegion="polite" style={ui.error}>
          {task.error}
        </Text>
      )}
      {task.message && <Text style={ui.muted}>{task.message}</Text>}
      {form && params.id && params.item && (
        <View style={ui.card}>
          <Text style={ui.h}>Follow up this failed item</Text>
          <Field
            label="What needs to be done? *"
            value={description}
            onChange={setDescription}
            multiline
            disabled={task.busy}
          />
          <Text style={ui.label}>Responsible person *</Text>
          {data?.people
            .filter((p) => p.active)
            .map((p) => (
              <Button
                key={p.id}
                secondary={owner !== p.id}
                label={`${owner === p.id ? "✓ " : ""}${p.name}`}
                disabled={task.busy}
                onPress={() => setOwner(p.id)}
              />
            ))}
          <Button
            label="Manage local people"
            secondary
            onPress={() => router.push("/settings")}
          />
          <Field
            label="Due date * (YYYY-MM-DD)"
            value={due}
            onChange={setDue}
            max={10}
            placeholder="2026-10-23"
            disabled={task.busy}
          />
          <Text style={ui.muted}>
            Due dates use the site's timezone. Assignment is local and does not
            send a notification.
          </Text>
          <Button
            label="Save corrective action"
            disabled={task.busy}
            onPress={() =>
              void task.run(async () => {
                await handle.workflow.createAction(
                  params.id!,
                  params.item!,
                  description,
                  owner,
                  due,
                );
                setDescription("");
                setForm(false);
              })
            }
          />
          <Button label="Cancel" secondary onPress={() => setForm(false)} />
        </View>
      )}
      <View style={ui.row}>
        {["open", "resolved", "all"].map((s) => (
          <Button
            key={s}
            secondary={filter !== s}
            label={
              s === "all" ? "All actions" : s === "open" ? "Open" : "Resolved"
            }
            onPress={() => setFilter(s)}
          />
        ))}
      </View>
      {!data ? (
        <Loading />
      ) : !data.actions.filter((a) => filter === "all" || a.status === filter)
        .length ? (
        <Empty
          title="No actions to show"
          detail="Create an action from a failed item inside an inspection. Resolved actions remain available here."
        />
      ) : (
        data.actions
          .filter((a) => filter === "all" || a.status === filter)
          .map((a) => {
            const inspection = data.history.find(
              (i) => i.id === a.inspection_id,
            ),
              w = inspection ? JSON.parse(inspection.workspace_json) : null;
            const overdue =
              a.status === "open" &&
              a.due_date < dueToday(inspection?.timezone);
            return (
              <View key={a.id} style={ui.card}>
                <View style={ui.row}>
                  <Pill
                    text={
                      a.status === "resolved"
                        ? "Resolved"
                        : overdue
                          ? "Overdue"
                          : "Open"
                    }
                    tone={
                      overdue ? "red" : a.status === "open" ? "amber" : "teal"
                    }
                  />
                  <Text style={ui.muted}>Due {displayDate(a.due_date)}</Text>
                </View>
                <Text style={ui.h}>{a.description}</Text>
                <View style={[ui.card, { backgroundColor: colour.soft, borderWidth: 0 }]}>
                  <Text style={ui.label}>RESPONSIBLE PERSON</Text>
                  <Text style={ui.body}>{a.owner_name}</Text>
                  <Text style={ui.label}>LOCATION & INSPECTION CONTEXT</Text>
                  <Text style={ui.muted}>
                    {w?.siteName}\n
                    {
                      w?.items.find((i: { id: string }) => i.id === a.item_id)
                        ?.title
                    }
                  </Text>
                </View>
                {a.status === "resolved" && (
                  <>
                    <Text style={ui.body}>{a.resolution_note}</Text>
                    <Text style={ui.muted}>
                      Resolved {displayDate(a.resolved_at!)}
                    </Text>
                  </>
                )}
                <Button
                  label={
                    selected === a.id
                      ? "Hide action details"
                      : "Update action / view history"
                  }
                  secondary
                  onPress={() => {
                    setSelected(selected === a.id ? "" : a.id);
                    setEditDescription(a.description);
                    setEditOwner(a.owner_id);
                    setEditDue(a.due_date);
                    setNote("");
                  }}
                />
                {selected === a.id && (
                  <>
                    {a.status === "open" && (
                      <View style={ui.card}>
                        <Text style={ui.h}>Action details</Text>
                        <Field
                          label="Description"
                          value={editDescription}
                          onChange={setEditDescription}
                          disabled={task.busy}
                          multiline
                        />
                        <Field
                          label="Due date (YYYY-MM-DD)"
                          value={editDue}
                          onChange={setEditDue}
                          disabled={task.busy}
                          max={10}
                        />
                        {data.people
                          .filter((p) => p.active)
                          .map((p) => (
                            <Button
                              key={p.id}
                              label={`${editOwner === p.id ? "✓ " : ""}${p.name}`}
                              secondary={editOwner !== p.id}
                              disabled={task.busy}
                              onPress={() => setEditOwner(p.id)}
                            />
                          ))}
                        <Button
                          label="Save action details"
                          disabled={task.busy}
                          onPress={() =>
                            void task.run(() =>
                              handle.workflow.updateAction(
                                a.id,
                                a.revision,
                                editDescription,
                                editOwner,
                                editDue,
                              ),
                            )
                          }
                        />
                      </View>
                    )}

                    <Button
                      label={
                        a.status === "open"
                          ? "Add / view resolution evidence"
                          : "View resolution evidence"
                      }
                      secondary
                      onPress={() =>
                        router.push({
                          pathname: "/photos",
                          params: {
                            id: a.inspection_id,
                            item: a.item_id,
                            action: a.id,
                          },
                        })
                      }
                    />
                    <Field
                      label={
                        a.status === "open"
                          ? "Resolution notes *"
                          : "Reason for reopening *"
                      }
                      value={note}
                      onChange={setNote}
                      multiline
                      disabled={task.busy}
                    />
                    <Button
                      label={
                        a.status === "open" ? "Mark resolved" : "Reopen action"
                      }
                      disabled={task.busy}
                      onPress={() =>
                        void task.run(
                          async () => {
                            const m = await handle.media();
                            for (const asset of (
                              await m.vault.list(a.inspection_id)
                            ).filter((x) => x.action_id === a.id))
                              await m.vault.read(asset.id);
                            await handle.workflow.transitionAction(
                              a.id,
                              a.revision,
                              a.status === "open" ? "resolved" : "open",
                              note,
                            );
                            setNote("");
                          },
                          a.status === "open"
                            ? "Action resolved locally."
                            : "Action reopened locally.",
                        )
                      }
                    />
                    <Text style={ui.h}>Action history</Text>
                    {history.data?.map((e, n) => (
                      <Text style={ui.muted} key={n}>
                        {displayDate(e.created_at)} · {e.event} ·{" "}
                        {JSON.parse(e.snapshot_json).resolution_note ||
                          JSON.parse(e.snapshot_json).description}
                      </Text>
                    ))}
                  </>
                )}
                <Button
                  label="Open linked inspection"
                  secondary
                  onPress={() =>
                    router.push({
                      pathname: "/inspect",
                      params: { id: a.inspection_id },
                    })
                  }
                />
              </View>
            );
          })
      )}
    </Page>
  );
}
