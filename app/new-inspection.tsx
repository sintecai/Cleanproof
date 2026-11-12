import {useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import * as Crypto from 'expo-crypto';
import {Button,Empty,Loading,Page,Pill,ui} from '../src/application/ui';
import {useQuery,useTask,useWorkspace} from '../src/application/workspace';
export default function NewInspection(){
 const {handle,refresh}=useWorkspace();
 const params=useLocalSearchParams<{site?:string;version?:string}>();
 const [site,setSite]=useState(params.site??''),[version,setVersion]=useState(params.version??'');
 const request=useRef(Crypto.randomUUID()),created=useRef<string|null>(null);
 const task=useTask();
 const {data,error}=useQuery(()=>handle.catalogue.inspectionOptions());
 useEffect(()=>{if(params.site)setSite(params.site);if(params.version)setVersion(params.version);request.current=Crypto.randomUUID();created.current=null;},[params.site,params.version]);
 const validSite=data?.sites.find(s=>s.id===site),validVersion=data?.checklists.find(v=>v.id===version);
 const missing=!validSite&&!validVersion?'Select a site and a published checklist version.':!validSite?'Select an active site.':!validVersion?'Select a published checklist version.':'';
 function chooseSite(id:string){setSite(id);request.current=Crypto.randomUUID();created.current=null;}
 function chooseVersion(id:string){setVersion(id);request.current=Crypto.randomUUID();created.current=null;}
 return <Page title="Start an inspection" subtitle="Choose a site and a checklist saved for this company.">
  {!!error&&<View style={ui.warning}><Text style={ui.error}>Checklists could not be loaded. {error}</Text><Button label="Retry loading sites and checklists" onPress={refresh}/></View>}
  {!data&&!error?<Loading/>:data&&<>
   <Text style={ui.h}>1. Choose a site</Text>
   {data.sites.map(s=><View key={s.id} style={[ui.card,site===s.id&&{borderColor:'#006c49',borderWidth:2}]}><Text style={ui.h}>{s.name}</Text><Text style={ui.muted}>{s.address}</Text><Button label={site===s.id?'✓ Selected site':'Choose this site'} secondary={site!==s.id} disabled={task.busy} onPress={()=>chooseSite(s.id)}/></View>)}
   {!data.sites.length&&<><Empty title="No active sites available" detail="A customer and active site are required. Archived customers and their sites cannot start a new inspection."/>{data.canCreate?<Button label="Add a site" onPress={()=>router.push('/sites')}/>:<Text style={ui.body}>Ask the company owner to add or assign an active site, then synchronise.</Text>}</>}
   <Text style={ui.h}>2. Choose a checklist</Text>
   {!data.checklists.length&&<View style={ui.card}><Empty title="No usable checklists on this device" detail="This company needs a checklist with at least one published version before you can start an inspection."/>
    {data.canCreate?<Button label="Create checklist" onPress={()=>router.push({pathname:'/templates',params:{create:'1',returnTo:'new-inspection',site}})}/>:<Text style={ui.body}>Ask your company owner to publish a checklist and synchronise it. You cannot create company templates with your current role.</Text>}
    <Text style={ui.muted}>Expecting an existing checklist? Check synchronisation. Refreshing this list reads saved local records; it does not download server data.</Text><Button label="Open synchronisation" secondary onPress={()=>router.push('/sync')}/>
   </View>}
   {(data.incomplete>0||data.invalid>0||data.archived>0)&&<View style={ui.warning}><Text style={ui.body}>{data.incomplete} checklist(s) have no version, {data.invalid} have an unreadable latest version, and {data.archived} are archived. Existing inspection snapshots are preserved.</Text>{data.canCreate&&<Button label="Manage checklists" secondary onPress={()=>router.push('/templates')}/>}</View>}
   {data.checklists.map(v=><View key={v.id} style={[ui.card,version===v.id&&{borderColor:'#006c49',borderWidth:2}]}><Text style={ui.h}>{v.name}</Text><Pill text={`Version ${v.version} · ${v.itemCount} items`}/><Button label={version===v.id?'✓ Selected checklist':'Use this checklist'} secondary={version!==v.id} disabled={task.busy} onPress={()=>chooseVersion(v.id)}/></View>)}
   {data.canCreate&&data.checklists.length>0&&<Button label="Create another checklist" secondary onPress={()=>router.push({pathname:'/templates',params:{create:'1',returnTo:'new-inspection',site}})}/>}
   <Text style={ui.muted}>The selected version and site details are copied into the draft. Later checklist edits will not change that inspection. Creation saves on this device; server synchronisation is separate.</Text>
   {!!missing&&<Text accessibilityLiveRegion="polite" style={ui.body}>{missing}</Text>}
   {!!task.error&&<Text accessibilityLiveRegion="polite" style={ui.error}>{task.error}</Text>}
   <Button label={task.busy?'Creating your draft…':'Open inspection'} disabled={task.busy||!!error||!validSite||!validVersion} onPress={()=>void task.run(async()=>{
     if(!validSite||!validVersion)throw Error('Select an active site and a usable checklist first.');
     const id=created.current??await handle.catalogue.newDraft(validSite.id,validVersion.id,request.current);created.current=id;
     router.replace({pathname:'/inspect',params:{id}});
   })}/>
  </>}
 </Page>;
}
