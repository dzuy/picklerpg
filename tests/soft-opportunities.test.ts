import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {uniformSkills} from '../src/game-evaluation';
import {generateTrajectory} from '../src/engine/trajectory';
import type {ShotIntent} from '../src/engine/model';
import type {ShotContext} from '../src/engine/shot-families';

test('soft placements respect requested clearance and short balls can bounce on either side',()=>{
 for(const actor of ['you','opponent-left'] as const)for(const type of ['drop','dink','reset','block'] as const){
  const m=new Match();m.playerAutonomy=true;m.partnerAutonomy=true;
  const side=actor==='you'?1:-1,players=structuredClone(m.state.players);
  for(const [i,p] of players.entries()){p.skills=uniformSkills(90);p.position={x:i%2?-1.4:1.4,y:0,z:p.team==='home'?2.8:-2.8}}
  const c:ShotContext={contact:{x:1.4,y:.6,z:side*(type==='dink'?2.5:5)},feet:{x:1.4,y:0,z:side*(type==='dink'?2.8:5.3)},bounced:type!=='block',opening:'rally',twoBounceSatisfied:true,incomingSpeed:8};
  players.find(p=>p.id===actor)!.position={...c.feet};
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'point',x:0,z:-side*1.25},pace:'soft',shape:'arc',intendedNetClearance:.25,tacticalIntent:'neutralize',aggression:.3,source:'ai'};
  for(const clearance of [.15,.25,.6])assert.ok(Math.abs(generateTrajectory({...intent,intendedNetClearance:clearance},c,players).netClearance-clearance)<1e-8);
  let bounces=0,air=0;
  for(let seed=0;seed<40;seed++){
   m.seed=seed;
   const shot=m['plan']({...intent,target:{kind:'point',x:(seed%5-2)*.7,z:-side*1.25}},'Reach regression',c,players,4),r=shot.resolution!;
   if(!r.receiver)continue;
   const p=shot.legs.at(-1)!.to,feet=shot.positions[r.receiver];
   assert.ok(Math.hypot(p.x-feet.x,p.z-feet.z)<=1.2+1e-9);
   if(r.bounced)bounces++;else air++;
  }
  assert.ok(bounces>20,`${actor} ${type} should allow short balls to bounce`);
  assert.ok(air>0,'reachable volleys remain available');
 }
});
