import {test} from 'node:test';
import assert from 'node:assert/strict';
import {friendActionNeedsAccount,setupModeForAccount} from '../src/multiplayer/guest-access';

test('guest game setup defaults to solo while signed-in setup keeps friend play',()=>{
 assert.equal(setupModeForAccount(true),'solo');assert.equal(setupModeForAccount(false),'friends');
});

test('friend actions require an account only for anonymous players',()=>{
 assert.equal(friendActionNeedsAccount(true),true);assert.equal(friendActionNeedsAccount(false),false);
});
