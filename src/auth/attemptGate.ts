/** Device-memory retry throttle, not a replacement for Supabase server rate limits/CAPTCHA. */
export class AuthAttemptGate {
 private attempts=new Map<string,number[]>();
 constructor(private now=()=>Date.now()){}
 take(kind:'signin'|'signup'|'recovery'){
  const now=this.now(),recent=(this.attempts.get(kind)??[]).filter(t=>now-t<60000);
  if(recent.length>=5)throw Error('Too many attempts on this device. Wait one minute before trying again.');
  recent.push(now);this.attempts.set(kind,recent);
 }
}
