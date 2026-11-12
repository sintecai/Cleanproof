import {useNativeWorkspace} from './NativeWorkspaceContext';
import {PendingOperation} from '../auth/pendingOperation';
import {hasCustomerSession,lockCustomerEntry} from "./customerSession";
import {router,usePathname} from "expo-router";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform, Text } from "react-native";
import { unlockPlatform } from "./platformUnlock";
import { canonical } from "../sync/protocol";
import type { WorkspaceHandle } from "../storage/expoWorkspace";
import { Button, Field, Page, ui } from "./ui";
const AccessView=createContext<ReactNode>(null);
/** Stateless screen boundary: membership state belongs to the one provider above Stack. */
export function WorkspaceAccessScreen({children}:{children:ReactNode}){
 const guard=useContext(AccessView);const pathname=usePathname();if(pathname==="/account-deletion"||(Platform.OS!=="web"&&pathname==="/reset-password"))return <>{children}</>;return <>{guard??children}</>;
}
export function BusinessGate({
  handle,
  children,
  onWorkspaceChange,
}: {
  handle: WorkspaceHandle;
  children: ReactNode;
  onWorkspaceChange?: () => void;
}) {
  const pathname=usePathname();
  const nativeOwner=useNativeWorkspace()===handle;
  const opening=useRef(new PendingOperation());
  useEffect(()=>()=>opening.current.invalidate(),[handle]);
  const [checking,setChecking]=useState(!nativeOwner);
  const [bound, setBound] = useState<boolean | null>(null),
    [open, setOpen] = useState(nativeOwner),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState<Awaited<
      ReturnType<typeof handle.access.recoveryReview>
    > | null>(null);
  useEffect(() => {
    let live = true;
    const check = async () => {
      const b = await handle.business.binding();
      if (!live) return;
      setBound(!!b);if(nativeOwner || !b || !hasCustomerSession())setChecking(false);
      if (b && open) {
        try {
          await handle.access.offline(b.user_id);
        } catch {
          if (live) setOpen(false);
        }
      }
    };
    void check().catch(e=>{if(live){setError(e instanceof Error?e.message:"Access could not be checked.");setChecking(false);}});
    const unlisten = handle.connection()?.onLock(() => setOpen(false));
    const timer = setInterval(
        () => void check().catch(() => setOpen(false)),
        1000,
      ),
      listener = AppState.addEventListener("change", (s) => {
        if (s !== "active") {
          // A share sheet or OS picker is not sign-out. The stable native
          // customer owner revalidates membership on foreground return.
          setPassword("");
        }
      });
    return () => {
      live = false;
      unlisten?.();
      clearInterval(timer);
      listener.remove();
    };
  }, [handle, open]);
  async function unlock(offline = false, restore = false) {
    if (busy) return;
    setBusy(true);setChecking(true);
    setError("");
    try {
     await opening.current.run(async check=>{
      const auth = handle.connection();
      if (!auth) throw Error("Configure the same backend used for adoption.");
      if (offline || restore) await auth.restore();
      else {
        const p = password;
        setPassword("");
        await auth.signIn(email, p);
      }
      if (offline) {
        const user = auth.session()?.user.id;
        if (!user) throw Error("A saved identity is required.");
        const result = await unlockPlatform();
        if (!result.success) throw Error("Device unlock cancelled.");
        await handle.access.offline(user);
      } else await handle.access.grant(auth);
      check();if (AppState.currentState === "active") setOpen(true);
     },30000,"Workspace access could not be checked in time. Your saved work is protected. Retry recovering the session, or log out.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to unlock.");
    } finally {
      setBusy(false);setChecking(false);
    }
  }
  useEffect(() => { if(bound && hasCustomerSession()&&!nativeOwner) void unlock(false,true); }, [bound,handle]);
  function accessView():ReactNode{
  if(checking||bound===null&&!error)return <Page title="Checking workspace access" back={false}><Text style={ui.muted}>Your session is active. Checking access to saved work…</Text><Button secondary label="Log out" onPress={lockCustomerEntry}/></Page>;
  if (bound === false && (hasCustomerSession() || process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS !== "1") && !["/onboarding","/sync"].includes(pathname)) return <Page title="Welcome to CleanProof" subtitle="Set up your company workspace." back={false}><Text style={ui.body}>Sign in or register your company. Existing local work remains protected; no demonstration records are added.</Text><Button label="Set up company account" onPress={()=>router.replace('/onboarding')}/><Button label="Review existing local work for adoption" secondary onPress={()=>router.push('/sync')}/></Page>;
  if (bound === false || open) return null;
  return (
    <Page
      title="Sign in to continue"
      back={false}
      subtitle="Acknowledged inspections and unsent evidence remain encrypted."
    >
      <Field
        label="Company account email"
        value={email}
        onChange={setEmail}
        keyboardType="email-address"
        disabled={busy}
      />
      <Field
        label="Password"
        value={password}
        onChange={setPassword}
        secure
        disabled={busy}
      />
      <Button
        label="Sign in & verify membership"
        disabled={busy}
        onPress={() => void unlock()}
      />
      <Button
        label="Recover online session"
        secondary
        disabled={busy}
        onPress={() => void unlock(false, true)}
      />
      <Button
        label="Unlock saved work offline"
        secondary
        disabled={busy}
        onPress={() => void unlock(true)}
      />
      <Button
        label="Sign out on this device"
        secondary
        disabled={busy}
        onPress={() => {
          if(hasCustomerSession()){lockCustomerEntry();return;}
          void handle.connection()?.signOut().then(()=>{setOpen(false);setError('Signed out. Saved work is protected.');}).catch(()=>setError('Sign-out could not finish. Retry without resetting the app.'));
        }}
      />
      <Button
        label="Review protected-work recovery"
        secondary
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setError("");
          const auth = handle.connection();
          void (async () => {
            if (!auth) throw Error("Backend required.");
            await auth.restore();
            setRecovery(await handle.access.recoveryReview(auth));
          })()
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      />
      {recovery && (
        <>
          <Text style={ui.body}>
            {recovery.covered
              ? "Fresh access covers this saved workspace."
              : "Site permissions are reduced. Saved work remains locked; ask the owner to restore access."}{" "}
            {recovery.pending} unsent operations and {recovery.conflicts}{" "}
            conflicts remain protected.
          </Text>
          {!recovery.covered && handle.isolate && (
            <Button
              label="Open a separate authorised workspace"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                const auth = handle.connection();
                void (async () => {
                  if (!auth || !handle.isolate)
                    throw Error("Backend required.");
                  await handle.isolate(auth, canonical(recovery));
                  onWorkspaceChange?.();
                })()
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            />
          )}
          <Button
            label="Restore reviewed access"
            disabled={busy || !recovery.covered}
            onPress={() => {
              setBusy(true);
              const auth = handle.connection();
              void (async () => {
                if (!auth) throw Error("Backend required.");
                await handle.access.recover(auth, canonical(recovery));
                setRecovery(null);
                if (AppState.currentState === "active" && auth.session())
                  setOpen(true);
              })()
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          />
        </>
      )}
      {handle.returnProtected && (
        <Button
          label="Select previous protected workspace"
          secondary
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void handle.returnProtected!()
              .then(() => onWorkspaceChange?.())
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        />
      )}
      <Text style={ui.muted}>
        Offline access needs device authentication and membership checked within
        seven days. Sign-out disables it. Scope changes quarantine this
        workspace for review; another account/company cannot open it.
      </Text>
      {!!error && <Text style={ui.error}>{error}</Text>}
    </Page>
  );
  }
  return <AccessView.Provider value={accessView()}>{children}</AccessView.Provider>;
}
