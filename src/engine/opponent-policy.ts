import {COURT,type PlayerId,type PlayerState,type ShotIntent,type ShotType} from './model';
import {contactIssue,type ShotContext} from './shot-families';
import {generateTrajectory} from './trajectory';
export interface OpponentDecision {intent:ShotIntent;reason:string}
/** Ordered tactical rules; legality and trajectory feasibility gate every candidate. */
export function chooseOpponentShot(actor:PlayerId,context:ShotContext,players:PlayerState[]):OpponentDecision|null{
 const player=players.find(p=>p.id===actor);if(!player)throw new Error('Unknown opponent actor.');
 const attack=player.tendencies.aggression>=.5;
 const candidates:{type:ShotType;reason:string}[]=[];
 const add=(type:ShotType,reason:string)=>candidates.push({type,reason});
 if(context.opening==='serve')add('serve','Start diagonally with depth.');
 else if(context.opening==='return')add('return','Return deep to gain time to approach the kitchen.');
 else{
  if(context.contact.y>=1.9)add('overhead','High contact offers an overhead into open space.');
  if(context.contact.y<.65)add(Math.abs(context.contact.z)>COURT.kitchen+1?'reset':'dink','Low contact calls for a soft ball rather than an attack.');
  if(context.incomingSpeed>=10&&!context.bounced){
   if(attack&&player.skills.counter>=65&&context.contact.y>=.85)add('counter','An attackable contact and strong counter skill favor returning pressure.');
   add('block','Absorb incoming pace with a compact block.');
  }
  if(context.bounced&&Math.abs(context.contact.z)>COURT.kitchen+1){
   add(attack?'drive':'drop',attack?'Drive from depth to pressure the seam.':'Drop from depth to create time to advance.');
  }
  add('dink','Maintain a soft kitchen exchange.');add('volley','Use a controlled volley from this airborne contact.');add('reset','Recover with a soft reset.');add('lob','Lift the ball deep when lower trajectories are unavailable.');
 }
 for(const {type,reason} of candidates){
  if(contactIssue(type,context))continue;
  const soft=['drop','dink','reset','block'].includes(type),finish=type==='overhead';
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'zone',zone:finish?'open-court':type==='serve'?'crosscourt':player.tendencies.middlePreference>=.5?'middle':'crosscourt',depth:soft?'kitchen':'deep'},pace:soft?'soft':type==='serve'||type==='return'?'medium':'fast',shape:finish?'descending':soft||type==='return'||type==='serve'||type==='lob'?'arc':'flat',intendedNetClearance:soft?.25:.12,tacticalIntent:finish?'finish':soft?'neutralize':'pressure',aggression:player.tendencies.aggression,source:'ai'};
  try{generateTrajectory(intent,context,players);return {intent,reason}}catch{ /* Try the next legal, feasible tactical choice. */ }
 }
 return null;
}
