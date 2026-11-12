// Stress content is deliberately separate from the management preview.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {inspectionReport} from '../.test-build/src/reporting/inspectionReport.js';
const sample=JSON.parse(readFileSync('previews/sample-data.json','utf8'));const d=structuredClone(sample.data);
d.context.workspace.siteName='Synthetic commercial office with a long multi-part site name '.repeat(3).slice(0,120);d.context.address='Synthetic address detail '.repeat(30).slice(0,500);d.branding.name='Synthetic contractor name '.repeat(8).slice(0,120);d.branding.contact='office@example.test · Synthetic contact details '.repeat(15).slice(0,500);
for(const item of d.context.workspace.items)d.draft.responses[item.id].note=('Unicode £ café. Long finding for pagination coverage. '.repeat(50)).slice(0,1980)+' END-'+item.id;
mkdirSync('artifacts/report-stress',{recursive:true});writeFileSync('artifacts/report-stress/long-report.html',inspectionReport(d,sample.photos));
const na=structuredClone(d);for(const item of na.context.workspace.items)na.draft.responses[item.id]={result:'na',note:'Not in this contract.'};na.actions=[];writeFileSync('artifacts/report-stress/all-na.html',inspectionReport(na,[]));console.log('Stress fixtures generated outside management previews.');
