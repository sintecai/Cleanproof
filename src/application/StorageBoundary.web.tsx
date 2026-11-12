import {ShowcaseBoundary} from "./ShowcaseBoundary.web";
import { CustomerEntry } from "./CustomerEntry.web";
import { browserFonts } from "./browserFonts";
import { backendConfig } from "../auth/session";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Text } from "react-native";
import { BrowserReportHost } from "../reporting/BrowserReportHost.web";
import { Button, Field, Page, ui } from "./ui";
import {
  setBrowserPassphrase,
  setBrowserBackend,
} from "../storage/browserDatabase";
const UnlockContext = createContext<(() => void) | undefined>(undefined);
export function useStorageUnlock() { return useContext(UnlockContext); }
export function StorageBoundary({ children }: { children: ReactNode }) {
  if(process.env.EXPO_PUBLIC_CLEANPROOF_SHOWCASE === "1") return <ShowcaseBoundary>{children}</ShowcaseBoundary>;
  const legacy = process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS === "1" && new URLSearchParams(window.location.search).get("legacyDemo") === "1";
  if(legacy) return <LegacyStorageBoundary>{children}</LegacyStorageBoundary>;
  return <UnlockContext.Provider value={() => window.dispatchEvent(new Event('cleanproof-account-lock'))}><CustomerEntry>{children}<BrowserReportHost /></CustomerEntry></UnlockContext.Provider>;
}
function LegacyStorageBoundary({ children }: { children: ReactNode }) {
  const localOnly = process.env.EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY === "1";
  const [phoneWidth, setPhoneWidth] = useState(false);
  const [pass, setPass] = useState(""),
    [ready, setReady] = useState(false),
    [url, setUrl] = useState("http://127.0.0.1:54321"),
    [key, setKey] = useState(""),
    [error, setError] = useState("");
  const contents = ready ? children : (
    <Page title="CleanProof · application preview" back={false}>
      <Text style={ui.body}>
        Explore CleanProof with synthetic cleaning records. Choose a passphrase
        of at least 12 characters to protect and reopen your saved browser work.
        {localOnly ? " Sign-in, synchronisation and secure client links are unavailable in this local demo." : " Backend sign-in and sync require a running authorised Supabase stack."}
      </Text>
      <Field
        label="Browser workspace passphrase (12+ characters)"
        value={pass}
        onChange={setPass}
        secure
      />
      {!localOnly && <>
        <Field label="Optional local backend URL" value={url} onChange={setUrl} />
        <Field
          label="Optional PUBLIC anon/publishable key"
          value={key}
          onChange={setKey}
        />
        <Text style={ui.muted}>
          Leave the public key empty for local offline workflows. Enter only your
          local public key to use actual Auth and sync; never a service key.
        </Text>
      </>}
      {!!error && <Text style={ui.error}>{error}</Text>}
      <Button
        label="Open encrypted browser workspace"
        disabled={pass.length < 12}
        onPress={() => {
          try {
            setBrowserBackend(
              !localOnly && key.trim() ? backendConfig(url, key.trim()) : null,
            );
            setBrowserPassphrase(pass);
            setPass("");
            setReady(true);
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Invalid public backend settings",
            );
          }
        }}
      />
      <Text style={ui.muted}>
        Keep this passphrase to reopen saved browser work. Closing the tab locks
        it. Use synthetic data only; browser storage can be cleared or evicted
        by the browser.
      </Text>
    </Page>
  );
  return <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f7f8f5', minHeight: 0 }}>
    <style>{browserFonts + "\n:focus-visible{outline:3px solid #60dda5;outline-offset:3px}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}button,input,textarea{font-family:Inter,system-ui,sans-serif}"}</style>
    <div aria-label="Preview controls" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: '#172b4d', color: 'white', font: '13px system-ui' }}>
      <span>{localOnly ? 'Local demo · synthetic data · saved in this browser' : 'Browser application preview'}</span>
      <button type="button" style={{ border: 0, borderRadius: 6, padding: '6px 12px', background: '#eff4ff', color: '#172b4d', cursor: 'pointer' }} onClick={() => setPhoneWidth(!phoneWidth)}>{phoneWidth ? 'Desktop width' : 'Phone width'}</button>
    </div>
    <main style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%', maxWidth: phoneWidth ? 390 : '100%', alignSelf: 'center', position: 'relative', overflow: 'hidden' }}>
      <UnlockContext.Provider value={() => {
        setBrowserPassphrase("");
        setPass("");
        setError("");
        setReady(false);
      }}>{contents}</UnlockContext.Provider>
    </main>
    <BrowserReportHost />
  </div>;
}
