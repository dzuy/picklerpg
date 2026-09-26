import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultLineup} from '../src/multiplayer/default-lineup';
import {newPlayer} from '../src/player-design';
const players=['Emma','rocket','Leo'].map((name,i)=>({...newPlayer(String(i)),name}));
test('default player leads, with each other roster player eligible as partner',()=>{
 assert.deepEqual(defaultLineup(players,'1','rocket',()=>0),['1','0']);
 assert.deepEqual(defaultLineup(players,'1','rocket',()=>.99),['1','2']);
 assert.deepEqual(defaultLineup(players,'2','rocket',()=>0),['2','0']);
});
test('username fallback and small rosters stay valid',()=>{
 assert.deepEqual(defaultLineup(players,null,'ROCKET',()=>0),['1','0']);
 assert.deepEqual(defaultLineup([players[1]],null,'rocket'),['1','1']);
 assert.deepEqual(defaultLineup([],null,'rocket'),[]);
 assert.deepEqual(defaultLineup(players,'removed','unknown',()=>0),['0','1']);
});

test('selected starters take priority over active player and random partner',()=>{
 assert.deepEqual(defaultLineup(players,'1','rocket',()=>.99,['2','0']),['2','0']);
});
test('starter defaults are stable until explicitly changed',()=>{
 for(let i=0;i<10;i++)assert.deepEqual(defaultLineup(players,'1','rocket'),['1','0']);
});
test('removed and duplicate starters fall back to eligible distinct players',()=>{
 assert.deepEqual(defaultLineup(players,'1','rocket',undefined,['removed','2']),['2','1']);
 assert.deepEqual(defaultLineup(players,'1','rocket',undefined,['2','2']),['2','1']);
 assert.deepEqual(defaultLineup([players[0]],null,'',undefined,['removed','0']),['0','0']);
});
