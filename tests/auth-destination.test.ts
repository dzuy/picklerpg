import test from 'node:test';
import assert from 'node:assert/strict';
import {accountReturnUrl} from '../src/auth-destination';
test('remote account recovery preserves only a valid internal match destination',()=>{
 assert.equal(accountReturnUrl(new URL('https://pickle.example/?unrelated=1#token')),'https://pickle.example/');
 const id='11111111-1111-4111-8111-111111111111';
 assert.equal(accountReturnUrl(new URL(`https://pickle.example/play?returnMatch=${id}`)),`https://pickle.example/play?multiplayer=1&match=${id}`);
 for(const value of ['https://evil.example','//evil.example','../admin','javascript:alert(1)','bad'])assert.equal(accountReturnUrl(new URL(`https://pickle.example/play?returnMatch=${encodeURIComponent(value)}`)),'https://pickle.example/play');
 assert.equal(accountReturnUrl(new URL('https://pickle.example/play?unrelated=1#token')),'https://pickle.example/play');
});
