import {COURT,type FlightLeg,type ShotType,type Vec3} from './model';
export interface ShotContext {erneEligible?:boolean;attemptTechnique?:boolean;timingPressure?:number;movementZ?:number;allowRisky?:boolean;contact:Vec3; feet:Vec3; bounced:boolean; opening:'serve'|'return'|'rally'; twoBounceSatisfied:boolean; incomingSpeed:number}
export interface ShotFamily {name:string; description:string; speed:number; lift:number; mode:'ground'|'volley'|'either'; minHeight:number; maxHeight:number}
/** Deliberately tuned for readable scripted play, not measured biomechanics. */
export const SHOT_FAMILIES:Record<ShotType,ShotFamily>={
 serve:{name:'Serve',description:'A controlled arc into the diagonal service box.',speed:7,lift:1.3,mode:'either',minHeight:.1,maxHeight:1.1},
 return:{name:'Return',description:'A deep, lofted reply that gives you time to advance.',speed:7.5,lift:1.8,mode:'ground',minHeight:.1,maxHeight:1.8},
 drive:{name:'Drive',description:'A fast, low ball that pressures the receiving team.',speed:14,lift:.5,mode:'either',minHeight:.15,maxHeight:1.7},
 drop:{name:'Drop',description:'A soft arc from deeper court, landing in the kitchen.',speed:5,lift:1.5,mode:'ground',minHeight:.1,maxHeight:1.5},
 dink:{name:'Dink',description:'A short, soft exchange from near the kitchen line.',speed:3.5,lift:.85,mode:'ground',minHeight:.1,maxHeight:1.2},
 flick:{name:'Flick',description:'A quick wrist-led airborne attack with topspin, controlled by volley skill and hands.',speed:12,lift:.45,mode:'volley',minHeight:.35,maxHeight:1.6},
 volley:{name:'Volley',description:'Take the ball out of the air with a compact punch.',speed:10,lift:.25,mode:'volley',minHeight:.45,maxHeight:1.9},
 reset:{name:'Reset',description:'Absorb pressure and lift a low ball softly into the kitchen.',speed:4.5,lift:1.5,mode:'either',minHeight:.08,maxHeight:1.5},
 lob:{name:'Lob',description:'A high, deep arc over the opponents’ reach.',speed:4.5,lift:4,mode:'either',minHeight:.08,maxHeight:3.2},
 overhead:{name:'Overhead Smash',description:'Strike a high contact down into open court.',speed:17,lift:.04,mode:'volley',minHeight:1.45,maxHeight:3.2},
 counter:{name:'Counter',description:'Redirect an incoming attack with a short, firm response.',speed:15,lift:.25,mode:'volley',minHeight:.65,maxHeight:1.8},
 block:{name:'Block',description:'Take pace off an incoming attack with a quiet paddle.',speed:5,lift:.9,mode:'volley',minHeight:.3,maxHeight:1.8},
};
export function contactIssue(type:ShotType,c:ShotContext):string|null{
 const family=SHOT_FAMILIES[type];
 if(!family) return 'Unknown shot family.';
 if(![c.contact.x,c.contact.y,c.contact.z,c.feet.x,c.feet.y,c.feet.z,c.incomingSpeed].every(Number.isFinite)||c.incomingSpeed<0)return 'Invalid contact data.';
 if(c.opening==='serve'&&type!=='serve')return 'Start the point with a serve.';
 if(type==='serve'){
  if(c.opening!=='serve')return 'A serve only starts a point.';
  if(Math.abs(c.feet.z)<=COURT.length/2)return 'Serve from behind the baseline.';
 }else{
  if(c.opening==='return'&&type!=='return')return 'Use the return family for this opening reply.';
  if(type==='return'&&c.opening!=='return')return 'A return follows the serve.';
  if(!c.bounced&&!c.twoBounceSatisfied)return 'Let the ball bounce during the two-bounce opening.';
  if(!c.attemptTechnique&&family.mode==='ground'&&!c.bounced)return 'Let this ball bounce before playing this shot.';
  if(!c.attemptTechnique&&family.mode==='volley'&&c.bounced)return 'This family takes the ball before its bounce.';
  if(!c.bounced&&Math.abs(c.feet.z)<=COURT.kitchen&&Math.abs(c.feet.x)<=COURT.width/2)return 'Move outside the kitchen before volleying.';
 }
 if(!c.attemptTechnique&&type==='dink'&&!c.allowRisky&&Math.abs(c.feet.z)>COURT.kitchen+1.2)return 'Use a drop or reset from this far back.';
 if(!c.attemptTechnique&&c.contact.y<family.minHeight)return `${family.name} needs a higher contact.`;
 if(!c.attemptTechnique&&c.contact.y>family.maxHeight)return `${family.name} needs a lower contact.`;
 if(!c.attemptTechnique&&(type==='counter'||type==='block')&&c.incomingSpeed<6)return 'This family responds to an incoming attack.';
 return null;
}
/** Family-level flight primitive. Caller supplies an already resolved landing point.
 * This does not resolve semantic targets or generate an unscripted rally. */
export function buildFamilyFlight(type:ShotType,c:ShotContext,landing:Vec3,endpoint:'landing'|'intercept'='landing',freeServeTarget=false):FlightLeg{
 const issue=contactIssue(type,c);if(issue)throw new Error(issue);
 if(![landing.x,landing.y,landing.z].every(Number.isFinite)||landing.y<0||landing.y>(endpoint==='landing'?.1:2.5)||c.contact.z*landing.z>=0||!freeServeTarget&&(Math.abs(landing.x)>COURT.width/2||Math.abs(landing.z)>COURT.length/2))throw new Error('Supply a landing point on the opposing court.');
 if(type==='serve'&&!freeServeTarget&&endpoint==='landing'&&(c.contact.x*landing.x>=0||Math.abs(landing.z)<=COURT.kitchen))throw new Error('Serve diagonally beyond the kitchen.');
 const family=SHOT_FAMILIES[type],t=c.contact.z/(c.contact.z-landing.z);
 const crossX=c.contact.x+(landing.x-c.contact.x)*t;
 const net=COURT.netCenter+(COURT.netSideline-COURT.netCenter)*(crossX/(COURT.width/2))**2;
 const straightHeight=c.contact.y+(landing.y-c.contact.y)*t;
 const lift=Math.max(family.lift,(net+.12-straightHeight)/(4*t*(1-t)));
 return {from:{...c.contact},to:{...landing},duration:Math.max(.12,Math.hypot(landing.x-c.contact.x,landing.z-c.contact.z)/family.speed),arc:lift,bounceAtEnd:endpoint==='landing'};
}
