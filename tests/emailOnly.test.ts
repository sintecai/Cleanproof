import test from 'node:test';
import assert from 'node:assert/strict';
import {safeDestination} from '../src/auth/returnDestination.ts';
test('email return destination preserves business routes and rejects external targets/callback loops',()=>{
 const origin='https://cleanproof.example';
 for(const value of ['https://evil.example','//evil.example','/email-callback?code=synthetic','/reset-password','/unknown'])assert.equal(safeDestination(value,origin),'/');
 assert.equal(safeDestination('/sites/?search=office',origin),'/sites?search=office');
});

test('return destinations discard credentials, auth links and nested redirects but retain business parameters',()=>{
 const origin='https://cleanproof.example';
 assert.equal(safeDestination('/sites?create=1&password=private&access_token=private&code=private&returnTo=https://other.example#refresh_token=private',origin),'/sites?create=1');
 assert.equal(safeDestination('/inspect?id=record&item=check&code=private',origin),'/inspect?id=record&item=check');
 assert.equal(safeDestination('/sites?search=a&search=b',origin),'/sites');
});
