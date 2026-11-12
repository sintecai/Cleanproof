import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Empty, Loading, Page, Pill, Metric, SceneBanner, colour, ui } from "../src/application/ui";
import { useQuery, useWorkspace } from "../src/application/workspace";
import { displayDate } from "../src/domain/workflow";
export default function Home() {
  const { handle } = useWorkspace();
  const { data, error } = useQuery(async () => ({
    history: await handle.workflow.history(),
    sites: await handle.catalogue.sites(),
    actions: await handle.workflow.actions(),
    branding: await handle.workflow.branding(),
    syncState: await handle.business.state(),
  }));
  return (
    <Page
      title="Quality overview"
      subtitle="Inspections, evidence and follow-up in one place."
      back={false}
      tab="Home"
    >
      {error && <Text style={ui.error}>{error}</Text>}
      {!data ? (
        <Loading />
      ) : (
        <>
          <SceneBanner>
            <Text style={[ui.title, { color: "white" }]}>{data.branding.name}</Text>
            <Text style={{ fontSize: 16, lineHeight: 24, color: "#d4e9ed" }}>
              Every inspection. Clear evidence. Confident follow-up.
            </Text>
            <Text style={{ fontSize: 13, color: '#b7ddcf' }}>Ready for your next inspection</Text>
          </SceneBanner>
          <View style={ui.row}>
            <Button label="New inspection" onPress={() => router.push('/new-inspection')} />
            <Button label="Add site" secondary onPress={() => router.push({pathname:'/sites', params:{create:'1'}})} />
            <Button label="Add customer" secondary onPress={() => router.push({pathname:'/customers', params:{create:'1'}})} />
          </View>
          <View style={ui.row}>
            <Metric label="ACTIVE SITES" value={data.sites.filter(s => !s.archived).length} />
            <Metric label="DRAFT INSPECTIONS" value={data.history.filter(i => i.status === 'draft').length} tone="amber" />
            <Metric label="OVERDUE ACTIONS" value={data.actions.filter(a => a.status === "open" && a.due_date < new Date().toISOString().slice(0,10)).length} tone="red" />
            <Metric label="OPEN ACTIONS" value={data.actions.filter(a => a.status === 'open').length} tone="red" />
          </View>
          <View style={[ui.card, { backgroundColor: colour.soft, borderWidth: 0 }]}>
            <Text style={ui.label}>YOUR WORKSPACE</Text>
            <Text style={ui.muted}>{data.syncState}. Local completion is separate from synchronisation.</Text>
            <View style={ui.row}>
              <Button label="Customers" secondary onPress={() => router.push('/customers')} />
              <Button label="Templates" secondary onPress={() => router.push('/templates')} />
              <Button label="Company & people" secondary onPress={() => router.push('/settings')} />
              <Button label="Synchronisation" secondary onPress={() => router.push('/sync')} />
            </View>
          </View>
          <Text style={ui.h}>Continue unfinished work</Text>
          {data.history
            .filter((i) => i.status === "draft")
            .slice(0, 3)
            .map((i) => {
              const w = JSON.parse(i.workspace_json);
              return (
                <View style={ui.card} key={i.id}>
                  <View style={ui.row}>
                    <Pill text="Draft" tone="amber" />
                    <Text style={ui.muted}>
                      {displayDate(i.saved_at ?? i.created_at)}
                    </Text>
                  </View>
                  <Text style={ui.h}>{w.siteName}</Text>
                  <Text style={ui.muted}>{w.templateName}</Text>
                  <Button
                    secondary
                    label="Continue inspection"
                    onPress={() =>
                      router.push({
                        pathname: "/inspect",
                        params: { id: i.id },
                      })
                    }
                  />
                </View>
              );
            })}
          {!data.history.some((i) => i.status === "draft") && (
            <Empty
              title="No unfinished inspections"
              detail="Start an inspection when you are ready. Your completed work stays in History."
            />
          )}
          <Text style={ui.h}>Recently completed</Text>
          {data.history
            .filter((i) => i.status === "completed")
            .slice(0, 3)
            .map((i) => (
              <View style={ui.card} key={i.id}>
                <Text style={ui.h}>
                  {JSON.parse(i.workspace_json).siteName}
                </Text>
                <Text style={ui.muted}>
                  {displayDate(i.completed_at!)} · {i.inspector}
                </Text>
                <Button
                  secondary
                  label="View inspection & report"
                  onPress={() =>
                    router.push({ pathname: "/inspect", params: { id: i.id } })
                  }
                />
              </View>
            ))}
          {!data.history.some((i) => i.status === "completed") && (
            <Empty
              title="Your first report starts here"
              detail="Complete an inspection to keep a permanent local record. Draft reports are also available before completion."
            />
          )}
        </>
      )}
    </Page>
  );
}
