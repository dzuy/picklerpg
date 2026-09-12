import {COURT,type PlayerId,type PlayerState,type ShotIntent,type ShotType} from './model';
import {contactIssue,type ShotContext,SHOT_FAMILIES} from './shot-families';
import {generateTrajectory} from './trajectory';
export interface DecisionOption {intent:ShotIntent;label:string;reason:string}
/** A small, deliberate menu from the actual contact, not from the selected shot. */
export function buildDecisionMenu(actor:PlayerId,c:ShotContext,players:PlayerState[]):DecisionOption[]{
 const deep=Math.abs(c.contact.z)>COURT.kitchen+1;
 const types:ShotType[]=c.opening==='serve'?['serve']:c.opening==='return'?['return']:c.contact.y>=1.9?['overhead','lob']:c.contact.y<.65?(deep?['reset','drop','lob']:['dink','reset']):!c.bounced?(c.incomingSpeed>=10?['counter','block','volley']:['volley','block']):deep?['drive','drop','lob']:['dink','reset'];
 const options:DecisionOption[]=[];
 for(const type of types){
  if(contactIssue(type,c))continue;
  const soft=['reset','drop','dink','block'].includes(type),high=type==='overhead';
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'zone',zone:high?'open-court':type==='serve'?'crosscourt':'middle',depth:soft?'kitchen':'deep'},pace:soft?'soft':high||type==='drive'||type==='counter'?'fast':'medium',shape:high?'descending':soft||['serve','return','lob'].includes(type)?'arc':'flat',intendedNetClearance:soft?.25:.12,tacticalIntent:high?'finish':soft?'neutralize':'pressure',aggression:high?.8:soft?.3:.6,source:'menu'};
  try{generateTrajectory(intent,c,players)}catch{continue}
  options.push({intent,label:SHOT_FAMILIES[type].name,reason:SHOT_FAMILIES[type].description});
 }
 return options;
}
