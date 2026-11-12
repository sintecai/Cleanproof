import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, Loading, Page, Pill, ui } from '../src/application/ui';
import { useQuery, useWorkspace } from '../src/application/workspace';
import { displayDate } from '../src/domain/workflow';
export default function ReportLibrary() {
  const { handle } = useWorkspace();
  const { data, error } = useQuery(() => handle.workflow.history());
  return <Page title="Reports" subtitle="Inspection records ready to review and export. Local exports are not secure client links.">
    {error && <Text style={ui.error}>{error}</Text>}
    {!data ? <Loading /> : !data.length ? <Empty title="No reports yet" detail="Start an inspection. Drafts and completed records can both be previewed." /> : data.map(i => <View key={i.id} style={ui.card}>
      <Pill text={i.status === 'completed' ? 'Completed locally' : 'Draft · not completed'} tone={i.status === 'completed' ? 'teal' : 'amber'} />
      <Text style={ui.h}>{JSON.parse(i.workspace_json).siteName}</Text>
      <Text style={ui.muted}>{displayDate(i.completed_at ?? i.saved_at ?? i.created_at)} · {i.inspector || 'Inspector not yet recorded'}</Text>
      <Button label="Preview & export report" onPress={() => router.push({ pathname: '/reports', params: { id: i.id } })} />
    </View>)}
  </Page>;
}
