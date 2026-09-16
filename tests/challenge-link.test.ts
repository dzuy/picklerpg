import test from 'node:test';
import assert from 'node:assert/strict';
import {challengeToken} from '../src/multiplayer/challenge-link';
const token='a'.repeat(43),message='Dzuy challenged you to PickleBash. Think you can outplay them?';
test('challenge URLs recover native share text without changing the invitation token',()=>{
 for(const suffix of ['', '/',encodeURIComponent('\n'+message),encodeURIComponent(' '+message),encodeURIComponent(message),encodeURIComponent(message.slice(0,-1))])assert.equal(challengeToken(`/challenge/${token}${suffix}`),token);
 for(const path of ['/challenge/short',`/challenge/${token}extra`,`/challenge/${token}/accept`,'/challenge/%zz',`/other/${token}`])assert.equal(challengeToken(path),null);
});
