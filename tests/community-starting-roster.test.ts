import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCommunityStarters,communityDefaultLineup,repairCommunityDefaults} from '../src/community-starting-roster';
import {newPlayer} from '../src/player-design';
import {SKILLS} from '../src/engine/model';
const rows=Array.from({length:8},(_,index)=>{const player=newPlayer(`community-${index}`);player.name=`Player ${index}`;for(const key of SKILLS)player.skills[key]=40+index*8;return {public_id:String(index),player,creator_name:'Creator',added:false};});
test('starting recruits are distinct random players from the stronger community pool',()=>{
 const first=chooseCommunityStarters(rows,()=>0),last=chooseCommunityStarters(rows,()=>0.999);
 assert.equal(first.length,2);assert.notDeepEqual(first,last);
 for(const selected of [first,last]){assert.equal(new Set(selected.map(row=>row.public_id)).size,2);assert.ok(selected.every(row=>Number(row.public_id)>=4));}
});
test('community recruits never include the removed Emma and Leo presets',()=>{
 const removed=['Emma','Leo'].map((name,index)=>({...rows[7],public_id:`preset-${index}`,player:{...rows[7].player,id:`preset-${index}`,name}}));
 assert.ok(chooseCommunityStarters([...removed,...rows],()=>0).every(row=>!['Emma','Leo'].includes(row.player.name)));
 assert.deepEqual(chooseCommunityStarters([]),[]);
 assert.equal(chooseCommunityStarters(rows.slice(0,1)).length,1);
});

test('the account character leads the automatic lineup with a recruited partner',()=>{
 assert.deepEqual(communityDefaultLineup('my-custom-player',['community-a','community-b']),['my-custom-player','community-a']);
 assert.deepEqual(communityDefaultLineup(undefined,['community-a','community-b']),['community-a','community-b']);
});
test('older automatically generated defaults are repaired without overriding manual starters',()=>{
 const preferred=['community-a','community-b'];
 assert.deepEqual(repairCommunityDefaults('my-custom-player',preferred,preferred,false),['my-custom-player','community-a']);
 assert.deepEqual(repairCommunityDefaults('my-custom-player',preferred,preferred,true),preferred);
 assert.deepEqual(repairCommunityDefaults('my-custom-player',['my-other-player','community-a'],preferred,false),['my-other-player','community-a']);
 assert.deepEqual(repairCommunityDefaults(undefined,preferred,preferred,false),preferred);
});
