import { useEffect, useState } from "react";
import { Alert } from "./platformAlert";
import { Text, View } from "react-native";
import { router, usePreventRemove, useLocalSearchParams } from "expo-router";
import { Button, Empty, Field, Loading, Page, Pill, ui } from "./ui";
import { useQuery, useTask, useWorkspace } from "./workspace";
export function Records({ kind }: { kind: "customers" | "sites" }) {
  const { handle } = useWorkspace();
  const params = useLocalSearchParams<{create?:string}>();
  const { data, error } = useQuery(async () => ({
    customers: await handle.catalogue.customers(),
    sites: await handle.catalogue.sites(),
  }));
  const [search, setSearch] = useState(""),
    [form, setForm] = useState(params.create === "1"),
    [id, setId] = useState<string | undefined>(),
    [name, setName] = useState(""),
    [contact, setContact] = useState(""),
    [customer, setCustomer] = useState(""),
    [address, setAddress] = useState(""),
    [timezone, setTimezone] = useState("Europe/London"),
    [notes, setNotes] = useState(""),
    [archived, setArchived] = useState(false);
  const task = useTask();
  usePreventRemove(form, ({ repeat }) =>
    Alert.alert(
      "Discard unsaved details?",
      "Your saved records will stay unchanged.",
      [
        { text: "Keep editing" },
        {
          text: "Discard changes",
          style: "destructive",
          onPress: () => {
            setForm(false);
            repeat();
          },
        },
      ],
    ),
  );
  const reset = () => {
    setId(undefined);
    setName("");
    setContact("");
    setAddress("");
    setNotes("");
    setCustomer("");
    setForm(true);
  };
  useEffect(() => { if(params.create === "1") setForm(true); }, [params.create]);
  const title = kind === "sites" ? "Sites" : "Customers";
  const rows = data
    ? (kind === "sites" ? data.sites : data.customers).filter(
        (r) =>
          (archived || !r.archived) &&
          `${r.name} ${"address" in r ? r.address : r.contact}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : [];
  return (
    <Page
      focusKey={`${form}:${id}`}
      title={title}
      subtitle={
        kind === "sites"
          ? "Find a site, check its details and start an inspection."
          : "Keep business contacts and their sites together."
      }
      tab={kind === "sites" ? "Sites" : undefined}
    >
      <Button
        label={`Add ${kind === "sites" ? "site" : "customer"}`}
        onPress={reset}
        disabled={task.busy}
      />
      <Field
        label={`Search ${title.toLowerCase()}`}
        value={search}
        onChange={setSearch}
        max={120}
        placeholder="Search by name or details"
      />
      <Button
        secondary
        label={archived ? "Hide archived records" : "Show archived records"}
        onPress={() => setArchived((v) => !v)}
      />
      {error && <Text style={ui.error}>{error}</Text>}
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
      {form && (
        <View style={ui.card}>
          <Text style={ui.h}>
            {id ? "Edit" : "New"} {kind === "sites" ? "site" : "customer"}
          </Text>
          {kind === "sites" && (
            <>
              <Text style={ui.label}>Customer</Text>
              {data?.customers
                .filter((c) => !c.archived)
                .map((c) => (
                  <Button
                    key={c.id}
                    disabled={task.busy}
                    secondary={c.id !== customer}
                    label={`${c.id === customer ? "✓ " : ""}${c.name}`}
                    onPress={() => setCustomer(c.id)}
                  />
                ))}
              {!data?.customers.some((c) => !c.archived) && (
                <Button
                  label="Create a customer first"
                  onPress={() => router.push("/customers")}
                />
              )}
            </>
          )}
          <Field
            label={kind === "sites" ? "Site name" : "Customer name"}
            value={name}
            onChange={setName}
            max={120}
            disabled={task.busy}
          />
          {kind === "customers" ? (
            <Field
              label="Business contact (optional)"
              value={contact}
              onChange={setContact}
              max={240}
              disabled={task.busy}
            />
          ) : (
            <>
              <Field
                label="Site address"
                value={address}
                onChange={setAddress}
                multiline
                max={500}
                disabled={task.busy}
              />
              <Field
                label="Timezone"
                value={timezone}
                onChange={setTimezone}
                placeholder="Europe/London"
                max={80}
                disabled={task.busy}
              />
              <Field
                label="Safe site notes (optional)"
                value={notes}
                onChange={setNotes}
                multiline
                disabled={task.busy}
              />
            </>
          )}
          <Button
            label={task.busy ? "Saving…" : "Save changes"}
            disabled={task.busy}
            onPress={() =>
              void task.run(async () => {
                if (kind === "sites")
                  await handle.catalogue.site(
                    customer,
                    name,
                    address,
                    timezone,
                    notes,
                    id,
                  );
                else await handle.catalogue.customer(name, contact, id);
                setForm(false);
              })
            }
          />
          <Button
            label="Cancel editing"
            secondary
            disabled={task.busy}
            onPress={() => setForm(false)}
          />
        </View>
      )}
      {!data ? (
        <Loading />
      ) : !rows.length ? (
        <Empty
          title={
            search ? "No matching records" : `No ${title.toLowerCase()} to show`
          }
          detail={
            search
              ? "Try another name or clear your search."
              : "Add your first record using the button above."
          }
        />
      ) : (
        rows.map((r) => (
          <View key={r.id} style={ui.card}>
            <View style={ui.row}>
              <Text style={[ui.h, { flex: 1 }]}>{r.name}</Text>
              {!!r.archived && <Pill text="Archived" tone="amber" />}
            </View>
            {"address" in r ? (
              <>
                <Text style={ui.body}>
                  {data.customers.find((c) => c.id === r.customer_id)?.name}
                </Text>
                <Text style={ui.muted}>
                  {r.address || "No address added"}
                  {r.notes ? `\n${r.notes}` : ""}
                </Text>
                <Text style={ui.muted}>{r.timezone}</Text>
              </>
            ) : (
              <Text style={ui.body}>
                {r.contact || "No business contact added"}
              </Text>
            )}
            {!r.archived && (
              <>
                <Button
                  label={kind === "sites" ? "Edit site" : "Edit customer"}
                  secondary
                  disabled={task.busy}
                  onPress={() => {
                    setId(r.id);
                    setName(r.name);
                    if ("address" in r) {
                      setCustomer(r.customer_id);
                      setAddress(r.address);
                      setTimezone(r.timezone);
                      setNotes(r.notes);
                    } else setContact(r.contact);
                    setForm(true);
                  }}
                />
                {kind === "sites" && (
                  <Button
                    label="Inspect this site"
                    disabled={task.busy}
                    onPress={() =>
                      router.push({
                        pathname: "/new-inspection",
                        params: { site: r.id },
                      })
                    }
                  />
                )}
                <Button
                  label="Archive"
                  secondary
                  disabled={task.busy}
                  onPress={() =>
                    Alert.alert(
                      `Archive ${r.name}?`,
                      "Existing inspections are retained. Archived records cannot be selected for new inspections.",
                      [
                        { text: "Cancel" },
                        {
                          text: "Archive",
                          onPress: () =>
                            void task.run(() =>
                              handle.catalogue.archive(kind, r.id),
                            ),
                        },
                      ],
                    )
                  }
                />
              </>
            )}
          </View>
        ))
      )}
    </Page>
  );
}
