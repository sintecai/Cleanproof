import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutWidth} from '../src/application/layoutWidth.ts';
test('phone preview keeps compact shell before and after measurement on every route',()=>{
  for(let page=0;page<25;page++) {
    assert.equal(layoutWidth(1363,null,true),430);
    assert.equal(layoutWidth(1363,430,true),430);
    assert.ok(layoutWidth(1363,null,true)<820);
  }
});
test('container measurement is bounded by host and preview, and resizes safely',()=>{
  assert.equal(layoutWidth(390,null,true),390);
  assert.equal(layoutWidth(390,430,true),390);
  assert.equal(layoutWidth(1440,1100,false),1100);
  assert.equal(layoutWidth(1440,430,false),430);
  assert.equal(layoutWidth(1440,null,false),1440);
});
