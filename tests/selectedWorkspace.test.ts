import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectedCompanyRequiresSnapshot,ensureSelectedSnapshot} from '../src/storage/selectedWorkspace.ts';
test('a lost selected company snapshot fails closed while a new account can initialise its first workspace',()=>{
 const defaultProfile='account-default',companyProfile='existing-company';
 assert.equal(selectedCompanyRequiresSnapshot(defaultProfile,defaultProfile),false);
 assert.doesNotThrow(()=>ensureSelectedSnapshot(false,null));
 assert.equal(selectedCompanyRequiresSnapshot(companyProfile,defaultProfile),true);
 assert.throws(()=>ensureSelectedSnapshot(true,null),/unavailable.*not been reset/);
 assert.doesNotThrow(()=>ensureSelectedSnapshot(true,{bytes:'encrypted'}));
});
