import {COURT,type PlayerId,type PlayerState,type ShotIntent,type ShotType} from './model';
import {contactIssue,type ShotContext,SHOT_FAMILIES} from './shot-families';
import {generateTrajectory} from './trajectory';
export interface DecisionOption {intent:ShotIntent;label:string;reason:string}
/** A small, deliberate menu from the actual contact, not from the selected shot. */
export function buildDecisionMenu(actor:PlayerId,c:ShotContext,players:PlayerState[]):DecisionOption[]{
 const deep=Math.abs(c.contact.z)>COURT.kitchen+1;
 const types:ShotType[]=c.opening==='serve'?['serve']:c.opening==='return'?['return']:c.contact.y>=SHOT_FAMILIES.overhead.minHeight?['overhead','lob']:c.contact.y<.65?(deep?['reset','drop','lob']:['dink','reset']):!c.bounced?(c.incomingSpeed>=10?['counter','block','volley']:['volley','block']):deep?['drive','drop','lob']:['dink','reset'];
 if(c.opening==='rally'&&!types.includes('lob'))types.push('lob');
 const options:DecisionOption[]=[];
 for(const type of types){
  if(contactIssue(type,c))continue;
  const soft=['reset','drop','dink','block'].includes(type),high=type==='overhead';
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'zone',zone:high?'open-court':type==='serve'?'crosscourt':'middle',depth:soft?'kitchen':'deep'},pace:soft?'soft':high||type==='drive'||type==='counter'?'fast':'medium',shape:high?'descending':soft||['serve','return','lob'].includes(type)?'arc':'flat',intendedNetClearance:type==='lob'?2.5:soft?.25:.12,tacticalIntent:high?'finish':soft?'neutralize':'pressure',aggression:high?.8:soft?.3:.6,source:'menu'};
  try{generateTrajectory(intent,c,players)}catch{continue}
  options.push({intent,label:SHOT_FAMILIES[type].name,reason:SHOT_FAMILIES[type].description});
 }
 // Change pace from a slow kitchen exchange, either after a bounce or out of the air.
 if(c.opening==='rally'&&c.twoBounceSatisfied&&!deep&&Math.abs(c.feet.z)<=COURT.kitchen+1.2&&c.incomingSpeed<6&&c.contact.y>=.65&&c.contact.y<SHOT_FAMILIES.overhead.minHeight){
  const type=c.bounced?'drive':'flick';
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'zone',zone:'middle',depth:'deep'},pace:'fast',shape:'flat',spin:{side:'none',vertical:'topspin',strength:'medium'},intendedNetClearance:.2,tacticalIntent:'pressure',aggression:.72,source:'menu'};
  if(!contactIssue(type,c))try{generateTrajectory(intent,c,players);options.push({intent,label:'Speed Up',reason:'Attack a higher dink with a compact topspin shot. Low clearance trades safety for pressure.'})}catch{}
 }
 if(c.opening==='return'){
  const base=options.find(o=>o.intent.type==='return');
  if(base){
   options.splice(options.indexOf(base),1);
   const variants:Array<{label:string;changes:Partial<ShotIntent>}>= [
    {label:'Drive',changes:{pace:'fast',shape:'flat',intendedNetClearance:.15,aggression:.7}},
    {label:'Topspin',changes:{spin:{side:'none',vertical:'topspin',strength:'strong'},intendedNetClearance:.35}},
    {label:'Slice',changes:{shape:'flat',spin:{side:'right',vertical:'slice',strength:'strong'},intendedNetClearance:.3}},
    {label:'Lob',changes:{pace:'soft',shape:'arc',intendedNetClearance:2.5,tacticalIntent:'sustain',aggression:.25}},
   ];
   for(const {label,changes} of variants){const intent={...structuredClone(base.intent),...changes};try{generateTrajectory(intent,c,players);options.push({intent,label,reason:label+' after the serve bounces.'})}catch{}}
  }
 }
 return options;
}
