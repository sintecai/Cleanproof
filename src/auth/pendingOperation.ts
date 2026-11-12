/** Deadline for UI work. Timeout fences publication; it never clears a session
 * or pretends that an in-flight server/storage operation was rolled back. */
export class PendingOperation {
 private epoch=0;
 invalidate(){++this.epoch;}
 async run<T>(task:(check:()=>void)=>Promise<T>,ms:number,message:string){
  const epoch=++this.epoch;let expired=false;let timer:ReturnType<typeof setTimeout>|undefined;
  const check=()=>{if(expired||epoch!==this.epoch)throw Error('This opening attempt was superseded. Saved work is preserved.');};
  try{return await Promise.race([task(check),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error(message));},ms);})]);}
  finally{if(timer)clearTimeout(timer);}
 }
}
