import test from 'node:test';import assert from 'node:assert/strict';import{readAccountForm}from'../src/auth/accountForm.js';
test('submitted autofill values win over earlier UI state without transforming passwords',()=>{
 const form=new FormData();form.set('fullName','Synthetic');form.set('email','new@example.test');form.set('password','  Unicode🔒 password  ');form.set('confirmPassword','  Unicode🔒 password  ');
 const actual=readAccountForm(form);assert.equal(actual.password,'  Unicode🔒 password  ');assert.equal(actual.confirm,actual.password);assert.equal(actual.email,'new@example.test');
});
test('missing password controls stay missing rather than reusing earlier credentials',()=>{assert.equal(readAccountForm(new FormData()).password,'');});
