import test from 'node:test';
import assert from 'node:assert/strict';
import {DoublesScore,LOCAL_TEST_RULES,DEFAULT_RULES} from '../src/engine/scoring';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {SLOTS,parseCheckpoint} from '../src/engine/checkpoint';
import type {PlayerId,Team} from '../src/engine/model';
function game(scoring:'rally-doubles'|'side-out-doubles'='rally-doubles'){
 const m=new Match();m.scoringPreference=scoring;m.startLocalHumanMatch(Object.fromEntries(SLOTS.map(id=>[id,newPlayer(id)])) as Record<PlayerId,ReturnType<typeof newPlayer>>);return m;
}
test('rally scoring awards receivers, rotates by score parity, and uses one server',()=>{
 const s=new DoublesScore({...LOCAL_TEST_RULES,target:11});assert.equal(s.call,'0–0');
 s.award('home');assert.equal(s.server,'you');assert.equal(s.right.home,'partner');assert.equal(s.call,'1–0');
 s.award('away');assert.equal(s.score.away,1);assert.equal(s.serving,'away');assert.equal(s.right.away,'opponent-right');assert.equal(s.server,'opponent-right');assert.equal(s.call,'1–1');
 s.award('away');assert.equal(s.server,'opponent-right');assert.equal(s.right.away,'opponent-left');assert.equal(s.call,'2–1');
 s.award('home');assert.equal(s.server,'you');assert.equal(s.right.home,'you');assert.equal(s.call,'2–2');
});
test('receiving team can win at 3–2 without a freeze or extra serve',()=>{
 for(const team of ['home','away'] as Team[]){const s=new DoublesScore({...LOCAL_TEST_RULES});s.score={home:2,away:2};s.serving=team==='home'?'away':'home';s.award(team);assert.equal(s.winner,team);assert.equal(s.score[team],3);assert.throws(()=>s.award(team));}
 const sideout=new DoublesScore({...LOCAL_TEST_RULES,scoring:'side-out-doubles'});sideout.award('away');assert.deepEqual(sideout.score,{home:0,away:0});assert.equal(sideout.call,'0–0–1');
});
test('rally matches award exactly one point per completed rally and resume to completion',()=>{
 let m=game();let previous=0;
 for(let i=0;i<1000&&!m.scoring.winner;i++){
  if(m.state.phase==='complete'){const total=m.scoring.score.home+m.scoring.score.away;assert.equal(total,previous+1);previous=total;m.nextPoint();}
  const option=m.targetingMenu[i%m.targetingMenu.length];m.submitTurn({decisionId:m.decisionId,playerId:m.currentPlayer!,...option});
  m=Match.fromCheckpoint(JSON.parse(JSON.stringify(m.exportCheckpoint())));
 }
 assert.ok(m.scoring.winner);assert.equal(Math.max(m.scoring.score.home,m.scoring.score.away),3);assert.ok(m.point<=4);assert.equal(m.scoring.score.home+m.scoring.score.away,previous+1);
});
test('new-game preference does not rewrite active or saved match rules',()=>{
 const m=game('side-out-doubles');const before=m.exportCheckpoint();m.scoringPreference='rally-doubles';assert.deepEqual(m.exportCheckpoint(),before);assert.equal(Match.fromCheckpoint(before).scoring.rules.scoring,'side-out-doubles');
 const rally=game().exportCheckpoint();assert.equal(parseCheckpoint(rally).rules.scoring,'rally-doubles');rally.scoring.serverNumber=2;assert.throws(()=>parseCheckpoint(rally));
 m.startSoloMatch();assert.deepEqual(m.scoring.rules,{...DEFAULT_RULES,scoring:'rally-doubles'});
});
