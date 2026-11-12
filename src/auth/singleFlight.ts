/** Share in-flight restoration across mounts. Rejection is retryable. */
export class SingleFlight<T> {
 private pending?: Promise<T>;
 run(task:()=>Promise<T>):Promise<T>{
  if(this.pending)return this.pending;
  const next=Promise.resolve().then(task);
  this.pending=next;
  void next.finally(()=>{if(this.pending===next)this.pending=undefined;}).catch(()=>undefined);
  return next;
 }
}
