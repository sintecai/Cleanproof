import type {ChecklistItem} from '../domain/inspection.ts';
export function readChecklistForm(name:string,items:ChecklistItem[],scope='checklist'){return {name,items};}
