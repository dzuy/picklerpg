import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSafeStorage} from '../src/browser-storage';
import {openChallengeGame,openChallengeLobby} from '../src/multiplayer/open-challenge-game';

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

test('guest invitations open Games without reloading or losing the guest session',async()=>{
 const {storage}=createSafeStorage(()=>{throw new DOMException('Blocked','SecurityError')});
 storage.setItem('auth','guest-session');
 let route='';
 await openChallengeLobby(async()=>{
  assert.equal(route,'/?openplay=1');
  assert.equal(storage.getItem('auth'),'guest-session');
 },{replaceState:(_data,_unused,url)=>{route=String(url)}});
});

test('guest Games URL retains the private recovery link across refresh',async()=>{
 let route='';
 await openChallengeLobby(async()=>{}, {replaceState:(_data,_unused,url)=>{route=String(url)}},'guest-token');
 assert.equal(route,'/?openplay=1#guestChallenge=guest-token');
});
