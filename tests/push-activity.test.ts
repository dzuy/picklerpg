import test from 'node:test';
import assert from 'node:assert/strict';
import {pushActivityState} from '../src/push-activity';
test('visible launcher and embedded court both keep notification suppression active',()=>{
 assert.equal(pushActivityState('visible',false,false),true);
 assert.equal(pushActivityState('visible',false,true),true);
});
test('closing the game frame cannot clear the launcher activity lease',()=>{
 assert.equal(pushActivityState('visible',true,true),null);
 assert.equal(pushActivityState('visible',true,false),false);
});
test('backgrounding the app restores notifications',()=>{
 assert.equal(pushActivityState('hidden',false,false),false);
 assert.equal(pushActivityState('hidden',false,true),false);
});
