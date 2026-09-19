import {SHOT_TYPES,type ShotIntent,type ShotType} from '../../src/engine/model';
import {parseShotIntent} from '../../src/engine/shot-intent';
import {STRATEGY_VERSION,type MatchStrategy,type FamilyMetric,type SelectionStage} from '../../src/multiplayer/strategy';
import type {SelectionCapture} from './selection-events';
export interface StrategyEvent {action_id:string;to_version:number;chooser_id:string;team:'home'|'away';point_index:number|null;intent:ShotIntent;completeness:'complete'|'selected_only';capture:SelectionCapture|null;engine_version:string;athlete_design_id?:string|null}
export interface StrategySource {revision:number;expected:number;events:StrategyEvent[];summary?:MatchStrategy|null}
const stages:SelectionStage[]=['serve','return','third','fourth','later','unknown'];
const attacks:ShotType[]=['drive','flick','volley','overhead','counter'];
function families(){return Object.fromEntries(SHOT_TYPES.map(t=>[t,{selected:0,eligible:0,selectedWhenEligible:0,executed:0,terminalPointsWon:0,terminalPointsLost:0}])) as Record<ShotType,FamilyMetric>;}
function count(map:Record<string,number>,key:string){map[key]=(map[key]??0)+1;}
function context(e:StrategyEvent):SelectionCapture|null {
 const c=e.capture;
 if(e.completeness!=='complete'||!c||c.schemaVersion!==1||c.definitionVersion!=='selection-1')return null;
 if(!Number.isSafeInteger(c.completedContacts)||c.completedContacts<0||c.pointIndex!==e.point_index||!Array.isArray(c.offered)||!c.execution||typeof c.execution.selectedShotExecuted!=='boolean')return null;
 if(c.execution.selectedShotExecuted&&c.execution.contactOrdinal!==c.completedContacts+1)return null;
 try{for(const o of c.offered)parseShotIntent(o.intent);}catch{return null;}
 return c;
}
/** Deterministic reducer. Receipts/events stay private and never enter the public DTO. */
export function reduceStrategy(source:StrategySource,owner:string):MatchStrategy {
 const events=[...source.events].sort((a,b)=>a.to_version-b.to_version);
 if(new Set(events.map(e=>e.action_id)).size!==events.length||new Set(events.map(e=>e.to_version)).size!==events.length)throw Error('Duplicate strategy events');
 const s:MatchStrategy={definitionVersion:STRATEGY_VERSION,coverage:{expectedSelections:source.expected,recordedSelections:events.length,contextSelections:0,complete:false},selections:0,executed:null,athletes:{},families:families(),stages:Object.fromEntries(stages.map(t=>[t,families()])) as MatchStrategy['stages'],mix:{target:{},pace:{},spin:{},tactic:{}},rallies:{sample:0,averageContacts:null,longestContacts:null},kitchenEntries:null,attackOpportunities:{eligible:0,selected:0}};
 let ownContext=0,executed=0;const byPoint=new Map<number,StrategyEvent[]>();
 for(const e of events){
  const intent=parseShotIntent(e.intent),c=context(e);if(c)s.coverage.contextSelections++;
  if(c){const group=byPoint.get(c.pointIndex)??[];group.push(e);byPoint.set(c.pointIndex,group);}
  if(e.chooser_id!==owner)continue;
  s.selections++;
  const stage:SelectionStage=c?(stages[Math.min(c.completedContacts,4)]):'unknown';
  const f=s.families[intent.type],sf=s.stages[stage][intent.type];f.selected++;sf.selected++;
  count(s.mix.target,intent.target.kind==='zone'?`${intent.target.zone}/${intent.target.depth}`:intent.target.kind==='player'?`player/${intent.target.aim}`:'point');
  count(s.mix.pace,intent.pace);count(s.mix.tactic,intent.tacticalIntent);
  count(s.mix.spin,intent.spin?`${intent.spin.vertical}/${intent.spin.side}/${intent.spin.strength}`:'unspecified');
  if(!c)continue;ownContext++;
  const offered=new Set(c.offered.map(o=>o.intent.type));
  for(const t of offered){s.families[t].eligible++;s.stages[stage][t].eligible++;}
  if(offered.has(intent.type)){f.selectedWhenEligible++;sf.selectedWhenEligible++;}
  if(attacks.some(t=>offered.has(t))){s.attackOpportunities.eligible++;if(attacks.includes(intent.type)&&offered.has(intent.type))s.attackOpportunities.selected++;}
  if(c.execution.selectedShotExecuted){executed++;f.executed++;sf.executed++;}
 }
 const allRecorded=events.length===source.expected&&events.every((e,i)=>e.to_version===i+1);
 s.executed=allRecorded&&ownContext===s.selections?executed:null;
 s.coverage.complete=allRecorded&&s.coverage.contextSelections===events.length;
 // Only complete point chains are used. A failed reply ends the preceding contact,
 // so attribute that association to its actual selector rather than the failed reply.
 const lengths:number[]=[];
 for(const group of byPoint.values()){
  let ordinal=0,valid=true;const contacts=new Map<number,StrategyEvent>();let terminal:SelectionCapture['execution']|null=null;
  for(const e of group){const c=context(e)!;if(terminal||c.completedContacts!==ordinal){valid=false;break;}if(c.execution.selectedShotExecuted){ordinal++;contacts.set(ordinal,e);}if(c.execution.pointResult)terminal=c.execution;}
  if(!valid||!terminal||terminal.terminalContactOrdinal!==ordinal)continue;
  lengths.push(ordinal);
  const last=contacts.get(ordinal);if(!last||last.chooser_id!==owner)continue;
  const key=terminal.pointResult!.winner===last.team?'terminalPointsWon':'terminalPointsLost';
  s.families[last.intent.type][key]++;
  const c=context(last)!;s.stages[stages[Math.min(c.completedContacts,4)]][last.intent.type][key]++;
 }
 if(lengths.length)s.rallies={sample:lengths.length,averageContacts:lengths.reduce((a,b)=>a+b,0)/lengths.length,longestContacts:Math.max(...lengths)};
 // Reuse the same definitions for one athlete; other choices still preserve
 // complete point chains but are not attributed to this athlete.
 if(owner!=='__athlete__')for(const id of [...new Set(events.filter(e=>e.chooser_id===owner).map(e=>e.athlete_design_id??'__unknown__'))].sort()){
  const subset=reduceStrategy({...source,events:events.map(e=>({...e,chooser_id:e.chooser_id===owner&&(e.athlete_design_id??'__unknown__')===id?'__athlete__':'__other__'}))},'__athlete__');
  Object.defineProperty(s.athletes,id,{value:{selections:subset.selections,families:subset.families,stages:subset.stages},enumerable:true,writable:true,configurable:true});
 }
 return s;
}
export type StrategyRpc=(name:string,args:Record<string,unknown>)=>Promise<any>;
export async function loadStrategy(rpc:StrategyRpc,id:string,actor:string,force=false):Promise<MatchStrategy|null>{
 for(let retry=0;retry<2;retry++){
  const source=await rpc('get_async_strategy_source',{p_match:id,p_actor:actor,p_definition:force?'rebuild':STRATEGY_VERSION}) as StrategySource|null;
  if(!source)return null;if(source.summary)return source.summary;
  const summary=reduceStrategy(source,actor);
  if(await rpc('save_async_strategy',{p_match:id,p_actor:actor,p_revision:source.revision,p_summary:summary}))return summary;
 }
 throw Error('Strategy history changed during rebuild');
}
