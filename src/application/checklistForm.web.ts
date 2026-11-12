import type {ChecklistItem} from '../domain/inspection.ts';
/** Read rendered input values at submission, including browser autofill. Never
 * used for credentials; preserves raw text until shared validation succeeds. */
export function readChecklistForm(name:string,items:ChecklistItem[],scope='checklist'){
 const value=(id:string,fallback:string)=>{const input=document.getElementById(id);return input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement?input.value:fallback;};
 return {name:value(scope+'-name',name),items:items.map(item=>({...item,title:value(scope+'-item-'+item.id,item.title),section:value(scope+'-section-'+item.id,item.section??'')}))};
}
