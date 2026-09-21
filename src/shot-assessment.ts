import {COURT,type PlayerState,type ShotIntent} from './engine/model';
import type {ShotContext} from './engine/shot-families';
import {executeShot} from './engine/execution';
import {generateTrajectory,sampleFlight} from './engine/trajectory';
export type ShotAssessment={risk:'Low'|'Medium'|'High';pressure:'Low'|'Medium'|'High'};
export type AssessmentContact={timing:'air'|'bounce'|null;actor:ShotIntent['actor'];context:ShotContext;players:PlayerState[]};
/** Coarse estimates, using fixed independent samples—not the match's hidden outcome seed. */
export function assessShot(intent:ShotIntent,context:ShotContext,players:PlayerState[]):ShotAssessment{
 const trajectory=generateTrajectory(intent,context,players);
 // Enough deterministic samples to distinguish occasional misses from routine risk.
 const sampleCount=128;let poor=0;
 for(let i=0;i<sampleCount;i++){
  const shot=executeShot(intent,context,players,{seed:(0x9e3779b9*(i+1))>>>0,balance:1});
  const serveFault=intent.type==='serve'&&shot.leg.bounceAtEnd&&(shot.actualEndpoint.x*context.contact.x>=0||Math.abs(shot.actualEndpoint.z)<=COURT.kitchen);
  if(shot.outcome==='net'||shot.outcome==='out'||serveFault||shot.mishit||shot.endpointError>.85)poor++;
 }
 // How much movement must the best-positioned defender make before a reachable contact?
 // Consider the whole incoming path, not just the landing, so easy volleys lower pressure.
 const team=players.find(p=>p.id===intent.actor)!.team;
 let demand=Infinity;
 for(const defender of players.filter(p=>p.team!==team)){
  for(let step=2;step<=12;step++){
   const fraction=step/12,point=sampleFlight(trajectory.leg,fraction);
   if(point.z*context.contact.z>=0||point.y>2.5)continue;
   if((intent.type==='serve'||context.opening==='return')&&fraction<1)continue;
   const distance=Math.max(0,Math.hypot(defender.position.x-point.x,defender.position.z-point.z)-.65);
   demand=Math.min(demand,distance/Math.max(.15,trajectory.leg.duration*fraction));
  }
 }
 const pace=Math.hypot(trajectory.leg.to.x-trajectory.leg.from.x,trajectory.leg.to.z-trajectory.leg.from.z)/trajectory.leg.duration;
 const pressure=demand+Math.max(0,pace-9)*.13;
 return {risk:poor/sampleCount<=.05?'Low':poor/sampleCount<=.20?'Medium':'High',pressure:pressure<1.6?'Low':pressure<3.6?'Medium':'High'};
}
export function assessChoice(choice:{intent:ShotIntent;timing?:'air'|'bounce'},point:{x:number;z:number;playerId?:ShotIntent['actor']},contacts:AssessmentContact[]):ShotAssessment|undefined{
 const contact=contacts.find(c=>c.actor===choice.intent.actor&&(c.timing??undefined)===choice.timing);
 if(!contact)return;
 const target:ShotIntent['target']=choice.intent.type==='serve'&&point.playerId?{kind:'player',playerId:point.playerId,aim:'body'}:{kind:'point',x:point.x,z:point.z};
 try{return assessShot({...choice.intent,target},{...contact.context,...(choice.intent.technique==='atp'?{attemptTechnique:true}:{})},contact.players)}catch{return;}
}
