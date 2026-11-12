type Event='entry-mount'|'entry-unmount'|'restore-start'|'restore-authenticated'|'restore-signed-out'|'membership-start'|'membership-ready'|'device-key-start'|'device-key-ready'|'authenticated'|'entry-error'|'workspace-start'|'workspace-ready'|'workspace-error'|'workspace-unmount'|'navigator-mounted'|'route-request';
const started=Date.now();
const events:{ms:number;event:Event}[]=[];
/** Fixed event names only. Never accept URLs, identifiers, errors or tokens. */
export function startupTrace(event:Event){const row={ms:Date.now()-started,event};events.push(row);if(events.length>80)events.shift();if(process.env.EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT==='staging')console.info('[CP_STARTUP]',row.ms,event);}
export function startupSnapshot(){return events.map(e=>`${e.ms}ms ${e.event}`).join('\n');}
