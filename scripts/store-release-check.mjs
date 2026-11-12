import {readFileSync} from 'node:fs';
const report=JSON.parse(readFileSync(new URL('../release/acceptance.json',import.meta.url),'utf8'));
const open=report.gates.filter(g=>g.status!=='passed');
for(const g of report.gates)console.log(`${g.status.toUpperCase()} ${g.id}: ${g.evidence}`);
console.log(open.length?'NOT APPROVED FOR STORE SUBMISSION':'All recorded gates passed; revalidate against the tested binary before submission.');
process.exitCode=open.length?1:0;
