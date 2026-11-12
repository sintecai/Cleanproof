import test from 'node:test';
import assert from 'node:assert/strict';
import {mayResumeReportReturn} from '../src/application/reportReturn.ts';
test('report return requires the same account, an open report and a short, forward interval',()=>{
 assert.equal(mayResumeReportReturn(1000,4000,true,true),true);
 for (const args of [[null,4000,true,true],[1000,62000,true,true],[1000,999,true,true],[1000,4000,false,true],[1000,4000,true,false]] as const) assert.equal(mayResumeReportReturn(args[0],args[1],args[2],args[3]),false);
});
