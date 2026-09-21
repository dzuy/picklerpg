import test from 'node:test';
import assert from 'node:assert/strict';
import {randomPlayerName,randomPlayerCatchphrase} from '../src/player-identity-randomizer';
test('generated identities fit saved-player limits and rerolls choose a different value',()=>{
 for(let i=0;i<240;i++){
  const random=()=>i/240,name=randomPlayerName('',random),phrase=randomPlayerCatchphrase('',random);
  assert.match(name,/^[a-zA-Z0-9]+$/);assert.ok(name.length<=24);
  assert.ok(phrase.length>0&&phrase.length<=30);
  assert.notEqual(randomPlayerName(name,random),name);
  assert.notEqual(randomPlayerCatchphrase(phrase,random),phrase);
 }
});
