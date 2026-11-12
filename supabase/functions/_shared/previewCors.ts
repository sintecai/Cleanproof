/** Local browser preview only. Native requests carry no Origin; authentication is unchanged. */
export function previewCors(origin: string | null, allowedHttpsOrigins: readonly string[] = []) {
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if(u.origin===origin && u.protocol==='https:' && allowedHttpsOrigins.includes(origin)) return {
      "Access-Control-Allow-Origin":origin,
      "Access-Control-Allow-Headers":"authorization,apikey,content-type",
      "Access-Control-Allow-Methods":"GET,POST,OPTIONS",Vary:"Origin",
    };
    if (
      u.origin !== origin ||
      u.protocol !== "http:" ||
      !["localhost", "127.0.0.1"].includes(u.hostname) ||
      !["8081", "8082"].includes(u.port)
    )
      throw Error();
  } catch {
    throw Error("Browser origin is not authorised for this local preview");
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };
}

/** Explicit staging origins are public configuration, never a production fallback. */
export function configuredWebOrigins(backendUrl:string,configured:string){
 const origins=configured.split(',').map(v=>v.trim()).filter(Boolean);
 for(const origin of origins){const parsed=new URL(origin);if(parsed.protocol!=='https:'||parsed.origin!==origin)throw Error('Configure exact HTTPS web origins only.');}
 if(backendUrl==='https://vmvoeksprlwjiwfxqita.supabase.co')origins.push('https://cleanproof-sicy-preview.grassyelf128.chatgpt.site','https://cleanproof-mobile-tab-preview.sintecai26.chatgpt.site','https://cleanproof-release-connected.sintecai26.chatgpt.site');
 if(backendUrl==='https://decysnpygturutfyjofi.supabase.co')origins.push('https://cleanproof-customer.sintecai26.chatgpt.site');
 return [...new Set(origins)];
}

/** Production never inherits staging or local browser origins. Native still authenticates normally. */
export function serviceCors(backendUrl:string,origin:string|null,configured:string){
 const backend=new URL(backendUrl);
 const local=backend.protocol==='http:'&&['localhost','127.0.0.1'].includes(backend.hostname);
 const staging=backendUrl==='https://vmvoeksprlwjiwfxqita.supabase.co';
 const allowed=configuredWebOrigins(backendUrl,configured);
 if(origin&&!local&&!staging&&!allowed.includes(origin))throw Error('Browser origin is not configured for this service.');
 return previewCors(origin,allowed);
}
