import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readChecklistForm} from '../src/application/checklistForm.web.ts';
test('web submission uses actual scoped input values, including autofill, without mixing hidden editors',()=>{
 const names=['document','HTMLInputElement','HTMLTextAreaElement'] as const;
 const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 class Input{constructor(public value:string){}}
 class TextArea{constructor(public value:string){}}
 const values=new Map([['active-name',new Input('Office cleaning inspection')],['active-item-one',new Input('Washroom cleanliness')],['active-section-one',new Input('  ')],['hidden-name',new Input('Wrong inactive editor')]]);
 try{
  Object.defineProperty(globalThis,'HTMLInputElement',{configurable:true,value:Input});Object.defineProperty(globalThis,'HTMLTextAreaElement',{configurable:true,value:TextArea});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{getElementById:(id:string)=>values.get(id)??null}});
  const state=[{id:'one',title:'stale title'}];const result=readChecklistForm('',state,'active');
  assert.equal(result.name,'Office cleaning inspection');assert.equal(result.items[0]?.title,'Washroom cleanliness');assert.equal(result.items[0]?.section,'  ');assert.equal(state[0]?.title,'stale title');
  assert.equal(readChecklistForm('Native fallback',state,'missing').name,'Native fallback');
 }finally{for(const name of names){const old=previous.get(name);if(old)Object.defineProperty(globalThis,name,old);else Reflect.deleteProperty(globalThis,name);}}
});
