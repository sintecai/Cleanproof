import { Alert } from "../src/application/platformAlert";
import { useState } from "react";
import {beginPdfExport,downloadInspectionPdf} from '../src/reporting/pdfExport';
import { showReportPreview } from "../src/reporting/reportPreview";
import { Text, View, Platform } from "react-native";
import { useLocalSearchParams, usePreventRemove } from "expo-router";
import { Button, Loading, Page, Pill, Metric, colour, ui } from "../src/application/ui";
import { useQuery, useTask, useWorkspace } from "../src/application/workspace";
import { demo } from "../src/domain/inspection";
import { score, displayDate } from "../src/domain/workflow";
import {
  inspectionReport,
  type ReportPhoto,
} from "../src/reporting/inspectionReport";
import { base64 } from "../src/media/base64";
import { generateDemoPdf, shareDemoPdf } from "../src/media/nativeMedia";
export default function Reports() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    inspection = id ?? demo.inspectionId;
  const { handle } = useWorkspace();
  const task = useTask();
  const [created, setCreated] = useState("");
  const { data, error } = useQuery(async () => {
    const m = await handle.media();
    return {
      report: await handle.workflow.report(inspection),
      vault: m.vault,
      pdfs: (await m.vault.list(inspection)).filter((a) => a.kind === "pdf"),
    };
  }, [inspection]);
  usePreventRemove(task.busy, () =>
    Alert.alert(
      "Preparing your report",
      "Please wait for the report operation to finish.",
    ),
  );
  async function reportContents(){
    const report=await handle.workflow.report(inspection),photos:ReportPhoto[]=[];
    const missing:string[]=[];
    for(const a of [...report.photos,...(report.actionPhotos??[])]){
      try{photos.push({id:a.id,actionId:a.action_id,itemId:a.item_id!,caption:a.caption,base64:base64(await data!.vault.read(a.id))});}
      catch{missing.push(a.id);}
    }
    return {report,photos,missing};
  }
  const c = data ? score(data.report.draft) : null;
  return (
    <Page
      title="Inspection report"
      subtitle="Review the contents before exporting a local PDF."
    >
      {error && <Text style={ui.error}>{error}</Text>}
      {!data ? (
        <Loading />
      ) : (
        <>
          <View style={ui.card}>
            <Text style={ui.h}>{data.report.branding.name}</Text>
            <Text style={ui.muted}>{data.report.branding.contact}</Text>
            <Pill
              text={
                data.report.status === "completed"
                  ? "Completed locally"
                  : "Draft - not completed"
              }
              tone={data.report.status === "completed" ? "teal" : "amber"}
            />
            <Text style={ui.h}>{data.report.context.workspace.siteName}</Text>
            <Text style={ui.body}>{data.report.context.customerName}</Text>
            <Text style={ui.muted}>
              {data.report.context.address}{"\n"}Inspector:{" "}
              {data.report.inspector || "Not yet recorded"}{"\n"}
              {displayDate(
                data.report.completedAt ?? data.report.draft.updatedAt,
              )}
            </Text>
            <View style={[ui.card, { alignItems: 'center', backgroundColor: colour.mint, borderWidth: 0 }]}>
              <Text style={ui.label}>APPLICABLE ITEM PASS RATE</Text>
              <Text style={[ui.title, { fontSize: 48, lineHeight: 60, color: colour.teal }]}>{c!.percentage === null ? 'N/A' : `${c!.percentage}%`}</Text>
              <Text style={ui.muted}>Pass ÷ (Pass + Fail). N/A excluded.</Text>
            </View>
            <View style={ui.row}><Metric label="PASSED" value={c!.pass} /><Metric label="FAILED" value={c!.fail} tone="red" /><Metric label="NOT APPLICABLE" value={c!.na} /><Metric label="PHOTOGRAPHS" value={data.report.photos.length} /></View>
          </View>
          <Text style={ui.h}>Checklist findings</Text>
          {data.report.context.workspace.items.map((i) => (
            <View style={ui.card} key={i.id}>
              <Text style={ui.h}>{i.title}</Text>
              <Pill
                text={(
                  data.report.draft.responses[i.id]!.result ?? "unanswered"
                ).toUpperCase()}
                tone={data.report.draft.responses[i.id]!.result === 'fail' ? 'red' : data.report.draft.responses[i.id]!.result === 'pass' ? 'teal' : 'amber'}
              />
              <Text style={ui.body}>
                {data.report.draft.responses[i.id]!.note ||
                  "No comment recorded."}
              </Text>
              <Text style={ui.muted}>
                {data.report.photos.filter((p) => p.item_id === i.id).length}{" "}
                inspection photograph(s)
              </Text>
            </View>
          ))}
          <Text style={ui.h}>Corrective actions</Text>
          {!data.report.actions.length && (
            <Text style={ui.muted}>No corrective actions recorded.</Text>
          )}
          {data.report.actions.map((a) => (
            <View style={ui.card} key={a.id}>
              <Text style={ui.body}>{a.description}</Text>
              <Text style={ui.muted}>
                {a.owner_name} · Due {displayDate(a.due_date)} · {a.status}
                {a.resolution_note ? `\n${a.resolution_note}` : ""}
              </Text>
            </View>
          ))}
          <Text style={ui.muted}>
            Photographs and current action status are included when the PDF is
            generated. Earlier PDF files keep their original contents.
          </Text>
          {<Button label={task.busy?'Generating report…':'Open report'} disabled={task.busy} onPress={()=>{
            const generation=beginPdfExport();
            void task.run(async()=>{const {report,photos,missing}=await reportContents();if(missing.length)throw Error('Some report photographs are unavailable. Open the inspection, recover them, then retry Download PDF.');await downloadInspectionPdf(report,photos,generation);},'Report prepared.');
          }}/> }
          {Platform.OS!=='web'&&<Button
            label={
              task.busy
                ? "Preparing report…"
                : "Generate PDF from this record"
            }
            disabled={task.busy}
            onPress={() =>
              void task.run(
                async () => {
                  const {report,photos,missing}=await reportContents();
                  if (Platform.OS === "web") {
                    showReportPreview(inspectionReport(report, photos, missing));
                    return;
                  }
                  if(missing.length)throw Error('Recover the missing photographs before generating a PDF.');
                  const pdf = await generateDemoPdf(
                    data.vault,
                    inspection,
                    inspectionReport(report, photos),
                  );
                  setCreated(pdf.id);
                },
                Platform.OS === "web"
                  ? "Browser report opened. Printing/saving is controlled by your browser."
                  : "PDF generated and saved on this device.",
              )
            }
          />
          }
          {created && (
            <Text style={ui.muted}>Your latest PDF is ready below.</Text>
          )}
          <Text style={ui.h}>
            {Platform.OS === "web"
              ? "Browser report output"
              : "Saved PDF versions"}
          </Text>
          {!data.pdfs.length && (
            <Text style={ui.muted}>
              {Platform.OS === "web"
                ? "Open a report, then choose Download PDF in its toolbar. Browser exports are separate from native PDF versions and secure client links."
                : "Generate a PDF to export it. A PDF viewer may be available through the system share sheet."}
            </Text>
          )}
          {data.pdfs.map((a, n) => (
            <View key={a.id} style={ui.card}>
              <Text style={ui.body}>
                PDF {n + 1} · {displayDate(a.created_at)} ·{" "}
                {new Date(a.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={ui.muted}>
                {a.state === "ready"
                  ? "Saved on this device"
                  : "Needs recovery"}{" "}
                · {a.bytes.toLocaleString()} bytes
              </Text>
              {["missing", "interrupted"].includes(a.state) && (
                <Button
                  label="Try recovering PDF"
                  secondary
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(
                      () => data.vault.recover(a.id),
                      "PDF recovered on this device.",
                    )
                  }
                />
              )}
              {a.state === "ready" && (
                <Button
                  label="Export PDF"
                  secondary
                  disabled={task.busy}
                  onPress={() =>
                    Alert.alert(
                      "Export a local PDF?",
                      "This is a normal file, not a secure client link. Exported copies have no expiry or revocation. Share-sheet return does not confirm delivery.",
                      [
                        { text: "Cancel" },
                        {
                          text: "Export file",
                          onPress: () =>
                            void task.run(
                              () => shareDemoPdf(data.vault, a.id),
                              "Share sheet closed. Delivery has not been confirmed.",
                            ),
                        },
                      ],
                    )
                  }
                />
              )}
            </View>
          ))}
        </>
      )}
      {task.error && <Text style={ui.error}>{task.error}</Text>}
      {task.message && (
        <Text accessibilityLiveRegion="polite" style={ui.body}>
          {task.message}
        </Text>
      )}
      <View style={ui.warning}>
        <Text style={ui.muted}>
          Local PDF export is separate from synchronisation and secure client
          links. Keep this test data synthetic.
        </Text>
      </View>
    </Page>
  );
}
