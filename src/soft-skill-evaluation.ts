import {Match} from './match';
import {uniformSkills,EVAL_SLOTS} from './game-evaluation';
import {newPlayer} from './player-design';
import {executeShot} from './engine/execution';
import {COURT,type ShotIntent} from './engine/model';
import type {ShotContext} from './engine/shot-families';

export const SOFT_OPENING_SKILLS=['serve','return','drop','dink','reset'] as const;
/** Same legal contacts and seeds; intended placement is evaluated before interception. */
export function evaluateSoftOpening(attribute:typeof SOFT_OPENING_SKILLS[number],skill:number,samples=2000){
 const players=structuredClone(new Match().state.players);
 for(const player of players)player.skills=uniformSkills(70);
 players[0].skills[attribute]=skill;
 // Lob accuracy uses drop skill, so test it separately from actual drops.
 const types=attribute==='drop'?['drop','lob'] as const:[attribute];
 return types.flatMap(type=>['prepared','pressure','wide'].map(condition=>{
  const serve=type==='serve',soft=['drop','dink','reset'].includes(type);
  const z=serve?7:type==='dink'?2.5:5;
  const pressured=condition==='pressure';
  const c:ShotContext={contact:{x:1.4,y:pressured&&!serve?.35:.8,z},feet:{x:pressured&&!serve?0:1.4,y:0,z:z+.3},bounced:!serve,opening:serve?'serve':type==='return'?'return':'rally',twoBounceSatisfied:!serve,incomingSpeed:serve?0:pressured?18:8,timingPressure:serve?0:pressured?.8:0};
  players[0].position={...c.feet};
  const intent:ShotIntent={schemaVersion:1,actor:'you',type,target:{kind:'point',x:condition==='wide'?-2.798:serve?-1.4:0,z:soft?-1.25:-5.6},pace:serve&&pressured?'fast':soft?'soft':'medium',shape:serve&&pressured?'flat':'arc',intendedNetClearance:type==='lob'?2.5:serve&&pressured?.12:soft?.25:.35,tacticalIntent:soft?'neutralize':'pressure',aggression:serve&&pressured?.8:soft?.3:.6,source:'ai'};
  let legal=0,inTarget=0,error=0,mishits=0;
  for(let seed=0;seed<samples;seed++){
   const e=executeShot(intent,c,players,{seed,balance:1});
   const p=e.actualEndpoint;
   const inCourt=e.outcome==='in'&&(!serve||(p.x*c.contact.x<0&&Math.abs(p.z)>COURT.kitchen+.037));
   legal+=Number(inCourt);
   inTarget+=Number(inCourt&&(soft?Math.abs(p.z)<COURT.kitchen:Math.abs(p.z)>4.5));
   error+=e.endpointError;mishits+=Number(e.mishit);
  }
  return {attribute,skill,type,condition,samples,legalRate:legal/samples,targetDepthRate:inTarget/samples,meanError:error/samples,mishitRate:mishits/samples};
 }));
}

/** Force the same opening dink in an existing practice setup, then use real auto-play.
 * Home starts every rally; compare ratings within this drill, not against a 50% baseline. */
export function evaluateDinkRallies(skill:number,samples=200){
 return (['wide','behind'] as const).map(pattern=>{
  let completed=0,wins=0,openingFaults=0,shots=0;
  for(let seed=0;seed<samples;seed++){
   const m=new Match();m.captureReplay=false;m.seed=10000+seed;m.playerAutonomy=true;m.partnerAutonomy=true;
   for(const slot of EVAL_SLOTS){const design=newPlayer(slot);design.skills=uniformSkills(70);if(slot==='you'||slot==='partner')design.skills.dink=skill;m.lineup[slot]='allCourt';m.substitutePlayer(slot,design)}
   m.startPractice(pattern);
   const intent=m.availableIntents.find(o=>o.type==='dink'&&o.target.kind==='zone'&&o.target.zone==='wide');
   if(!intent)throw new Error('The controlled practice opening must offer a wide dink.');
   m.submitIntent(intent);
   openingFaults+=Number(!!m.shot.resolution?.result&&m.shot.resolution.result.winner==='away');
   for(let step=0;step<10000&&m.state.phase!=='complete';step++)m.update(.1);
   if(m.state.phase==='complete'){completed++;wins+=Number(m.state.result?.winner==='home')}
   shots+=m.state.shotHistory.length;
  }
  return {pattern,skill,samples,completed,capped:samples-completed,homeWins:wins,homeWinRate:completed?wins/completed:null,openingFaultRate:openingFaults/samples,shots};
 });
}
