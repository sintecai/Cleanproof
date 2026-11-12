import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('a native bound workspace does not remain indefinitely in initial access checking',()=>{
 const source=readFileSync('src/application/BusinessGate.tsx','utf8');
 assert.match(source,/if\(nativeOwner\s*\|\|\s*!b\s*\|\|\s*!hasCustomerSession\(\)\)setChecking\(false\)/);
 assert.match(source,/title="Sign in to continue"/);
 assert.doesNotMatch(source,/title="Saved work is locked"/);
});
