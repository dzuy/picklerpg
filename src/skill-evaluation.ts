import {Match} from './match';
import {uniformSkills} from './game-evaluation';
import {executeShot} from './engine/execution';
import {receptionTiming} from './engine/reception-timing';
import type {ShotIntent} from './engine/model';
import type {ShotContext} from './engine/shot-families';
/** Paired identical contacts isolate execution from shot selection and rally path. */
export function evaluateDrive(skill:number,samples=2000){
 const players=new Match().state.players.map(p=>({...structuredClone(p),skills:uniformSkills(70)}));players[0].skills.drive=skill;
 return ['comfortable','stretched','sideline'].map(condition=>{
  const c:ShotContext={contact:{x:1.4,y:condition==='stretched'?.4:.8,z:5},feet:{x:condition==='stretched'?0:1.4,y:0,z:5.3},bounced:true,opening:'rally',twoBounceSatisfied:true,incomingSpeed:8,timingPressure:condition==='stretched'?.7:0};players[0].position={...c.feet};
  const intent:ShotIntent={schemaVersion:1,actor:'you',type:'drive',target:{kind:'point',x:condition==='sideline'?2.798:0,z:-5.6},pace:'fast',shape:'flat',intendedNetClearance:.15,tacticalIntent:'pressure',aggression:.6,source:'ai'};
  let inCourt=0,mishits=0,error=0,quality=0;
  for(let seed=0;seed<samples;seed++){const e=executeShot(intent,c,players,{seed,balance:1});inCourt+=Number(e.outcome==='in');mishits+=Number(e.mishit);error+=e.endpointError;quality+=e.quality}
  return {condition,skill,samples,inCourtRate:inCourt/samples,mishitRate:mishits/samples,meanError:error/samples,meanQuality:quality/samples};
 });
}
/** Coverage over a fixed diagnostic grid, not a predicted match return percentage. */
export function evaluateMovement(skill:number){
 const p=structuredClone(new Match().state.players[0]);p.skills=uniformSkills(70);p.skills.movement=skill;
 let reachable=0,total=0,pressure=0;
 for(let d=0;d<=20;d++)for(let t=2;t<=20;t++)for(const speed of [8,16]){
  const timing=receptionTiming(p,d*.25,t*.125,speed,false);total++;reachable+=Number(timing.reachable);pressure+=timing.pressure;
 }
 return {skill,total,reachable,coverage:reachable/total,meanPressure:pressure/total};
}
/** Same incoming drives and defenders; only both receivers' movement changes. */
export function evaluateReceptions(skill:number,samples=200){
 let receptions=0,failed=0,pressure=0;
 for(let seed=0;seed<samples;seed++){
  const m=new Match();m.seed=seed;m.playerAutonomy=true;m.partnerAutonomy=true;
  const players=structuredClone(m.state.players);
  for(const [i,p] of players.entries()){p.skills=uniformSkills(70);if(p.team==='home')p.skills.movement=skill;p.position={x:i%2?-1.4:1.4,y:0,z:p.team==='home'?4:-4}}
  const intent:ShotIntent={schemaVersion:1,actor:'opponent-left',type:'drive',target:{kind:'point',x:(seed%5-2)*.9,z:5.6},pace:'fast',shape:'flat',intendedNetClearance:.15,tacticalIntent:'pressure',aggression:.6,source:'ai'};
  const c:ShotContext={contact:{x:1.4,y:.8,z:-4},feet:players[2].position,bounced:true,opening:'rally',twoBounceSatisfied:true,incomingSpeed:8};
  const shot=m['plan'](intent,'Controlled incoming drive',c,players,4);
  if(shot.resolution?.receiver){receptions++;pressure+=shot.resolution.timingPressure??0}else if(!['out','net'].includes(shot.resolution?.result?.reason??''))failed++;
 }
 return {skill,samples,receptions,failed,meanTimingPressure:receptions?pressure/receptions:null};
}
