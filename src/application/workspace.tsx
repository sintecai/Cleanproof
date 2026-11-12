import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { Text, View } from "react-native";
import {
  openDemoWorkspace,
  storageErrorMessage,
  type WorkspaceHandle,
} from "../storage/expoWorkspace";
import { Button, Loading, Page, ui } from "./ui";
import { useStorageUnlock } from "./StorageBoundary";

import {useNativeWorkspace} from './NativeWorkspaceContext';
import {publishCustomerCompany} from './customerSession';
import {startupTrace} from '../auth/startupTrace';
import {PendingOperation} from '../auth/pendingOperation';
const Context = createContext<{
  handle: WorkspaceHandle;
  revision: number;
  refresh(): void;
  reopen(): void;
} | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const unlockAgain = useStorageUnlock();
  const supplied=useNativeWorkspace();
  const [handle, setHandle] = useState<WorkspaceHandle | null>(supplied),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if(supplied){setHandle(supplied);return;}
    startupTrace('workspace-start');
    let active = true;
    let h: WorkspaceHandle | undefined;
    setError("");
    const opening=new PendingOperation();
    void opening.run(async check=>{
      const next=await openDemoWorkspace();
      try{check();}catch(e){await next.close();throw e;}
      return next;
    },30000,'Opening saved work took too long. Your encrypted records have not been removed. Retry opening.')
      .then(async (next) => {
        h = next;
        if (active) {
          startupTrace('workspace-ready');setHandle(next);
          void next.media().catch(() => undefined);

        } else await next.close();
      })
      .catch((e) => {
        if (active){startupTrace('workspace-error');setError(storageErrorMessage(e));}
      });
    return () => {
      startupTrace('workspace-unmount');active = false;opening.invalidate();
      if (h) void h.close().catch(() => undefined);
    };
  }, [attempt,supplied]);
  useEffect(()=>{
    if(!handle)return;let active=true;
    void handle.workflow.branding().then(branding=>{if(active&&branding)publishCustomerCompany(branding.name);}).catch(()=>undefined);
    return()=>{active=false;};
  },[handle,revision]);
  if (!handle)
    return <View style={{flex:1,padding:28,justifyContent:'center',backgroundColor:'#f7f8f5'}}>
      <Text style={ui.h}>{error?'Your work is protected':'Opening your workspace'}</Text>
      {error?<><Text style={ui.error}>{error}</Text><Button label="Retry opening saved work" onPress={()=>setAttempt(x=>x+1)}/>{unlockAgain&&<Button secondary label="Sign out on this device" onPress={unlockAgain}/>}</>:<Loading/>}
    </View>;
  return (
    <Context.Provider
      value={{
        handle,
        revision,
        refresh: () => setRevision((r) => r + 1),
        reopen: () => {
          setHandle(null);
          setAttempt((v) => v + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const c = useContext(Context);
  if (!c) throw Error("Workspace not open");
  return c;
}
export function useQuery<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const { revision } = useWorkspace();
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    void load()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to load saved work.",
          );
      });
    return () => {
      active = false;
    };
  }, [revision, ...deps]);
  return { data, error };
}
export function useTask() {
  const running = useRef(false);
  const { refresh } = useWorkspace();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function run(
    task: () => Promise<void>,
    success = "Saved on this device.",
  ) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage(success);
      refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "This change could not be saved. Please retry.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, message, error, run, clearFeedback:()=>{if(!running.current){setMessage("");setError("");}} };
}
