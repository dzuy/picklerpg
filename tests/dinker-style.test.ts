import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {ARCHETYPES,isDinkSpecialist} from '../src/engine/player-profiles';
import {SLOTS} from '../src/engine/checkpoint';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {OpponentMemory,tacticalSnapshot,localDecision} from '../src/engine/opponent-brain';
import type {ShotContext} from '../src/engine/shot-families';
function dinkerMatch(){const m=new Match(),p=newPlayer('dinker');p.skills={...ARCHETYPES.dinker.skills};for(const id of SLOTS)m.substitutePlayer(id,p);m.reset();m.brainMode='local';return {m,p};}
test('created Dinker stats retain soft-game tendencies in every slot and on reload',()=>{
 const {m,p}=dinkerMatch();for(const player of m.state.players)assert.deepEqual(player.tendencies,ARCHETYPES.dinker.tendencies);
 const restored=Match.fromCheckpoint(m.exportCheckpoint());assert.deepEqual(restored.state.players,m.state.players);
 restored.startLocalHumanMatch(Object.fromEntries(SLOTS.map(id=>[id,p])) as Parameters<Match['startLocalHumanMatch']>[0]);
 for(const player of restored.state.players)assert.deepEqual(player.tendencies,ARCHETYPES.dinker.tendencies);
 assert.ok(isDinkSpecialist({...p.skills,dink:90}));assert.equal(isDinkSpecialist(ARCHETYPES.lobber.skills),false);assert.equal(isDinkSpecialist(ARCHETYPES.banger.skills),false);
});
test('dinkers strongly favor legal dinks but still finish genuine overhead opportunities',()=>{
 const {m}=dinkerMatch();const state=m.snapshot();state.currentHitter='you';state.players[0].position={x:1,y:0,z:2.8};
 for(const height of [.75,2.6]){
  state.ball.position={x:1,y:height,z:2.6};state.ball.velocity={x:0,y:0,z:4};
  const c:ShotContext={contact:state.ball.position,feet:state.players[0].position,bounced:height<1,opening:'rally',twoBounceSatisfied:true,incomingSpeed:4};
  const options=buildDecisionMenu('you',c,state.players).map(o=>o.intent),s=tacticalSnapshot(state,options,new OpponentMemory(),'Chess Player',.8);
  let desired=0,soft=0;for(let seed=0;seed<100;seed++){const choice=options[localDecision(s,undefined,{seed,recent:[]})];if(choice.type===(height<1?'dink':'overhead'))desired++;if(['dink','reset'].includes(choice.type))soft++;}
  if(height<1)assert.ok(soft>=95,'patient kitchen exchanges should dominate');
  assert.ok(desired>=(height<1?60:80),`${height}: ${desired}/100 appropriate choices`);
 }
});
test('automatic dinkers let safe short balls bounce without changing manual reception choices',()=>{
 const {m,p}=dinkerMatch();m.playerAutonomy=true;m.partnerAutonomy=true;
 const players=structuredClone(m.state.players);for(const [i,p] of players.entries())p.position={x:i%2?-1.4:1.4,y:0,z:p.team==='home'?2.8:-2.8};
 const c:ShotContext={contact:{x:1.4,y:.6,z:-2.5},feet:{x:1.4,y:0,z:-2.8},bounced:true,opening:'rally',twoBounceSatisfied:true,incomingSpeed:4};
 let bounced=0;
 for(let seed=0;seed<30;seed++){m.seed=seed;const shot=m['plan']({schemaVersion:1,actor:'opponent-left',type:'dink',target:{kind:'point',x:0,z:1.25},pace:'soft',shape:'arc',intendedNetClearance:.25,tacticalIntent:'neutralize',aggression:.18,source:'ai'},'Dink exchange',c,players,4);if(shot.resolution?.bounced)bounced++;}
 assert.ok(bounced>=20,`${bounced}/30 bounced contacts`);
 m.startLocalHumanMatch(Object.fromEntries(SLOTS.map(id=>[id,p])) as Parameters<Match['startLocalHumanMatch']>[0]);
 m.seed=4;const manual=m['plan']({schemaVersion:1,actor:'opponent-left',type:'dink',target:{kind:'point',x:0,z:2.2},pace:'soft',shape:'arc',intendedNetClearance:.5,tacticalIntent:'neutralize',aggression:.18,source:'menu'},'Manual choice',c,players,4);
 assert.ok(manual.receptionChoice?.airborne);assert.ok(manual.receptionChoice?.bounced);

});
