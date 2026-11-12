import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {checklistErrors,validatedChecklist,ChecklistValidationError} from '../src/domain/checklistValidation.ts';
import {Catalogue,validateItems} from '../src/storage/catalogue.ts';
import {NodeDatabase} from './support/nodeDatabase.ts';
import {migrate} from '../src/storage/migrations.ts';
const item={id:'washroom',title:'Washroom cleanliness'};
test('missing name is attributed to name rather than a valid inspection item; blank section is optional',()=>{
 for(const name of ['', '  ', '\t\n','\u00a0'])assert.deepEqual(Object.keys(checklistErrors(name,[item])),['name']);
 assert.match(checklistErrors('',[item]).name!,/checklist name/);
 assert.deepEqual(validatedChecklist('Office cleaning inspection',[{...item,section:' \t'}]),{name:'Office cleaning inspection',items:[item]});
 assert.throws(()=>validatedChecklist('Office',[{...item,title:'---'}]),ChecklistValidationError);
 // Previously accepted historical wording remains readable; new publication is stricter.
 assert.equal(validateItems([{id:'legacy',title:'✓'}])[0]?.title,'✓');
});
test('required name and item boundaries and optional-section limits are consistent',()=>{
 assert.equal(validatedChecklist('a'.repeat(120),[{...item,title:'a'.repeat(240),section:'s'.repeat(120)}]).name.length,120);
 assert.ok(checklistErrors('a'.repeat(121),[item]).name);
 assert.ok(checklistErrors('Office',[{...item,title:' '.repeat(8)}])['item:washroom']);
 assert.ok(checklistErrors('Office',[{...item,title:'a'.repeat(241)}])['item:washroom']);
 assert.ok(checklistErrors('Office',[{...item,section:'s'.repeat(121)}])['section:washroom']);
 assert.deepEqual(Object.keys(checklistErrors('',[{...item,title:''}])),['name','item:washroom']);
});
test('failed publication rolls back without mutating form values; retry saves the same version and queue event',async()=>{
 const db=new NodeDatabase(':memory:');await migrate(db);const company=randomUUID(),c=new Catalogue(db,company,randomUUID,()=>new Date().toISOString());
 const raw={name:'Office cleaning inspection',items:[{...item,section:'  '}]},original=JSON.stringify(raw),template=randomUUID(),version=randomUUID();
 await db.execAsync("CREATE TRIGGER synthetic_save_failure BEFORE INSERT ON local_events WHEN NEW.kind='template_version_created_v1' BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END;");
 await assert.rejects(c.template(raw.name,raw.items,template,version));assert.equal(JSON.stringify(raw),original);assert.equal((await c.templates()).length,0);
 await db.execAsync('DROP TRIGGER synthetic_save_failure');
 await c.template(raw.name,raw.items,template,version);await c.template(raw.name,raw.items,template,version);
 assert.equal((await c.inspectionOptions()).checklists[0]?.id,version);assert.equal((await c.versions()).length,1);
 assert.equal((await db.getFirstAsync<{n:number}>("SELECT count(*) n FROM local_events WHERE kind='template_version_created_v1'"))?.n,1);
 await assert.rejects(c.template('',[item]),error=>error instanceof ChecklistValidationError&&!!error.fields.name);
 await db.close();
});
