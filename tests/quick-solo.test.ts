import test from 'node:test';
import assert from 'node:assert/strict';
import {quickSolo} from '../src/quick-solo';
import {newPlayer} from '../src/player-design';
import {Match} from '../src/match';
const pool=Array.from({length:8},(_,i)=>newPlayer('public-'+i));
test('guest quick match samples four different public players and random courts',()=>{
 const first=quickSolo(pool,null,()=>0),last=quickSolo(pool,null,()=>.999);
 assert.equal(new Set(Object.values(first.players).map(p=>p.id)).size,4);
 assert.equal(first.court,'forest');assert.equal(last.court,'arizona');
 assert.notDeepEqual(first.players,last.players);
 assert.equal(first.scoring,'side-out-doubles');assert.equal(first.target,5);
});
test('signed-in quick match preserves the two default players',()=>{
 const team=[newPlayer('my-player'),newPlayer('my-partner')];
 const setup=quickSolo(pool,team,()=>.5);
 assert.deepEqual(setup.players.you,team[0]);assert.deepEqual(setup.players.partner,team[1]);
 assert.ok(pool.some(p=>p.id===setup.players['opponent-left'].id));
 assert.notEqual(setup.players['opponent-left'].id,setup.players['opponent-right'].id);
});
test('quick match begins with a human serve and side-out scoring to five',()=>{
 const setup=quickSolo(pool,null),match=new Match();
 match.scoringPreference=setup.scoring;match.startSoloMatch(setup.target);match.partnerAutonomy=false;
 for(const slot of ['you','partner','opponent-left','opponent-right'] as const)match.substitutePlayer(slot,setup.players[slot]);
 match.reset();
 assert.equal(match.humanContact,true);assert.equal(match.state.currentHitter,'you');
 assert.equal(match.shot.intent.type,'serve');assert.equal(match.scoring.rules.scoring,'side-out-doubles');
 assert.equal(match.scoring.rules.target,5);
});
