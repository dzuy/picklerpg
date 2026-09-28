import test from 'node:test';
import assert from 'node:assert/strict';
import {createSafeStorage} from '../src/browser-storage';
import {loadGamePreference,saveGamePreference} from '../src/game-preferences';
const storage=()=>createSafeStorage(()=>{throw Error('memory')}).storage;
test('game preferences persist independently of game and mode, including off values',()=>{
 const s=storage();
 for(const name of ['names','autoPlay','partnerAutonomy'] as const){
  saveGamePreference(name,true,s);assert.equal(loadGamePreference(name,false,s),true);
  saveGamePreference(name,false,s);assert.equal(loadGamePreference(name,true,s),false);
 }
});
test('legacy preferences migrate once and cannot override newer choices',()=>{
 const s=storage();s.setItem('pickle-remote-view',JSON.stringify({names:false}));
 s.setItem('pickle-rpg-controls-v1',JSON.stringify({partnerAutonomy:true,playerAutonomy:true}));
 assert.equal(loadGamePreference('names',true,s),false);
 assert.equal(loadGamePreference('partnerAutonomy',false,s),true);
 assert.equal(loadGamePreference('autoPlay',false,s),true);
 saveGamePreference('autoPlay',false,s);assert.equal(loadGamePreference('autoPlay',true,s),false);
 s.setItem('pickle-game-names-v1','broken');assert.equal(loadGamePreference('names',true,s),false);
});
