import { Alert } from "../src/application/platformAlert";
import { router,useLocalSearchParams,usePreventRemove } from "expo-router";
import { useEffect,useId,useRef,useState,type ComponentRef } from "react";
import { Text, View,type TextInput } from "react-native";
import * as Crypto from "expo-crypto";
import {
  Button,
  Empty,
  Field,
  Loading,
  Page,
  Pill,
  ui,
} from "../src/application/ui";
import { useQuery, useTask, useWorkspace } from "../src/application/workspace";
import {checklistErrors,ChecklistValidationError,type ChecklistErrors} from '../src/domain/checklistValidation';
import {readChecklistForm} from '../src/application/checklistForm';
import {validateItems} from "../src/storage/catalogue";
import type { ChecklistItem } from "../src/domain/inspection";
function versionItems(value:string):ChecklistItem[]|null{try{return validateItems(JSON.parse(value));}catch{return null;}}
export default function Templates() {
  const { handle,refresh } = useWorkspace();
  const formScope=useId();
  const params=useLocalSearchParams<{create?:string;returnTo?:string;site?:string}>();
  const publication=useRef(Crypto.randomUUID()),newTemplate=useRef(Crypto.randomUUID());
  const [returnVersion,setReturnVersion]=useState('');
  const [fields,setFields]=useState<ChecklistErrors>({});
  const inputs=useRef(new Map<string,ComponentRef<typeof TextInput>>());
  const { data, error } = useQuery(async () => ({
    templates: await handle.catalogue.templates(),
    versions: await handle.catalogue.versions(),
    canCreate: (await handle.catalogue.inspectionOptions()).canCreate,
  }));
  const task = useTask();
  const [form, setForm] = useState(params.create==='1'),
    [id, setId] = useState<string | undefined>(),
    [name, setName] = useState(""),
    [items, setItems] = useState<ChecklistItem[]>(()=>params.create==='1'?[{id:Crypto.randomUUID(),title:''}]:[]),
    [expanded, setExpanded] = useState("");
  useEffect(()=>{if(!form&&returnVersion&&params.returnTo==='new-inspection'){const next=setTimeout(()=>router.replace({pathname:'/new-inspection',params:{site:params.site??'',version:returnVersion}}),0);return()=>clearTimeout(next);}},[form,returnVersion,params.returnTo,params.site]);
  function beginPublication(){publication.current=Crypto.randomUUID();newTemplate.current=Crypto.randomUUID();setFields({});task.clearFeedback();}
  function clearField(field:string){setFields(old=>{const next={...old};delete next[field];return next;});}
  function focusInvalid(errors:ChecklistErrors){const first=Object.keys(errors).find(key=>inputs.current.has(key));if(first)inputs.current.get(first)?.focus();}
  function publish(){
    const values=readChecklistForm(name,items,formScope);setName(values.name);setItems(values.items);
    const errors=checklistErrors(values.name,values.items);setFields(errors);task.clearFeedback();
    if(Object.keys(errors).length){focusInvalid(errors);return;}
    void task.run(async()=>{
      try{const version=await handle.catalogue.template(values.name,values.items,id??newTemplate.current,publication.current);setForm(false);setReturnVersion(version);}
      catch(error){
        if(error instanceof ChecklistValidationError){setFields(error.fields);focusInvalid(error.fields);throw Error('Check the highlighted checklist fields. Your entries are unchanged.');}
        if(error instanceof Error&&/already saved different content/i.test(error.message))throw Error('An earlier attempt saved this version. Reopen the saved checklist before editing; earlier versions will not be overwritten. Your entries are kept.');
        const owner=error instanceof Error&&/require an owner/i.test(error.message);
        throw Error(owner?'Only the company owner can publish checklists. Your entries are kept.':'The checklist could not be saved. Your entries are kept. Retry publishing; if it fails again, check workspace access and available device storage.');
      }
    },'Checklist version published on this device. Synchronise to make it available on other devices.');
  }
  usePreventRemove(form, ({ repeat }) =>
    Alert.alert(
      "Discard checklist changes?",
      "Earlier versions will stay unchanged.",
      [
        { text: "Keep editing" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setForm(false);
            repeat();
          },
        },
      ],
    ),
  );
  return (
    <Page
      focusKey={`${form}:${id}`}
      title="Checklists"
      subtitle="Reusable templates. Earlier inspection wording always stays intact."
    >
      {data?.canCreate&&<Button
        label="Create checklist"
        disabled={task.busy||form}
        onPress={() => {
          beginPublication();setId(undefined);
          setName("");
          setItems([{ id: Crypto.randomUUID(), title: "" }]);
          setForm(true);
        }}
      />}
      {data&&!data.canCreate&&<Text style={ui.body}>Only the company owner can publish or edit checklists. Ask them to create a version, then synchronise.</Text>}
      {error&&<View style={ui.warning}><Text style={ui.error}>{error}</Text><Button label="Retry loading checklists" onPress={refresh}/></View>}
      {!form&&task.error&&<Text accessibilityRole="alert" style={ui.error}>{task.error}</Text>}
      {task.message && <Text style={ui.muted}>{task.message}</Text>}
      {form&&data?.canCreate && (
        <View style={ui.card}>
          <Text style={ui.h}>
            {id ? "Save a new version" : "New checklist"}
          </Text>
          <Field
            label="Checklist name"
            required
            inputId={formScope+'-name'}
            inputRef={input=>{if(input)inputs.current.set('name',input);else inputs.current.delete('name');}}
            error={fields.name}
            placeholder="Office cleaning inspection"
            hint="Name the whole checklist, for example: Office cleaning inspection."
            value={name}
            onChange={value=>{setName(value);clearField('name');}}
            max={120}
            disabled={task.busy}
          />
          <Text style={ui.muted}>* Required. Inspection items describe what to check; Section is optional.</Text>
          {!!fields.items&&<Text accessibilityRole="alert" style={ui.error}>{fields.items}</Text>}
          {items.map((i, n) => (
            <View style={[ui.card, { backgroundColor: "#f5f9fa" }]} key={i.id}>
              <Field
                label={`Item ${n + 1}`}
                required
                inputId={formScope+'-item-'+i.id}
                inputRef={input=>{if(input)inputs.current.set('item:'+i.id,input);else inputs.current.delete('item:'+i.id);}}
                error={fields['item:'+i.id]}
                placeholder="Washroom cleanliness"
                hint="Describe one inspection check, for example: Washroom cleanliness."
                value={i.title}
                onChange={title=>{setItems(old=>old.map(x=>x.id===i.id?{...x,title}:x));clearField('item:'+i.id);}}
                max={240}
                disabled={task.busy}
              />
              <Field
                label="Section (optional)"
                inputId={formScope+'-section-'+i.id}
                inputRef={input=>{if(input)inputs.current.set('section:'+i.id,input);else inputs.current.delete('section:'+i.id);}}
                error={fields['section:'+i.id]}
                placeholder="Washrooms"
                value={i.section ?? ""}
                onChange={section=>{setItems(old=>old.map(x=>x.id===i.id?{...x,section}:x));clearField('section:'+i.id);}}
                max={120}
                disabled={task.busy}
              />
              <View style={ui.row}>
                <Button
                  label="Move up"
                  secondary
                  disabled={task.busy || n === 0}
                  onPress={() =>
                    setItems((old) => {
                      const a = [...old];
                      [a[n - 1], a[n]] = [a[n]!, a[n - 1]!];
                      return a;
                    })
                  }
                />
                <Button
                  label="Remove"
                  secondary
                  disabled={task.busy || items.length === 1}
                  onPress={() =>
                    setItems((old) => old.filter((x) => x.id !== i.id))
                  }
                />
              </View>
            </View>
          ))}
          <Button
            secondary
            label="Add checklist item"
            disabled={task.busy || items.length >= 50}
            onPress={() =>
              setItems((old) => [
                ...old,
                { id: Crypto.randomUUID(), title: "" },
              ])
            }
          />
          <Text style={ui.muted}>
            Publishing saves an immutable version for inspection use on this device. Existing inspections keep their original wording. Other devices receive it after acknowledged synchronisation.
          </Text>
          {!!task.error&&<Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.error}>{task.error}</Text>}
          <Button
            label={task.busy ? "Publishing version…" : "Publish checklist version"}
            disabled={task.busy}
            onPress={publish}
          />
          <Button
            label="Cancel editing"
            secondary
            disabled={task.busy}
            onPress={() => {setForm(false);setFields({});task.clearFeedback();}}
          />
        </View>
      )}
      {!data ? (
        error?null:<Loading />
      ) : !data.templates.length ? (
        <Empty
          title="No checklists yet"
          detail="Create a short, useful checklist for your first site."
        />
      ) : (
        data.templates
          .filter((t) => !t.archived)
          .map((t) => {
            const versions = data.versions.filter(
                (v) => v.template_id === t.id,
              ),
              v = versions[0]!;
            const parsed=v?versionItems(v.items_json):null;
            if(!parsed)return <View key={t.id} style={ui.card}><Text style={ui.h}>{t.name}</Text><Text style={ui.error}>The latest version cannot be read. It is preserved; publish a replacement version before using this checklist.</Text>{data.canCreate&&<Button label="Publish replacement version" onPress={()=>{beginPublication();setId(t.id);setName(t.name);setItems([{id:Crypto.randomUUID(),title:''}]);setForm(true);}}/>}</View>;
            return (
              <View style={ui.card} key={t.id}>
                <Text style={ui.h}>{t.name}</Text>
                <Pill
                  text={`Version ${v.version} · ${parsed.length} items`}
                />
                <Button
                  label="Edit as next version"
                  secondary
                  disabled={!data.canCreate||task.busy||form}
                  onPress={() => {
                    beginPublication();setId(t.id);
                    setName(v.name);
                    setItems(parsed);
                    setForm(true);
                  }}
                />
                <Button
                  label="Archive checklist"
                  secondary
                  disabled={!data.canCreate||task.busy||form}
                  onPress={() =>
                    Alert.alert(
                      "Archive this checklist?",
                      "Existing inspections and earlier versions remain available in history.",
                      [
                        { text: "Cancel" },
                        {
                          text: "Archive",
                          onPress: () =>
                            void task.run(() =>
                              handle.catalogue.archive("templates", t.id),
                            ),
                        },
                      ],
                    )
                  }
                />
                <Button
                  label="Copy to a new checklist"
                  secondary
                  disabled={!data.canCreate||task.busy||form}
                  onPress={() => {
                    beginPublication();setId(undefined);
                    setName(`${v.name} copy`);
                    setItems(parsed);
                    setForm(true);
                  }}
                />
                <Button
                  label={
                    expanded === t.id
                      ? "Hide version history"
                      : "View version history"
                  }
                  secondary
                  onPress={() => setExpanded(expanded === t.id ? "" : t.id)}
                />
                {expanded === t.id &&
                  versions.map((old) => (
                    <Text key={old.id} style={ui.muted}>
                      v{old.version} · {old.name} ·{" "}
                      {versionItems(old.items_json)?.map((i: ChecklistItem) => i.title).join(" / ")??"Unreadable version (preserved)"}
                    </Text>
                  ))}
              </View>
            );
          })
      )}
    </Page>
  );
}
