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
 assert.equal(first.scoring,'rally-doubles');assert.equal(first.target,5);
});
test('signed-in quick match preserves the two default players',()=>{
 const team=[newPlayer('my-player'),newPlayer('my-partner')];
 const setup=quickSolo(pool,team,()=>.5);
 assert.deepEqual(setup.players.you,team[0]);assert.deepEqual(setup.players.partner,team[1]);
 assert.ok(pool.some(p=>p.id===setup.players['opponent-left'].id));
 assert.notEqual(setup.players['opponent-left'].id,setup.players['opponent-right'].id);
});
test('quick match begins with a human serve and rally scoring to five',()=>{
 const setup=quickSolo(pool,null),match=new Match();
 match.scoringPreference=setup.scoring;match.startSoloMatch(setup.target);match.partnerAutonomy=false;
 for(const slot of ['you','partner','opponent-left','opponent-right'] as const)match.substitutePlayer(slot,setup.players[slot]);
 match.reset();
 assert.equal(match.humanContact,true);assert.equal(match.state.currentHitter,'you');
 assert.equal(match.shot.intent.type,'serve');assert.equal(match.scoring.rules.scoring,'rally-doubles');
 assert.equal(match.scoring.rules.target,5);
});

test('quick solo finishes at five with a two-point lead, including after restore',()=>{
 const setup=quickSolo(pool,null),match=new Match();
 match.scoringPreference=setup.scoring;match.startSoloMatch(setup.target);
 const restored=Match.fromCheckpoint(match.exportCheckpoint());
 for(const game of [match,restored]){
  for(let i=0;i<3;i++){game.scoring.award('home');game.scoring.award('away')}
  game.scoring.award('home');assert.equal(game.scoring.winner,null);
  game.scoring.award('home');assert.equal(game.scoring.winner,'home');
  assert.deepEqual(game.scoring.score,{home:5,away:3});
 }
});
