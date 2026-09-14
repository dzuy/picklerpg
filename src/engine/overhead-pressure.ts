import {COURT,type PlayerState,type ShotIntent,type Vec3} from './model';
import {generateTrajectory,reboundFlight,sampleFlight,sampleFlightVelocity} from './trajectory';
import {receptionTiming} from './reception-timing';

/** Estimate preparation available against an intended overhead. No execution seed,
 * error sample or hit/miss outcome is visible to this tactical heuristic. */
export function overheadPressure(intent:ShotIntent,contact:Vec3,players:PlayerState[],incomingSpeed:number){
 const actor=players.find(p=>p.id===intent.actor);
 if(intent.type!=='overhead'||!actor)return 0;
 let leg;
 try{leg=generateTrajectory(intent,{contact,feet:actor.position,bounced:false,opening:'rally',twoBounceSatisfied:true,incomingSpeed},players).leg}catch{return 0}
 const candidates=[{leg,offset:0,bounced:false}];
 if(leg.bounceAtEnd)candidates.push({leg:reboundFlight(leg),offset:leg.duration,bounced:true});
 let bestPreparationPressure=1;
 for(const candidate of candidates)for(let step=1;step<20;step++){
  const t=step/20,p=sampleFlight(candidate.leg,t);
  if(p.z*contact.z>=0||p.y<(candidate.bounced?.7:.3)||p.y>3.2)continue;
  const speed=Math.hypot(...Object.values(sampleFlightVelocity(candidate.leg,t)));
  for(const defender of players.filter(p=>p.team!==actor.team)){
   const side=defender.team==='home'?1:-1,lateral=p.x-defender.position.x;
   const feet={x:p.x-Math.sign(lateral||side)*Math.min(1,Math.max(.25,Math.abs(lateral)*.35)),z:candidate.bounced?p.z+side*.3:side*Math.max(Math.abs(p.z+side*.3),COURT.kitchen+.08)};
   if(Math.hypot(p.x-feet.x,p.z-feet.z)>1.2)continue;
   const timing=receptionTiming(defender,Math.hypot(feet.x-defender.position.x,feet.z-defender.position.z),candidate.offset+t*candidate.leg.duration,speed,candidate.bounced);
   if(timing.reachable)bestPreparationPressure=Math.min(bestPreparationPressure,timing.pressure);
  }
 }
 return bestPreparationPressure;
}
