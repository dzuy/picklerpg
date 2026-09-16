import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {generateTrajectory} from '../src/engine/trajectory';
import {planPositions} from '../src/engine/positioning';
import type {ShotContext} from '../src/engine/shot-families';
import type {ShotIntent} from '../src/engine/model';

test('low drops and dinks land promptly without changing their target or net clearance',()=>{
 const players=new Match().state.players;
 for(const type of ['drop','dink'] as const)for(const side of [1,-1]){
  const actor=side===1?'you':'opponent-left';
  const context:ShotContext={contact:{x:1,y:.6,z:side*(type==='drop'?5.8:2.5)},feet:{x:1,y:0,z:side*(type==='drop'?6:2.8)},bounced:true,opening:'rally',twoBounceSatisfied:true,incomingSpeed:6};
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'point',x:-1,z:-side*1.25},pace:'soft',shape:'arc',intendedNetClearance:.2,tacticalIntent:'neutralize',aggression:.3,source:'menu'};
  const low=generateTrajectory(intent,context,players),high=generateTrajectory({...intent,intendedNetClearance:1.2},context,players);
  assert.ok(low.leg.duration>=.55&&low.leg.duration<1.25,`${type}: ${low.leg.duration}s`);
  assert.deepEqual(low.aimPoint,{x:-1,y:.037,z:-side*1.25});assert.ok(Math.abs(low.netClearance-.2)<1e-8);
  assert.ok(high.leg.duration>low.leg.duration,'a lofted ball still needs longer to fall');
  const positioning={players,intent,endpoint:low.leg.to,receiver:null,completedShots:4};
  const quick=planPositions({...positioning,duration:low.leg.duration}),floating=planPositions({...positioning,duration:3});
  for(const player of players){
   const distance=(p:{x:number;z:number})=>Math.hypot(p.x-player.position.x,p.z-player.position.z);
   assert.ok(distance(quick[player.id])<=distance(floating[player.id])+1e-9,'recovery movement respects the shorter flight');
  }
 }
});
