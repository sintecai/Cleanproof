import {hasCustomerSession,lockCustomerEntry} from '../src/application/customerSession';
import { useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { usePreventRemove } from "expo-router";
import { Button, Field, Page, Pill, ui } from "../src/application/ui";
import { useWorkspace } from "../src/application/workspace";
import type { AuthConnection } from "../src/auth/session";
import type { RemoteRecord, Operation } from "../src/sync/protocol";
import { SyncWorker } from "../src/sync/worker";
import { supabaseTransport } from "../src/sync/transport";
import * as Crypto from "expo-crypto";
/** Separate synthetic development connection. Never silently adopts the existing local company. */
export default function Account() {
  const { handle, reopen } = useWorkspace();
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:54321"),
    [publicKey, setPublicKey] = useState("");
  const [connection, setConnection] = useState<AuthConnection | null>(null),
    [configured, setConfigured] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [reset, setReset] = useState(false);
  const [companyName, setCompanyName] = useState("Synthetic Alder Cleaning"),
    [companies, setCompanies] = useState<
      { company_id: string; role: "owner" | "inspector"; active: boolean }[]
    >([]),
    [company, setCompany] = useState(""),
    [user, setUser] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [name, setName] = useState(""),
    [records, setRecords] = useState<RemoteRecord[]>([]),
    [customer, setCustomer] = useState(""),
    [status, setStatus] = useState<{ state: string; n: number }[]>([]),
    [conflicts, setConflicts] = useState<
      { operation_id: string; request_json: string; receipt_json: string }[]
    >([]),
    [legacy, setLegacy] = useState({ drafts: 0, events: 0 });
  const running = useRef(false),
    active = useRef(true);
  usePreventRemove(busy, () => {});
  function lockView() {
    setRecords([]);
    setCompanies([]);
    setCompany("");
    setUser("");
    setPassword("");
    setCode("");
    setName("");
    setStatus([]);
    setConflicts([]);
    setMessage("");
  }
  useEffect(() => {
    active.current = true;
    let c: AuthConnection | null = null;
    try {
      c = handle.connection();
      setConnection(c);
    } catch {
      setError(
        "The backend configuration is invalid. Check the public URL/key; existing local work is unchanged.",
      );
    }
    setConfigured(true);
    const timer = setInterval(() => {
      if (c?.session() && c.session()!.expires_at * 1000 <= Date.now()) {
        c.lock();
        lockView();
      }
    }, 1000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        c?.lock();
        lockView();
      }
    });
    return () => {
      active.current = false;
      listener.remove();
      clearInterval(timer);
    };
  }, [handle]);
  async function task(work: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error
            ? e.message
            : "This request could not be completed.",
        );
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function loadIdentity(c: AuthConnection) {
    setRecords([]);
    setUser("");
    setCompany("");
    const memberships = await c.memberships();
    if (!active.current || AppState.currentState !== "active") return;
    setUser(c.session()!.user.id);
    setCompanies(memberships);
    if (memberships.length === 1) setCompany(memberships[0]!.company_id);
  }
  async function inspectQueue() {
    if (!user || !company) return;
    const s = handle.syncStore(user, company);
    setStatus(await s.status());
    setConflicts(await s.conflicts());
    setLegacy(await s.legacyPending());
  }
  async function sync() {
    if (!connection || !user || !company) return;
    const c = connection,
      s = handle.syncStore(user, company);
    setRecords([]);
    try {
      await new SyncWorker(s, supabaseTransport(c)).run();
      if (
        active.current &&
        AppState.currentState === "active" &&
        c.session()?.user.id === user
      ) {
        setRecords(await s.records());
        setMessage(
          "Metadata sync finished. This does not synchronise local inspections, photos or PDFs.",
        );
      }
    } finally {
      await inspectQueue();
    }
  }
  const owner =
    companies.find((c) => c.company_id === company)?.role === "owner";
  async function queue(
    kind: "customer" | "site",
    base?: RemoteRecord,
    deleted = false,
  ) {
    if (!name.trim() && !deleted) throw Error("Enter a name.");
    if (!user || !company) throw Error("Connect to a company first.");
    const id = base?.id ?? Crypto.randomUUID();
    const o: Operation = {
      protocol: 1,
      operationId: Crypto.randomUUID(),
      companyId: company,
      entityId: id,
      kind,
      siteId: kind === "site" ? id : null,
      parentId: base?.parent_id ?? (kind === "site" ? customer : null),
      payload: { name: deleted ? base!.payload.name : name.trim() },
      expectedRevision: base?.revision ?? 0,
      deleted,
    };
    await handle.syncStore(user, company).enqueue(o);
    setName("");
    await inspectQueue();
    setMessage("Saved on this device. Waiting to sync.");
  }
  return (
    <Page
      title="Development connection"
      subtitle="Synthetic backend foundation · separate from local inspections"
    >
      <View style={ui.warning}>
        <Text style={ui.body}>
          Local inspections and encrypted photographs remain in the original
          workspace. They are not automatically uploaded or marked Synced. This
          screen tests account access and separate customer/site metadata.
        </Text>
      </View>
      {!connection && handle.configureBackend && (
        <View style={ui.card}>
          <Text style={ui.h}>Local backend connection</Text>
          <Field
            label="Backend URL"
            value={backendUrl}
            onChange={setBackendUrl}
          />
          <Field
            label="PUBLIC anon/publishable key"
            value={publicKey}
            onChange={setPublicKey}
          />
          <Text style={ui.muted}>
            Use the public key only. For Android USB testing, run adb reverse
            tcp:54321 tcp:54321 and use http://127.0.0.1:54321. Never enter a
            service-role key.
          </Text>
          <Button
            label="Save public connection settings"
            disabled={busy || !publicKey.trim()}
            onPress={() =>
              void task(async () => {
                await handle.configureBackend!(backendUrl, publicKey.trim());
                reopen();
              })
            }
          />
        </View>
      )}
      {!configured ? (
        <Text style={ui.muted}>Checking configuration…</Text>
      ) : !connection ? (
        <Text style={ui.body}>
          {process.env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY === "1"
            ? "Account sign-in and password recovery are unavailable in this local browser demo. Customer, inspection, photo, action and report workflows save in this browser."
            : "No backend configured. Follow the backend setup instructions for an authorised local connection."}
        </Text>
      ) : (
        <>
          {!user ? (
            <View style={ui.card}>
              <Text style={ui.h}>Sign in to local Supabase</Text>
              <Field
                label="Synthetic email"
                keyboardType="email-address"
                value={email}
                onChange={setEmail}
                max={254}
                disabled={busy}
              />
              <Field
                label={reset ? "New password" : "Password"}
                secure
                value={password}
                onChange={setPassword}
                max={256}
                disabled={busy}
              />
              <Button
                label="Sign in"
                disabled={busy}
                onPress={() =>
                  void task(async () => {
                    lockView();
                    const p = password;
                    setPassword("");
                    await connection.signIn(email, p);
                    await loadIdentity(connection);
                  })
                }
              />
              <Button
                label="Recover saved session"
                secondary
                disabled={busy}
                onPress={() =>
                  void task(async () => {
                    await connection.restore();
                    await loadIdentity(connection);
                  })
                }
              />
              <Button
                label="Remove saved sign-in from this device"
                secondary
                disabled={busy}
                onPress={() =>
                  void task(async () => {
                    if(hasCustomerSession()){lockCustomerEntry();return;}
                    lockView();
                    const result = await connection.signOut();
                    setMessage(
                      result.serverRevoked
                        ? "Saved sign-in removed. Queued work remains protected."
                        : "Saved sign-in removed locally; server revocation could not be confirmed.",
                    );
                  })
                }
              />
              <Button
                label="Request password reset"
                secondary
                disabled={busy}
                onPress={() =>
                  void task(async () => {
                    await connection.requestReset(email);
                    setReset(true);
                    setMessage(
                      "If the account exists, use its recovery code from the local test mailbox.",
                    );
                  })
                }
              />
              {reset && (
                <>
                  <Field
                    label="Recovery code from local mailbox"
                    value={code}
                    onChange={setCode}
                    keyboardType="numeric"
                    max={12}
                    disabled={busy}
                  />
                  <Button
                    label="Set new password"
                    disabled={busy}
                    onPress={() =>
                      void task(async () => {
                        const p = password,
                          t = code;
                        setPassword("");
                        setCode("");
                        await connection.recover(email, t, p);
                        setReset(false);
                        await loadIdentity(connection);
                      })
                    }
                  />
                </>
              )}
              <Text style={ui.muted}>
                Connected records require online session and membership
                verification. No offline account access is enabled in this
                foundation. Saved sessions are held in the encrypted database,
                never ordinary preferences.
              </Text>
            </View>
          ) : (
            <>
              <View style={ui.card}>
                <Text style={ui.h}>Company access</Text>
                {companies.map((c) => (
                  <Button
                    key={c.company_id}
                    secondary
                    label={`${c.role} · ${c.company_id.slice(0, 8)}${company === c.company_id ? " · selected" : ""}`}
                    disabled={busy}
                    onPress={() => {
                      setCompany(c.company_id);
                      setRecords([]);
                      setStatus([]);
                      setConflicts([]);
                      setCustomer("");
                    }}
                  />
                ))}
                {!companies.length && (
                  <>
                    <Field
                      label="Synthetic company name"
                      value={companyName}
                      onChange={setCompanyName}
                      max={120}
                      disabled={busy}
                    />
                    <Button
                      label="Create synthetic company"
                      disabled={busy}
                      onPress={() =>
                        void task(async () => {
                          await connection.rpc("cp_create_company", {
                            company_name: companyName,
                          });
                          await loadIdentity(connection);
                        })
                      }
                    />
                  </>
                )}
                <Button
                  label="Sign out & lock connected records"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void task(async () => {
                      if(hasCustomerSession()){lockCustomerEntry();return;}
                      lockView();
                      const result = await connection.signOut();
                      setMessage(
                        result.serverRevoked
                          ? "Signed out on this device. Queued work is retained for the same account."
                          : "Signed out on this device. Server revocation could not be confirmed; reconnect before using a shared device.",
                      );
                    })
                  }
                />
                <Text style={ui.muted}>
                  Owner and Inspector are the approved roles. A manager role,
                  invitations and MFA enrolment are not implemented. Local
                  assignee names remain separate from accounts.
                </Text>
              </View>
              {!!company && (
                <>
                  <View style={ui.card}>
                    <Text style={ui.h}>Synchronisation</Text>
                    <Button
                      label="Connect & sync metadata"
                      disabled={busy}
                      onPress={() => void task(sync)}
                    />
                    <Button
                      secondary
                      label="Retry queued metadata"
                      disabled={busy}
                      onPress={() =>
                        void task(async () => {
                          await handle.syncStore(user, company).retry();
                          await sync();
                        })
                      }
                    />
                    <Button
                      secondary
                      label="Check saved queue"
                      disabled={busy}
                      onPress={() => void task(inspectQueue)}
                    />
                    {status.map((s) => (
                      <Pill
                        key={s.state}
                        text={`${s.n} ${s.state === "accepted" ? "Synced metadata operations" : s.state === "pending" ? "Waiting to sync" : "Sync needs attention"}`}
                        tone={s.state === "accepted" ? "teal" : "amber"}
                      />
                    ))}
                    <Text style={ui.muted}>
                      {legacy.drafts} original draft operations and{" "}
                      {legacy.events} local events remain untouched. Inspection
                      import, attachment transfers and cross-device inspection
                      editing are the next milestone.
                    </Text>
                  </View>
                  {owner && (
                    <View style={ui.card}>
                      <Text style={ui.h}>Synthetic customer/site metadata</Text>
                      <Field
                        label="Customer or site name"
                        value={name}
                        onChange={setName}
                        max={120}
                        disabled={busy}
                      />
                      <Button
                        label="Queue customer"
                        disabled={busy}
                        onPress={() => void task(() => queue("customer"))}
                      />
                      {records
                        .filter((r) => r.kind === "customer" && !r.deleted)
                        .map((r) => (
                          <Button
                            key={r.id}
                            secondary
                            label={`${customer === r.id ? "Selected: " : ""}${String(r.payload.name)}`}
                            disabled={busy}
                            onPress={() => setCustomer(r.id)}
                          />
                        ))}
                      <Button
                        label="Queue site for selected customer"
                        disabled={busy || !customer}
                        onPress={() => void task(() => queue("site"))}
                      />
                      <Text style={ui.muted}>
                        Use synthetic names. Creating or editing here affects
                        the separate connected metadata store, not the
                        Customers/Sites screens.
                      </Text>
                    </View>
                  )}
                  {records.map((r) => (
                    <View key={r.id} style={ui.card}>
                      <Text style={ui.h}>
                        {String(r.payload.name ?? r.kind)}
                      </Text>
                      <Text style={ui.muted}>
                        {r.kind} · server revision {r.revision} ·{" "}
                        {r.deleted
                          ? "Deleted (tombstone retained)"
                          : "authorised record"}
                      </Text>
                      {owner &&
                        ["customer", "site"].includes(r.kind) &&
                        !r.deleted && (
                          <>
                            <Button
                              secondary
                              label="Queue rename using name field"
                              disabled={busy}
                              onPress={() =>
                                void task(() =>
                                  queue(r.kind as "customer" | "site", r),
                                )
                              }
                            />
                            <Button
                              secondary
                              label="Queue deletion"
                              disabled={busy}
                              onPress={() =>
                                void task(() =>
                                  queue(r.kind as "customer" | "site", r, true),
                                )
                              }
                            />
                          </>
                        )}
                    </View>
                  ))}
                  {conflicts.map((c) => (
                    <View key={c.operation_id} style={ui.warning}>
                      <Text style={ui.h}>Sync needs attention</Text>
                      <Text style={ui.body}>
                        Another edit exists. Both the queued proposal and server
                        response are retained. Nothing has overwritten your
                        proposal.
                      </Text>
                      <Text style={ui.muted}>
                        Proposed name:{" "}
                        {String(
                          JSON.parse(c.request_json).payload.name ??
                            "Local event",
                        )}
                      </Text>
                      <Text style={ui.muted}>
                        Server name:{" "}
                        {String(
                          JSON.parse(c.receipt_json).record?.payload.name ??
                            "No current record",
                        )}
                      </Text>
                      <Text style={ui.muted}>
                        No automatic merge. Review with the developer before
                        continuing this record.
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
      {busy && (
        <Text accessibilityLiveRegion="polite" style={ui.muted}>
          Working…
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={ui.muted}>
          {message}
        </Text>
      )}
    </Page>
  );
}
