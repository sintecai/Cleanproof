/** One private recovery exchange per mounted screen, safe across effect replay. */
export function recoveryBootstrap<T extends {retire():void}>(start:()=>Promise<T>){
 type Result={value:T}|{error:true};
 const listeners=new Set<(result:Result)=>void>();
 let pending=false,closed=false,result:Result|undefined;
 return {subscribe(listener:(result:Result)=>void){
  if(closed)throw Error('Recovery screen is closed.');
  listeners.add(listener);
  if(result)listener(result);
  else if(!pending){
   pending=true;
   void Promise.resolve().then(start).then(value=>{
    if(closed){value.retire();return;}
    result={value};for(const notify of listeners)notify(result);
   },()=>{if(!closed){result={error:true};for(const notify of listeners)notify(result);}});
  }
  return()=>{
   listeners.delete(listener);
   // React can synchronously replay an effect cleanup/setup. Retire only when
   // no replacement subscriber exists; this never delays rendering or routing.
   queueMicrotask(()=>{if(!listeners.size&&!closed){closed=true;if(result&&'value'in result)result.value.retire();result=undefined;}});
  };
 }};
}
