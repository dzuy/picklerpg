import {COURT,type FlightLeg,type PlayerState,type ShotIntent,type Vec3} from './model';
import {parseShotIntent} from './shot-intent';
import {resolveTarget} from './targeting';
import {buildFamilyFlight,SHOT_FAMILIES,type ShotContext} from './shot-families';
export interface GeneratedTrajectory {intent:ShotIntent; leg:FlightLeg; aimPoint:Vec3; apex:number; netClearance:number}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function sampleFlight(leg:FlightLeg,t:number):Vec3{
 const u=clamp(t),side=leg.sideCurve??0,vertical=leg.verticalSpin??0;
 return {x:leg.from.x+(leg.to.x-leg.from.x)*u+4*side*u*(1-u),z:leg.from.z+(leg.to.z-leg.from.z)*u,y:leg.from.y+(leg.to.y-leg.from.y)*u+4*leg.arc*u*(1-u)+8*vertical*u*u*(1-u)};
}
export function sampleFlightVelocity(leg:FlightLeg,t:number):Vec3{
 const u=clamp(t),side=leg.sideCurve??0,vertical=leg.verticalSpin??0;
 return {x:(leg.to.x-leg.from.x+4*side*(1-2*u))/leg.duration,z:(leg.to.z-leg.from.z)/leg.duration,y:(leg.to.y-leg.from.y+4*leg.arc*(1-2*u)+8*vertical*(2*u-3*u*u))/leg.duration};
}
function flightApex(leg:FlightLeg):number{
 const vertical=leg.verticalSpin??0,a=-24*vertical,b=-8*leg.arc+16*vertical,c=leg.to.y-leg.from.y+4*leg.arc,candidates=[0,1];
 if(Math.abs(a)<1e-10){if(Math.abs(b)>1e-10)candidates.push(-c/b)}else{const discriminant=b*b-4*a*c;if(discriminant>=0){const root=Math.sqrt(discriminant);candidates.push((-b-root)/(2*a),(-b+root)/(2*a))}}
 return Math.max(...candidates.filter(t=>t>=0&&t<=1).map(t=>sampleFlight(leg,t).y));
}
/** Deterministic intent-to-execution boundary. No randomness, skill effects or winner prediction. */
export function generateTrajectory(value:unknown,context:ShotContext,players:PlayerState[]):GeneratedTrajectory{
 const intent=parseShotIntent(value),family=SHOT_FAMILIES[intent.type];
 const actor=players.find(p=>p.id===intent.actor);if(!actor)throw new Error('Unknown hitter.');
 const resolved=resolveTarget(intent.target,{actor:intent.actor,contact:context.contact,players,shotType:intent.type});
 const base=buildFamilyFlight(intent.type,context,resolved.point,resolved.kind);
 const pace={soft:.7,medium:1,fast:1.3}[intent.pace];
 const tactical={pressure:1.05,advance:.9,neutralize:.8,finish:1.1,sustain:1}[intent.tacticalIntent];
 const aggression=.9+intent.aggression*.2;
 const strength={light:.55,medium:1,strong:1.7}[intent.spin?.strength??'medium'];
 const sideMagnitude=(intent.spin?.side==='none'||!intent.spin?.side)?0:.42*strength;
 const sideDirection=intent.spin?.side==='right'?1:-1;
 const sideCurve=sideMagnitude*sideDirection*Math.cos(actor.facing);
 const verticalSpin=intent.spin?.vertical==='topspin'?-.22*strength:intent.spin?.vertical==='slice'?.16*strength:0;
 const hangTime=intent.spin?.vertical==='slice'?1+.06*strength:intent.spin?.vertical==='topspin'?1-.025*strength:1;
 const duration=Math.max(.22,base.duration/(pace*tactical*aggression)*hangTime);
 const t=context.contact.z/(context.contact.z-resolved.point.z);
 const x=context.contact.x+(resolved.point.x-context.contact.x)*t+4*sideCurve*t*(1-t);
 const net=COURT.netCenter+(COURT.netSideline-COURT.netCenter)*(x/(COURT.width/2))**2;
 const straight=context.contact.y+(resolved.point.y-context.contact.y)*t;
 const spinHeight=8*verticalSpin*t*t*(1-t);
 const required=(net+Math.max(.06,intent.intendedNetClearance)-straight-spinHeight)/(4*t*(1-t));
 const shapeLift=intent.shape==='flat'?family.lift*.35:intent.shape==='descending'?0:family.lift*1.3;
 const arc=Math.max(0,shapeLift,required);
 // A descending request must actually start descending; never silently turn it into a lob.
 const leg:FlightLeg={...base,duration,arc,...(sideCurve?{sideCurve}:{}),...(verticalSpin?{verticalSpin}:{})};
 if(intent.shape==='descending'&&sampleFlightVelocity(leg,0).y>1e-8)throw new Error('A descending shot cannot reach this target with that clearance. Lower the clearance or choose an arc.');
 return {intent,leg,aimPoint:{...resolved.point},apex:flightApex(leg),netClearance:sampleFlight(leg,t).y-net};
}
/** Slice a generated spin curve at an interception without changing its curve or timing. */
export function interceptFlight(leg:FlightLeg,t:number):FlightLeg{
 if(!Number.isFinite(t)||t<=0||t>=1)throw new Error('Interception must be inside the flight.');
 const point=sampleFlight(leg,t),vertical=leg.verticalSpin??0;
 return {...leg,to:point,duration:leg.duration*t,arc:leg.arc*t*t-2*vertical*t*t+2*vertical*t*t*t,sideCurve:(leg.sideCurve??0)*t*t,verticalSpin:vertical*t*t*t,bounceAtEnd:false};
}
/** Simple rebound continuation for the required serve/return bounces. */
export function reboundFlight(leg:FlightLeg):FlightLeg{
 if(!leg.bounceAtEnd)throw new Error('Only a landing can rebound.');
 const dx=leg.to.x-leg.from.x,dz=leg.to.z-leg.from.z,length=Math.hypot(dx,dz);
 return {from:{...leg.to},to:{x:leg.to.x+dx/length*.45,y:.75,z:leg.to.z+dz/length*.45},duration:.38,arc:.2,sideCurve:(leg.sideCurve??0)*.2,verticalSpin:0};
}
