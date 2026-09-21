import {popUpChance,popUpRoll} from './soft-contact';
import {skillBenchmark} from './skill-benchmarks';
import {contactDifficulty} from './difficulty';
import {COURT,type FlightLeg,type PlayerState} from './model';
import {generateTrajectory,interceptFlight,sampleFlight,type GeneratedTrajectory} from './trajectory';
import {contactIssue,type ShotContext} from './shot-families';
export interface ExecutionConditions {seed:number; balance:number}
export interface ShotExecution {popUp:boolean;intended:GeneratedTrajectory; leg:FlightLeg; seed:number; quality:number; skill:number; difficulty:string[]; mishit:boolean; dispersion:number; endpointError:number; outcome:'net'|'out'|'in'|'intercept'; actualEndpoint:FlightLeg['to']}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** A reproducible sample, independent of input source and rendering frame rate. */
export function executeShot(value:unknown,context:ShotContext,players:PlayerState[],conditions:ExecutionConditions):ShotExecution{
 if(!Number.isInteger(conditions.seed)||conditions.seed<0||conditions.seed>0xffffffff)throw new Error('Seed must be an unsigned 32-bit integer.');
 if(!Number.isFinite(conditions.balance)||conditions.balance<0||conditions.balance>1)throw new Error('Balance must be between zero and one.');
 const intended=generateTrajectory(value,context,players),intent=intended.intent;
 const hitter=players.find(p=>p.id===intent.actor)!;
 // An ATP needs both pace and very precise hands. A weakness in either limits the shot.
 const skill=intent.technique==='erne'?Math.min(hitter.skills.volley,hitter.skills.hands,hitter.skills.movement):intent.type==='flick'?Math.min(hitter.skills.volley,hitter.skills.hands):intent.technique==='atp'?Math.min(hitter.skills.drive,hitter.skills.hands):hitter.skills[intent.type==='lob'?'drop':intent.type==='block'?'volley':intent.type];
 if(!Number.isFinite(skill)||skill<0||skill>100)throw new Error('Skill must be between zero and 100.');
 const techniqueIssue=context.attemptTechnique?contactIssue(intent.type,{...context,attemptTechnique:false}):null;
 const difficulty=clamp(context.incomingSpeed/25);
 const lowContact=clamp((.8-context.contact.y)/.8);
 const contact=contactDifficulty(context,hitter);
 const timing=clamp(context.timingPressure??0);
 const handsPenalty=clamp(context.incomingSpeed/25)*(1-hitter.skills.hands/100)*(!context.bounced?.2:.1)+timing*.24;
 if(timing>.15)contact.labels.push('Late to the ball');
 // Extra-high lobs are harder to control in depth; this is a gameplay tuning cost.
 const lobRisk=(intent.type==='lob'||intent.type==='serve')?clamp((intent.intendedNetClearance-3)/4):0;
 if(lobRisk)contact.labels.push('High lob depth control');
 const specialDifficulty=intent.technique?clamp((100-skill)/60):0;
 if(specialDifficulty)contact.labels.push(intent.technique==='erne'?'Erne timing':'ATP timing');
 if(techniqueIssue)contact.labels.push(`Difficult technique: ${techniqueIssue}`);
 const quality=clamp(.2+.8*skill/100-.2*difficulty-.2*lowContact-.3*(1-conditions.balance)-contact.penalty-handsPenalty-.1*lobRisk-.25*specialDifficulty-(techniqueIssue?.65:0));
 const benchmark=skillBenchmark(skill);
 const pressure=clamp(.2*difficulty+.2*lowContact+.3*(1-conditions.balance)+contact.penalty+handsPenalty);
 // A steep, short landing needs finer distance control than a comfortable deep target.
 // The old model fitted an ideal arc to every spot but charged no extra control cost.
 const landing=intended.leg.bounceAtEnd;
 const depth=Math.abs(intended.aimPoint.z);
 const shortPlacement=landing?clamp((1.4-depth)/1.4):0;
 const edge=landing?clamp((.65-(COURT.width/2-Math.abs(intended.aimPoint.x)))/.65):0;
 const shortLob=landing&&intent.type==='lob'?clamp((COURT.kitchen+1-depth)/(COURT.kitchen+1)):0;
 const precisionDemand=shortPlacement*(.4+.6*edge)+shortLob;
 const controlCost=precisionDemand*(.35+.65*(1-skill/100));
 if(shortPlacement>.25)contact.labels.push('Tight net-side placement');
 if(shortLob>.25)contact.labels.push('Short lob depth control');
 const dispersion=benchmark.spread+pressure*benchmark.pressure+.35*specialDifficulty+controlCost*.9;
 const liftError=benchmark.lift+pressure*benchmark.pressure*.35+controlCost*.12;
 let seed=conditions.seed>>>0;
 const random=()=>{seed=(seed+0x6D2B79F5)>>>0;let n=Math.imul(seed^(seed>>>15),1|seed);n^=n+Math.imul(n^(n>>>7),61|n);return ((n^(n>>>14))>>>0)/4294967296*2-1};
 // Default players fail most ATP attempts. Elite drive and hands can make the shot
 // more reliable, but even a 100-rated player still misses roughly one in three.
 const specialFailureChance=intent.technique==='atp'?clamp(.9-Math.max(0,skill-40)*.009):intent.technique==='erne'?clamp(.65-Math.max(0,skill-40)*.008+timing*.15):0;
 const specialFailed=specialFailureChance>0&&(random()+1)/2<specialFailureChance;
 const techniqueFailed=!!techniqueIssue&&(random()+1)/2<.95;
 const mishit=techniqueFailed||specialFailed||(random()+1)/2<benchmark.mishit+pressure*benchmark.mishit*2+timing*(1-hitter.skills.hands/100)*.3;
 const errorScale=mishit?6:1;
 const leg=structuredClone(intended.leg);
 leg.to.x+=random()*dispersion*errorScale;leg.to.z+=random()*(dispersion+lobRisk*2)*errorScale;
 if(specialFailed&&intent.technique==='atp')leg.to.x=Math.sign(intended.aimPoint.x||context.contact.x)*(COURT.width/2+.12+Math.abs(random())*.8);
 if(!leg.bounceAtEnd)leg.to.y=Math.max(.037,leg.to.y+random()*dispersion*errorScale*.3);
 leg.arc=Math.max(0,leg.arc+random()*liftError*errorScale);
 leg.duration*=1+random()*(1-quality)*.15;
 const contactFailed=techniqueFailed||(specialFailed&&intent.technique==='erne');
 if(contactFailed){
  // A mistimed technique catches the ball poorly and sends it into the net.
  // Keep the real contact and requested intent; never replace it with a safe shot.
  const crossing=context.contact.z/(context.contact.z-intended.aimPoint.z);
  leg.to={x:context.contact.x+(intended.aimPoint.x-context.contact.x)*crossing,y:.25,z:0};
  leg.arc=0;leg.sideCurve=0;leg.verticalSpin=0;leg.duration=Math.max(.12,leg.duration*crossing);leg.bounceAtEnd=false;
 }
 const popUp=!contactFailed&&!mishit&&!!leg.bounceAtEnd&&popUpRoll(conditions.seed)<popUpChance(intent,context,hitter);
 if(popUp){
  // An open paddle face floats the ball higher and carries it deeper along the attempted lane.
  leg.arc+=1.05+(1-skill/100)*.65;
  leg.to.z+=Math.sign(intended.aimPoint.z)*(1.2+(1-skill/100)*.6);
  leg.duration=Math.max(leg.duration,Math.sqrt(8*(leg.arc+Math.abs(leg.verticalSpin??0))/9.81));
  contact.labels.push('Pop-up under pressure');
 }
 const actualEndpoint={...leg.to};
 const t=leg.from.z/(leg.from.z-leg.to.z),point=sampleFlight(leg,t),x=point.x;
 const height=point.y;
 const net=COURT.netCenter+(COURT.netSideline-COURT.netCenter)*(x/(COURT.width/2))**2;
 const hitsPost=intent.technique==='atp'&&Math.abs(Math.abs(x)-COURT.netWidth/2)<=.08&&height<=COURT.netSideline+.08;
 const hitsNet=t>0&&t<1&&(hitsPost||Math.abs(x)<=COURT.netWidth/2&&height-.037<=net);
 // A large execution error can leave the landing on the hitter's side. That is a
 // failed crossing, never an unreturned ball for the hitter who struck it.
 const out=leg.to.z*context.contact.z>=0||Math.abs(leg.to.x)>COURT.width/2+.037||Math.abs(leg.to.z)>COURT.length/2+.037;
 return {popUp,intended,leg:hitsNet?interceptFlight(leg,t):leg,seed:conditions.seed,quality,skill,difficulty:contact.labels,mishit,dispersion,endpointError:Math.hypot(leg.to.x-intended.aimPoint.x,leg.to.z-intended.aimPoint.z),outcome:contactFailed||hitsNet?'net':leg.bounceAtEnd?(out?'out':'in'):'intercept',actualEndpoint};
}
