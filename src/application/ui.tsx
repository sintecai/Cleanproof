import { useEffect, useRef, useState, type Ref,type ComponentRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  AccessibilityInfo,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { design } from "./design";
import { Brand } from "./Brand";
import {useLayoutWidth} from "./LayoutFrame";
export const colour = design.colour;
export const ui = StyleSheet.create({
  page: { padding: 28, paddingBottom: 64, gap: 20, width: "100%", maxWidth: 1120, alignSelf: "center" },
  title: {
    fontFamily: design.font.heading,
    fontSize: 28,
    fontWeight: "700",
    color: colour.navy,
    lineHeight: 35,
  },
  h: { fontFamily: design.font.heading, fontSize: 19, fontWeight: "700", color: colour.navy, lineHeight: 28 },
  body: { fontFamily: design.font.body, fontSize: 15, lineHeight: 24, color: colour.ink },
  muted: { fontFamily: design.font.body, fontSize: 13, lineHeight: 20, color: colour.muted },
  card: {
    padding: 16,
    backgroundColor: "white",
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colour.line,
    shadowColor: '#123c2d', shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: {width: 0, height: 3},
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colour.line,
    padding: 12,
    borderRadius: 12,
    color: colour.ink,
    backgroundColor: "white",
    fontSize: 15,
    fontFamily: design.font.body,
  },
  button: {
    minHeight: 44,
    backgroundColor: colour.teal,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
    maxWidth: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontFamily: design.font.body,
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  warning: { padding: 14, backgroundColor: "#fff2d7", borderRadius: 10 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colour.muted,
    letterSpacing: 0.5,
  },
  hero: {
    padding: 22,
    borderRadius: 18,
    backgroundColor: colour.navy,
    gap: 12,
  },
  divider: { height: 1, backgroundColor: colour.line },
  pill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colour.mint,
  },
  pillText: { fontSize: 13, fontWeight: "700", color: colour.teal },
  error: { color: colour.red, fontSize: 15, lineHeight: 22 },
  section: { marginTop: 8, gap: 12 },
});
export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      {...(Platform.OS==='web'?{type:'button' as const}:{})}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && {
          backgroundColor: colour.soft,
          borderWidth: 1,
          borderColor: colour.line,
        },
        danger && { backgroundColor: colour.red },
        pressed && !disabled && { opacity: 0.82, transform: [{ scale: 0.99 }] },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[ui.buttonText, secondary && { color: colour.navy }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  max = 2000,
  disabled = false,
  placeholder,
  keyboardType = "default",
  secure = false,
  required=false,error,hint,inputRef,inputId,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric";
  secure?: boolean;
  required?:boolean;error?:string;hint?:string;inputRef?:Ref<ComponentRef<typeof TextInput>>;inputId?:string;
}) {
  return (
    <View style={{ gap: 7, width: "100%", maxWidth: 680 }}>
      <Text style={ui.label}>{label}{required?" *":""}</Text>
      <TextInput
        ref={inputRef}
        nativeID={inputId}
        accessibilityHint={error||hint}
        aria-invalid={!!error}
        aria-required={required}
        accessibilityLabel={label}
        secureTextEntry={secure}
        autoCapitalize={
          secure || keyboardType === "email-address" ? "none" : "sentences"
        }
        autoCorrect={!secure && keyboardType !== "email-address"}
        editable={!disabled}
        style={[
          ui.input,
          !!error&&{borderColor:colour.red,borderWidth:2},
          multiline && { minHeight: 96, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        maxLength={max}
        placeholder={placeholder}
        placeholderTextColor="#687c87"
        keyboardType={keyboardType}
      />
      {!!hint&&<Text style={ui.muted}>{hint}</Text>}
      {!!error&&<Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    </View>
  );
}
export function Pill({
  text,
  tone = "teal",
}: {
  text: string;
  tone?: "teal" | "amber" | "red";
}) {
  return (
    <View
      style={[
        ui.pill,
        tone === "amber" && { backgroundColor: "#fff1d3" },
        tone === "red" && { backgroundColor: "#fbe8e6" },
      ]}
    >
      <Text
        style={[
          ui.pillText,
          tone === "amber" && { color: colour.amber },
          tone === "red" && { color: colour.red },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={[ui.card, {backgroundColor: '#f0f7f3', borderColor: '#d7e9df', padding: 18}]}>
      <Text style={ui.h}>{title}</Text>
      <Text style={ui.muted}>{detail}</Text>
    </View>
  );
}
const navigation = [
  ["Home", "/", "⌂"], ["Customers", "/customers", "♙"], ["Sites", "/sites", "▦"],
  ["Templates", "/templates", "☷"], ["Inspections", "/new-inspection", "✓"],
  ["Actions", "/actions", "!"], ["History", "/history", "◷"], ["Reports", "/report-library", "▤"],
  ["Settings", "/settings", "⚙"], ["Account", "/onboarding", "♙"], ["Sync", "/sync", "↻"],
] as const;
/** Content hero retains its useful copy; imagery belongs to the full-page layer. */
export function SceneBanner({children}:{children:ReactNode}){return <View style={{backgroundColor:colour.navy,borderRadius:20,padding:22,gap:12}}>{children}</View>;}
export function Page({ title, subtitle, children, back = true, tab, focusKey }: {
  title: string; subtitle?: string; children: ReactNode; back?: boolean;
  tab?: "Home" | "Sites" | "History" | "Actions"; focusKey?: string;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const wide = useLayoutWidth() >= 820;
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => { let active = true; void AccessibilityInfo.isReduceMotionEnabled().then(v => { if(active) setReducedMotion(v); }); const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion); return () => { active = false; sub.remove(); }; }, []);
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => { if (Platform.OS === "web") return; const shown = Keyboard.addListener("keyboardDidShow", () => { setKeyboardVisible(true); setMenu(false); }); const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false)); return () => { shown.remove(); hidden.remove(); }; }, []);
  useEffect(() => { if (focusKey) scroll.current?.scrollTo({ y: 0, animated: !reducedMotion }); }, [focusKey, reducedMotion]);
  const navItem = (n: typeof navigation[number], compact = false) => {
    const active = path === n[1] || (n[0] === 'Inspections' && ['/inspect', '/photos'].includes(path));
    return <Pressable key={n[0]} accessibilityRole="button" accessibilityLabel={n[0]} accessibilityState={{ selected: active }}
      onPress={() => { setMenu(false); router.navigate(n[1]); }}
      style={({ pressed }) => ({ minHeight: 48, padding: compact ? 8 : 12, borderRadius: 10, flexDirection: compact ? 'column' : 'row', alignItems: 'center', gap: compact ? 2 : 12, backgroundColor: active ? colour.mint : pressed ? colour.soft : 'transparent', ...(compact ? { flex: 1 } : {}) })}>
      <Text accessible={false} style={{ fontSize: 21, color: active ? colour.teal : wide ? '#bdccc9' : colour.muted, width: 24, textAlign: 'center' }}>{n[2]}</Text>
      <Text style={{ fontFamily: design.font.body, fontSize: compact ? 10 : 14, fontWeight: active ? '700' : '500', color: active ? colour.teal : wide ? '#bdccc9' : colour.muted }}>{compact && n[0] === "Inspections" ? "Inspect" : n[0]}</Text>
    </Pressable>;
  };
  const heading = <View style={{gap:6,padding:18,backgroundColor:'rgba(255,255,255,0.96)',borderRadius:18,borderWidth:1,borderColor:colour.line}}><Text accessibilityRole="header" style={ui.title}>{title}</Text>{!!subtitle&&<Text style={ui.muted}>{subtitle}</Text>}</View>;
  return <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row' }}>
    {wide && <View style={{ width: 224, backgroundColor: colour.navy, borderRightWidth: 1, borderColor: colour.line, padding: 20, gap: 20 }}>
      <View style={[ui.row, { paddingVertical: 10 }]}><Brand dark /></View>
      <Text style={[ui.label, {color: "#b8c8c3", fontSize: 11}]}>QUALITY WORKSPACE</Text>
      <ScrollView contentContainerStyle={{ gap: 4 }}>{navigation.map(n => navItem(n))}</ScrollView>
      <Text style={[ui.muted, {color: "#b8c8c3"}]}>Sicy International Ltd</Text>
    </View>}
    <KeyboardAvoidingView style={{ flex: 1, minWidth: 0, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingHorizontal: wide ? 32 : 16, paddingVertical: 9, gap: 8, borderBottomWidth: 1, borderColor: colour.line, backgroundColor: colour.canvas }}>
        <View style={ui.row}>
          {back && <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ minHeight: 44, minWidth: 36, justifyContent: 'center' }}><Text style={{ fontSize: 28, color: colour.navy }}>‹</Text></Pressable>}
          {!wide && <Brand compact />}
          <Text style={[ui.h, { flex: 1, fontSize: wide ? 16 : 18 }]}>{wide ? 'CleanProof / ' + title : ''}</Text><Pill text={process.env.EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS === "1" ? "Local demo" : "Workspace"} />
        </View>
      </View>
      <ScrollView style={{ flex: 1, minHeight: 0 }} ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} contentContainerStyle={[ui.page, !wide && { padding: 16, paddingBottom: 40 }]}>
        {heading}
        {children}
      </ScrollView>
      {!wide && !keyboardVisible && <>
        {menu && <ScrollView style={{ maxHeight: 300, backgroundColor: 'white', borderTopWidth: 1, borderColor: colour.line }} contentContainerStyle={{ padding: 12, gap: 4 }}>{navigation.map(n => navItem(n))}</ScrollView>}
        <View style={{ flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderColor: colour.line, padding: 8, flexShrink: 0 }}>
          {navigation.filter(n => ['Home', 'Sites', 'Inspections', 'Actions'].includes(n[0])).map(n => navItem(n, true))}
          <Pressable accessibilityRole="button" accessibilityLabel="More navigation" accessibilityState={{ expanded: menu }} onPress={() => setMenu(!menu)} style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2 }}><Text style={{ fontSize: 21, color: colour.muted }}>☷</Text><Text style={{ fontSize: 11, color: colour.muted }}>More</Text></Pressable>
        </View>
      </>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Metric({ label, value, detail, tone = 'teal' }: { label: string; value: string | number; detail?: string; tone?: 'teal' | 'red' | 'amber' }) {
  return <View style={[ui.card, { flexGrow: 1, flexBasis: 132, minWidth: 0, backgroundColor: "white", borderWidth: 1, gap: 6 }]}><Text style={[ui.label, {fontSize: 11}]}>{label}</Text><Text style={{ fontFamily: design.font.heading, fontSize: 27, fontWeight: '700', color: colour[tone], fontVariant: ['tabular-nums'] }}>{value}</Text>{detail && <Text style={ui.muted}>{detail}</Text>}</View>;
}
export function Loading() {
  return (
    <View style={[ui.card, ui.row]}>
      <ActivityIndicator />
      <Text style={ui.body}>Opening your saved work…</Text>
    </View>
  );
}
