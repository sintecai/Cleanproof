// Local publication gate: never treats a successful build as customer acceptance.
import{readFileSync}from'node:fs';
const state=JSON.parse(readFileSync('release/website-acceptance.json','utf8'));
const content=JSON.parse(readFileSync('deployment/website-content.json','utf8'));
const pending=Object.entries(state.gates).filter(([,passed])=>passed!==true).map(([name])=>name);
if(!content.privacyApproved||!content.retentionApproved||!content.postalAddress||!/^\S+@\S+\.\S+$/.test(content.supportEmail||''))pending.push('approved organisation contact and policies');
console.log(JSON.stringify({websiteReady:pending.length===0,pending},null,2));process.exitCode=pending.length?1:0;
