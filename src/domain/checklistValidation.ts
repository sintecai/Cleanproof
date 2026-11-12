import type {ChecklistItem} from './inspection.ts';
export type ChecklistErrors=Record<string,string>;
export class ChecklistValidationError extends Error{
 constructor(readonly fields:ChecklistErrors){super(Object.values(fields)[0]??'Check the checklist fields.');}
}
export function checklistErrors(name:string|undefined,items:readonly ChecklistItem[],meaningful=true):ChecklistErrors{
 const errors:ChecklistErrors={};
 if(name!==undefined&&(typeof name!=='string'||!name.trim()||name.trim().length>120))errors.name='Enter a checklist name (1–120 characters).';
 if(!Array.isArray(items)||items.length<1||items.length>50){errors.items='Add 1–50 inspection items.';return errors;}
 const ids=new Set<string>();
 for(const item of items){
  if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(item.id)||ids.has(item.id)){errors.items='Checklist items need unique identifiers. Reopen the editor before retrying.';continue;}
  ids.add(item.id);
  if(typeof item.title!=='string'||!item.title.trim()||item.title.trim().length>240||(meaningful&&!/[\p{L}\p{N}]/u.test(item.title)))errors['item:'+item.id]='Enter meaningful item text (1–240 characters).';
  if(item.section!==undefined&&(typeof item.section!=='string'||item.section.trim().length>120))errors['section:'+item.id]='Use at most 120 characters, or leave Section blank.';
 }
 return errors;
}
export function validatedChecklistItems(items:readonly ChecklistItem[],meaningful=true):ChecklistItem[]{
 const errors=checklistErrors(undefined,items,meaningful);if(Object.keys(errors).length)throw new ChecklistValidationError(errors);
 return items.map(item=>({id:item.id,title:item.title.trim(),...(item.section?.trim()?{section:item.section.trim()}:{})}));
}
export function validatedChecklist(name:string,items:readonly ChecklistItem[]){
 const errors=checklistErrors(name,items);if(Object.keys(errors).length)throw new ChecklistValidationError(errors);
 return {name:name.trim(),items:validatedChecklistItems(items)};
}
