/** Keep the input connected until the OS chooser settles. A detached input can
 * lose its browser backend node and leave the attachment operation pending. */
let cancelActive:(()=>void)|undefined;
export function cancelPhotoPicker(){cancelActive?.();}
export function choosePhotoFile(camera:boolean,doc:Document=document,timeoutMs=120000):Promise<File|null>{
 cancelActive?.();
 return new Promise((resolve,reject)=>{
  const input=doc.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('aria-hidden','true');
  input.style.cssText='position:fixed;left:-10000px;width:1px;height:1px;opacity:0;';
  if(camera)input.capture='environment';let settled=false;
  function cleanup(){clearTimeout(timer);input.onchange=null;input.oncancel=null;input.remove();if(cancelActive===cancel)cancelActive=undefined;}
  function finish(file:File|null){if(settled)return;settled=true;cleanup();resolve(file);}
  const cancel=()=>finish(null);
  const timer=setTimeout(()=>{if(settled)return;settled=true;cleanup();reject(Error('Photograph selection timed out. Retry choosing a photograph. Saved work is unchanged.'));},timeoutMs);
  cancelActive=cancel;input.onchange=()=>finish(input.files?.[0]??null);input.oncancel=cancel;
  doc.body.appendChild(input);
  try{input.click();}catch{settled=true;cleanup();reject(Error('The photograph chooser could not open. Retry using Choose a JPEG or PNG.'));}
 });
}
