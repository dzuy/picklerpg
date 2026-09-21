import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSafeStorage} from '../src/browser-storage';
import {openChallengeGame} from '../src/multiplayer/open-challenge-game';

test('accepted challenges mount the court with the existing memory-only sign-in',async()=>{
 const {storage}=createSafeStorage(()=>{throw new DOMException('Blocked','SecurityError')});
 storage.setItem('auth','invited-player-session');
 let route='',mounted=false;
 await openChallengeGame('match-id',async()=>{
  assert.equal(route,'/?multiplayer=1&match=match-id');
  assert.equal(storage.getItem('auth'),'invited-player-session');
  mounted=true;
 },{replaceState:(_data,_unused,url)=>{route=String(url)}});
 assert.equal(mounted,true);
});

test('court loading failures are returned to invitation error handling',async()=>{
 await assert.rejects(openChallengeGame('match-id',async()=>{throw Error('Offline')},{replaceState:()=>{}}),/Offline/);
});
