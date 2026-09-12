import {skillBenchmark} from './skill-benchmarks';
import {contactDifficulty} from './difficulty';
import {COURT,type FlightLeg,type PlayerState} from './model';
import {generateTrajectory,interceptFlight,type GeneratedTrajectory} from './trajectory';
import type {ShotContext} from './shot-families';
export interface ExecutionConditions {seed:number; balance:number}
export interface ShotExecution {intended:GeneratedTrajectory; leg:FlightLeg; seed:number; quality:number; skill:number; difficulty:string[]; mishit:boolean; dispersion:number; endpointError:number; outcome:'net'|'out'|'in'|'intercept'; actualEndpoint:FlightLeg['to']}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** A reproducible sample, independent of input source and rendering frame rate. */
export function executeShot(value:unknown,context:ShotContext,players:PlayerState[],conditions:ExecutionConditions):ShotExecution{
 if(!Number.isInteger(conditions.seed)||conditions.seed<0||conditions.seed>0xffffffff)throw new Error('Seed must be an unsigned 32-bit integer.');
 if(!Number.isFinite(conditions.balance)||conditions.balance<0||conditions.balance>1)throw new Error('Balance must be between zero and one.');
 const intended=generateTrajectory(value,context,players),intent=intended.intent;
 const hitter=players.find(p=>p.id===intent.actor)!;
 const skill=hitter.skills[intent.type==='lob'?'drop':intent.type==='block'?'volley':intent.type];
 if(!Number.isFinite(skill)||skill<0||skill>100)throw new Error('Skill must be between zero and 100.');
 const difficulty=clamp(context.incomingSpeed/25);
 const lowContact=clamp((.8-context.contact.y)/.8);
 const contact=contactDifficulty(context,hitter);
 const handsPenalty=!context.bounced?clamp(context.incomingSpeed/25)*(1-hitter.skills.hands/100)*.12:0;
 const quality=clamp(.2+.8*skill/100-.2*difficulty-.2*lowContact-.3*(1-conditions.balance)-contact.penalty-handsPenalty);
 const benchmark=skillBenchmark(skill);
 const pressure=clamp(.2*difficulty+.2*lowContact+.3*(1-conditions.balance)+contact.penalty+handsPenalty);
 const dispersion=benchmark.spread+pressure*benchmark.pressure;
 const liftError=benchmark.lift+pressure*benchmark.pressure*.35;
 let seed=conditions.seed>>>0;
 const random=()=>{seed=(seed+0x6D2B79F5)>>>0;let n=Math.imul(seed^(seed>>>15),1|seed);n^=n+Math.imul(n^(n>>>7),61|n);return ((n^(n>>>14))>>>0)/4294967296*2-1};
 const mishit=(random()+1)/2<benchmark.mishit+pressure*benchmark.mishit*2;
 const errorScale=mishit?6:1;
 const leg=structuredClone(intended.leg);
 leg.to.x+=random()*dispersion*errorScale;leg.to.z+=random()*dispersion*errorScale;
 if(!leg.bounceAtEnd)leg.to.y=Math.max(.037,leg.to.y+random()*dispersion*errorScale*.3);
 leg.arc=Math.max(0,leg.arc+random()*liftError*errorScale);
 leg.duration*=1+random()*(1-quality)*.15;
 const actualEndpoint={...leg.to};
 const t=leg.from.z/(leg.from.z-leg.to.z),x=leg.from.x+(leg.to.x-leg.from.x)*t;
 const height=leg.from.y+(leg.to.y-leg.from.y)*t+4*leg.arc*t*(1-t);
 const net=COURT.netCenter+(COURT.netSideline-COURT.netCenter)*(x/(COURT.width/2))**2;
 const hitsNet=t>0&&t<1&&Math.abs(x)<=COURT.netWidth/2&&height-.037<=net;
 const out=Math.abs(leg.to.x)>COURT.width/2+.037||Math.abs(leg.to.z)>COURT.length/2+.037;
 return {intended,leg:hitsNet?interceptFlight(leg,t):leg,seed:conditions.seed,quality,skill,difficulty:contact.labels,mishit,dispersion,endpointError:Math.hypot(leg.to.x-intended.aimPoint.x,leg.to.z-intended.aimPoint.z),outcome:hitsNet?'net':leg.bounceAtEnd?(out?'out':'in'):'intercept',actualEndpoint};
}
