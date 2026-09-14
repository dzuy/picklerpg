import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Match} from '../src/match';
import {uniformSkills} from '../src/game-evaluation';
import {generateTrajectory} from '../src/engine/trajectory';
import type {ShotIntent} from '../src/engine/model';
import type {ShotContext} from '../src/engine/shot-families';
const results=[];
for(const type of ['drop','dink','reset'] as const)for(const actor of ['you','opponent-left'] as const){
 let bounced=0,airborne=0,high=0,reach=0,faults=0,clearance=0;
 for(let seed=0;seed<200;seed++){
  const m=new Match();m.seed=seed;m.playerAutonomy=true;m.partnerAutonomy=true;
  const players=structuredClone(m.state.players),side=actor==='you'?1:-1;
  for(const [i,p] of players.entries()){p.skills=uniformSkills(90);p.position={x:i%2?-1.4:1.4,y:0,z:p.team==='home'?2.8:-2.8}}
  const c:ShotContext={contact:{x:1.4,y:.6,z:side*(type==='dink'?2.5:5)},feet:{x:1.4,y:0,z:side*(type==='dink'?2.8:5.3)},bounced:true,opening:'rally',twoBounceSatisfied:true,incomingSpeed:8};
  players.find(p=>p.id===actor)!.position={...c.feet};
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'point',x:(seed%5-2)*.7,z:-side*1.25},pace:'soft',shape:'arc',intendedNetClearance:.25,tacticalIntent:'neutralize',aggression:.3,source:'ai'};
  clearance+=generateTrajectory(intent,c,players).netClearance;
  const shot=m['plan'](intent,'Soft reception diagnostic',c,players,4),r=shot.resolution!;
  if(r.receiver){
   const contact=shot.legs.at(-1)!.to,feet=shot.positions[r.receiver];
   if(r.bounced)bounced++;else airborne++;
   high+=Number(!r.bounced&&contact.y>=1.45);
   reach+=Math.hypot(contact.x-feet.x,contact.z-feet.z);
  }else faults++;
 }
 results.push({type,actor,samples:200,meanNetClearance:clearance/200,bounced,airborne,highAirContacts:high,meanHorizontalReach:reach/(bounced+airborne||1),noReception:faults});
}
const out=resolve(process.argv[2]??'evaluation/soft-opportunities');mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,'results.json'),JSON.stringify(results,null,2));console.table(results);
