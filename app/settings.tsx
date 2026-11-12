import { Alert } from "../src/application/platformAlert";
import { router } from "expo-router";
import { usePreventRemove } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Field, Loading, Page, ui } from "../src/application/ui";
import { useQuery, useTask, useWorkspace } from "../src/application/workspace";
export default function Settings() {
  const { handle, reopen } = useWorkspace();
  const task = useTask();
  const [data, setData] = useState({ name: "", contact: "" }),
    [loaded, setLoaded] = useState(false),
    [person, setPerson] = useState("");
  const result = useQuery(async () => {
    const branding = await handle.workflow.branding();
    if (!loaded) {
      setData(branding);
      setLoaded(true);
    }
    return {
      branding,
      people: await handle.workflow.people(),
      orphans: (await handle.media()).orphans.length,
    };
  });
  const dirty =
    !!result.data &&
    (data.name !== result.data.branding.name ||
      data.contact !== result.data.branding.contact ||
      !!person.trim());
  usePreventRemove(dirty, ({ repeat }) =>
    Alert.alert(
      "Discard unsaved settings?",
      "Saved company details and people will stay unchanged.",
      [
        { text: "Keep editing" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            if (result.data) setData(result.data.branding);
            setPerson("");
            repeat();
          },
        },
      ],
    ),
  );
  return (
    <Page
      title="Company & people"
      subtitle="Brand your local reports and name the people responsible for actions."
    >
      {!result.data ? (
        <Loading />
      ) : (
        <>
          {process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS === "1" &&
            handle.createDemo && (
              <View style={ui.card}>
                <Text style={ui.h}>Development-only synthetic workspace</Text>
                <Text style={ui.muted}>
                  Creates separate encrypted storage with customers, sites,
                  draft/completed inspections, photographs and actions. Your
                  existing workspace is retained.
                </Text>
                <Button
                  label="Create separate synthetic demo"
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(async () => {
                      await handle.createDemo!();
                      reopen();
                    }, "Synthetic workspace created.")
                  }
                />
              </View>
            )}
          {handle.returnProtected && (
            <Button
              label="Open previous protected workspace"
              secondary
              onPress={() =>
                void task.run(async () => {
                  await handle.returnProtected!();
                  reopen();
                }, "Previous workspace selected; its access checks still apply.")
              }
            />
          )}
          <View style={ui.card}>
            <Text style={ui.h}>Report branding</Text>
            <Field
              label="Company trading name"
              value={data.name}
              onChange={(name) => setData({ ...data, name })}
              max={120}
              disabled={task.busy}
            />
            <Field
              label="Business contact details"
              value={data.contact}
              onChange={(contact) => setData({ ...data, contact })}
              max={500}
              multiline
              disabled={task.busy}
            />
            <Button
              label="Save report branding"
              disabled={task.busy}
              onPress={() =>
                void task.run(() =>
                  handle.workflow.saveBranding(data.name, data.contact),
                )
              }
            />
            <Text style={ui.muted}>
              Completed inspections retain the branding used at completion.
            </Text>
          </View>
          <View style={ui.card}>
            <Text style={ui.h}>Responsible people</Text>
            {result.data.people.map((p) => (
              <Text key={p.id} style={ui.body}>
                {p.name}
              </Text>
            ))}
            <Field
              label="Add a person's display name"
              value={person}
              onChange={setPerson}
              max={120}
              disabled={task.busy}
            />
            <Button
              secondary
              label="Add local assignee"
              disabled={task.busy}
              onPress={() =>
                void task.run(async () => {
                  await handle.workflow.addPerson(person);
                  setPerson("");
                })
              }
            />
            <Text style={ui.muted}>
              These are local labels, not team accounts. Assigning an action
              does not send a notification.
            </Text>
          </View>
        </>
      )}
      {task.error && <Text style={ui.error}>{task.error}</Text>}
      {task.message && <Text style={ui.muted}>{task.message}</Text>}
      {result.error && <Text style={ui.error}>{result.error}</Text>}
      <Button
        label="Synchronisation"
        secondary
        onPress={() => router.push("/sync")}
      />
      {process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS==='1'&&<Button
        label="Development connection"
        secondary
        onPress={() => router.push("/account")}
      />}
      <Button label="Delete my account" secondary onPress={()=>router.push('/account-deletion')}/>
      <View style={ui.card}>
        <Text style={ui.h}>Storage & access</Text>
        {!!result.data?.orphans && (
          <Text style={ui.error}>
            Some encrypted files need developer review. They have been
            preserved; do not reset the app.
          </Text>
        )}
        <Text style={ui.body}>
          Work is saved on this device. Use Synchronisation to review company
          adoption and acknowledged delivery. Secure client links are a later
          milestone.
        </Text>
        <Text style={ui.muted}>
          Use synthetic information only. Uninstalling, clearing storage or
          losing the device can lose unsent work. Do not reset the app to fix a
          storage error.
        </Text>
      </View>
    </Page>
  );
}
