/** A blocked/late IndexedDB open must not disable account entry forever. */
export function openBrowserRecords(factory:IDBFactory=indexedDB,ms=8000):Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  let done=false;const request=factory.open('cleanproof-preview-v1',1);
  const fail=(error:unknown)=>{if(done)return;done=true;clearTimeout(timer);reject(error);};
  const timer=setTimeout(()=>fail(Error('Browser storage did not open in time. Close other CleanProof tabs and retry; do not clear site data.')),ms);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('private'))request.result.createObjectStore('private');};
  request.onblocked=()=>fail(Error('Another tab is blocking protected storage. Close other CleanProof tabs and retry; your work has not been removed.'));
  request.onerror=()=>fail(request.error??Error('Protected browser storage is unavailable.'));
  request.onsuccess=()=>{const db=request.result;if(done){db.close();return;}done=true;clearTimeout(timer);db.onversionchange=()=>db.close();resolve(db);};
 });
}
