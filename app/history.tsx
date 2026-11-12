import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Empty,
  Field,
  Loading,
  Page,
  Pill,
  ui,
} from "../src/application/ui";
import { useQuery, useWorkspace } from "../src/application/workspace";
import { displayDate } from "../src/domain/workflow";
export default function History() {
  const { handle } = useWorkspace();
  const { data, error } = useQuery(() => handle.workflow.history());
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [limit, setLimit] = useState(20);
  const rows =
    data?.filter(
      (i) =>
        (status === "all" || i.status === status) &&
        JSON.parse(i.workspace_json)
          .siteName.toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  return (
    <Page
      title="Inspection history"
      subtitle="Drafts and completed local records, preserved by site and date."
      tab="History"
    >
      <Field
        label="Search by site"
        value={query}
        onChange={(s) => {
          setQuery(s);
          setLimit(20);
        }}
        max={120}
      />
      <View style={ui.row}>
        {["all", "draft", "completed"].map((s) => (
          <Button
            key={s}
            label={
              s === "all"
                ? "All inspections"
                : s === "draft"
                  ? "Drafts"
                  : "Completed"
            }
            secondary={status !== s}
            onPress={() => {
              setStatus(s);
              setLimit(20);
            }}
          />
        ))}
      </View>
      {error && <Text style={ui.error}>{error}</Text>}
      {!data ? (
        <Loading />
      ) : !rows.length ? (
        <Empty
          title="No matching inspections"
          detail="Change the search or start a new inspection from Home."
        />
      ) : (
        rows.slice(0, limit).map((i) => {
          const w = JSON.parse(i.workspace_json);
          return (
            <View key={i.id} style={ui.card}>
              <Pill
                text={i.status === "completed" ? "Completed locally" : "Draft"}
                tone={i.status === "draft" ? "amber" : "teal"}
              />
              <Text style={ui.h}>{w.siteName}</Text>
              <Text style={ui.muted}>
                {w.templateName}{" · "}
                {displayDate(i.completed_at ?? i.saved_at ?? i.created_at)}
                {i.inspector ? ` · ${i.inspector}` : ""}
                {i.correction_of ? "\nCorrection of an earlier inspection" : ""}
              </Text>
              <View style={ui.row}>
              <Button
                label={
                  i.status === "draft"
                    ? "Continue draft"
                    : "View completed record"
                }
                secondary
                onPress={() =>
                  router.push({ pathname: "/inspect", params: { id: i.id } })
                }
              />
              <Button
                label="View report"
                secondary
                onPress={() =>
                  router.push({ pathname: "/reports", params: { id: i.id } })
                }
              />
              </View>
            </View>
          );
        })
      )}
      {rows.length > limit && (
        <Button
          label="Show 20 more"
          secondary
          onPress={() => setLimit((n) => n + 20)}
        />
      )}
    </Page>
  );
}
