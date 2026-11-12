// Independent component acceptance only. Never a customer workspace or authentication bypass.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserReportHost} from '../src/reporting/BrowserReportHost.web';
import {beginPdfExport,downloadInspectionPdf} from '../src/reporting/pdfExport.web';
import fixture from '../tests/fixtures/pdf-report.json';
import type {ReportData} from '../src/storage/workflowRepository';
import type {ReportPhoto} from '../src/reporting/inspectionReport';
function Fixture(){const [status,setStatus]=React.useState('');async function prepare(second:boolean){setStatus('Preparing synthetic report…');try{const data=structuredClone(fixture.data) as ReportData;if(second){data.draft.id='55555555-5555-4555-8555-555555555555';data.context.workspace.siteName='Synthetic South Office';data.context.workspace.inspectionId=data.draft.id;data.draft.responses.floors!.note='Second inspection: entrance clean.';}await downloadInspectionPdf(data,fixture.photos as ReportPhoto[],beginPdfExport());setStatus('Prepared.');}catch(e){setStatus(String(e));}}return <><h1>Synthetic report-component test</h1><p>This is the real report component and generator with isolated fixtures. It does not test sign-in, persistence or synchronisation.</p><button onClick={()=>void prepare(false)}>Prepare North report</button><button onClick={()=>void prepare(true)}>Prepare South report</button><p role="status">{status}</p><BrowserReportHost/></>;}createRoot(document.getElementById('root')!).render(<Fixture/>);
