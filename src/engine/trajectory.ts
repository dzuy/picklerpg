import {COURT,type FlightLeg,type PlayerState,type ShotIntent,type Vec3} from './model';
import {parseShotIntent} from './shot-intent';
import {resolveTarget} from './targeting';
import {buildFamilyFlight,SHOT_FAMILIES,type ShotContext} from './shot-families';
export interface GeneratedTrajectory {intent:ShotIntent; leg:FlightLeg; aimPoint:Vec3; apex:number; netClearance:number}
/** Deterministic intent-to-execution boundary. No randomness, skill effects or winner prediction. */
export function generateTrajectory(value:unknown,context:ShotContext,players:PlayerState[]):GeneratedTrajectory{
 const intent=parseShotIntent(value),family=SHOT_FAMILIES[intent.type];
 const actor=players.find(p=>p.id===intent.actor);if(!actor)throw new Error('Unknown hitter.');
 const resolved=resolveTarget(intent.target,{actor:intent.actor,contact:context.contact,players,shotType:intent.type});
 const base=buildFamilyFlight(intent.type,context,resolved.point,resolved.kind);
 const pace={soft:.7,medium:1,fast:1.3}[intent.pace];
 const tactical={pressure:1.05,advance:.9,neutralize:.8,finish:1.1,sustain:1}[intent.tacticalIntent];
 const aggression=.9+intent.aggression*.2;
 const duration=Math.max(.22,base.duration/(pace*tactical*aggression));
 const t=context.contact.z/(context.contact.z-resolved.point.z);
 const x=context.contact.x+(resolved.point.x-context.contact.x)*t;
 const net=COURT.netCenter+(COURT.netSideline-COURT.netCenter)*(x/(COURT.width/2))**2;
 const straight=context.contact.y+(resolved.point.y-context.contact.y)*t;
 const required=(net+Math.max(.06,intent.intendedNetClearance)-straight)/(4*t*(1-t));
 const shapeLift=intent.shape==='flat'?family.lift*.35:intent.shape==='descending'?0:family.lift*1.3;
 const arc=Math.max(0,shapeLift,required);
 // A descending request must actually start descending; never silently turn it into a lob.
 if(intent.shape==='descending'&&resolved.point.y-context.contact.y+4*arc>1e-8)throw new Error('A descending shot cannot reach this target with that clearance. Lower the clearance or choose an arc.');
 const leg:FlightLeg={...base,duration,arc};
 const peakT=arc>0?Math.max(0,Math.min(1,(resolved.point.y-context.contact.y+4*arc)/(8*arc))):0;
 const height=(u:number)=>context.contact.y+(resolved.point.y-context.contact.y)*u+4*arc*u*(1-u);
 return {intent,leg,aimPoint:{...resolved.point},apex:Math.max(height(0),height(1),height(peakT)),netClearance:height(t)-net};
}
/** Slice a generated parabola at an interception without changing its curve or timing. */
export function interceptFlight(leg:FlightLeg,t:number):FlightLeg{
 if(!Number.isFinite(t)||t<=0||t>=1)throw new Error('Interception must be inside the flight.');
 const point={x:leg.from.x+(leg.to.x-leg.from.x)*t,y:leg.from.y+(leg.to.y-leg.from.y)*t+4*leg.arc*t*(1-t),z:leg.from.z+(leg.to.z-leg.from.z)*t};
 return {...leg,to:point,duration:leg.duration*t,arc:leg.arc*t*t,bounceAtEnd:false};
}
/** Simple rebound continuation for the required serve/return bounces. */
export function reboundFlight(leg:FlightLeg):FlightLeg{
 if(!leg.bounceAtEnd)throw new Error('Only a landing can rebound.');
 const dx=leg.to.x-leg.from.x,dz=leg.to.z-leg.from.z,length=Math.hypot(dx,dz);
 return {from:{...leg.to},to:{x:leg.to.x+dx/length*.45,y:.75,z:leg.to.z+dz/length*.45},duration:.38,arc:.2};
}
