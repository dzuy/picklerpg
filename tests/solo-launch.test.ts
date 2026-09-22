import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSoloLaunch} from '../src/solo-launch';
import {newPlayer} from '../src/player-design';
const setup=()=>({players:{you:newPlayer('a'),partner:newPlayer('b'),'opponent-left':newPlayer('c'),'opponent-right':newPlayer('d')},court:'arizona',scoring:'side-out-doubles',target:7});
test('unified solo launch preserves all selected players and rules',()=>{const input=setup();assert.deepEqual(parseSoloLaunch(input),input);});
test('unified solo launch rejects malformed players and invalid settings',()=>{for(const input of [null,{...setup(),target:0},{...setup(),court:'unknown'},{...setup(),scoring:'unknown'},{...setup(),players:{}}])assert.throws(()=>parseSoloLaunch(input));});
