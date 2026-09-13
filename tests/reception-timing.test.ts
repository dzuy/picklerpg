import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {ShotLab,labSetup} from '../src/shot-lab';
import {executeShot} from '../src/engine/execution';
import {receptionTiming,receptionRoll,swingMissChance} from '../src/engine/reception-timing';
test('movement and hands independently determine whether a rushed ball can be reached',()=>{
 const player=new Match().state.players[0];
 player.skills.movement=25;player.skills.hands=25;
 assert.equal(receptionTiming(player,2, .7,18,false).reachable,false);
 player.skills.movement=95;
 assert.equal(receptionTiming(player,2,.7,18,false).reachable,true);
 const slow=receptionTiming(player,.3,.35,20,false).pressure;
 player.skills.hands=95;
 assert.ok(receptionTiming(player,.3,.35,20,false).pressure<slow);
});
test('low hands produce many more swing misses across deterministic seeds',()=>{
 const player=new Match().state.players[0];
 const count=(hands:number)=>{player.skills.hands=hands;return Array.from({length:2000},(_,seed)=>receptionRoll(seed,player)<swingMissChance(player,.8,20)).filter(Boolean).length};
 const low=count(25),high=count(95);
 assert.ok(low>300);assert.ok(high<40);assert.ok(low>high*10);
 assert.equal(receptionRoll(42,player),receptionRoll(42,player));
});
test('late contacts increase actual mishits while prepared contacts stay more reliable',()=>{
 const lab=new ShotLab(),context=labSetup('drive').context;
 lab.state.players[0].skills.hands=30;
 const count=(timingPressure:number)=>Array.from({length:500},(_,seed)=>executeShot(lab.shot.intent,{...context,timingPressure},lab.state.players,{seed,balance:1}).mishit).filter(Boolean).length;
 assert.ok(count(1)>count(0)+60);
});
test('rally body attacks can hit slow defenders and never create a phantom return',async()=>{
 let bodyHits=0,misses=0;
 for(let seed=0;seed<80;seed++){
  const match=new Match();match.startPractice('counter');match.seed=seed*104729;
  for(const player of match.state.players){
   if(player.team==='away'){player.skills.hands=15;player.skills.movement=20}
   else player.skills.drive=95;
  }
  await match.submitCommand('Body bag the right player with a hard drive');
  assert.equal(match.state.phase,'flight',match.customStatus);
  const result=match.shot.resolution?.result;
  if(result?.reason==='body-hit'){
   bodyHits++;assert.equal(match.state.players.find(p=>p.id===result.playerId)?.team,'away');assert.equal(result.winner,'home');
   assert.equal(match.shot.resolution?.receiver,null);assert.equal(match.shot.receptionChoice,undefined);
  }
  if(result?.reason==='missed-swing'){misses++;assert.ok(match.shot.missedSwing);assert.equal(match.shot.resolution?.receiver,null)}
 }
 assert.ok(bodyHits>0,'body shots should sometimes hit a slow defender');
 assert.ok(misses>0,'some attempted returns should miss completely');
});
test('a missed swing animates the receiver without creating an outgoing ball',async()=>{
 const {athletePose}=await import('../src/athlete-motion');
 const match=new Match(),shot=structuredClone(match.shot),state=structuredClone(match.state);
 const player=state.players.find(p=>p.id==='opponent-left')!;
 shot.missedSwing={playerId:player.id,time:.3};
 state.phase='flight';state.legIndex=0;state.elapsed=.4;
 const pose=athletePose(player,state,shot);
 assert.equal(pose.style,'forehand');assert.equal(pose.reaction,'Late');
 assert.notEqual(pose.armX,.2);assert.notEqual(shot.actor,player.id);
});
