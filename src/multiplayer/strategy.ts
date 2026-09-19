import type {ShotType} from '../engine/model';
export const STRATEGY_VERSION='strategy-2';
export type SelectionStage='serve'|'return'|'third'|'fourth'|'later'|'unknown';
export interface FamilyMetric {selected:number;eligible:number;selectedWhenEligible:number;executed:number;terminalPointsWon:number;terminalPointsLost:number}
export interface AthleteStrategy {selections:number;families:Record<ShotType,FamilyMetric>;stages:Record<SelectionStage,Record<ShotType,FamilyMetric>>}
/** Private to the choosing account; counts describe selections, not effectiveness. */
export interface MatchStrategy {
 definitionVersion:typeof STRATEGY_VERSION;
 coverage:{expectedSelections:number;recordedSelections:number;contextSelections:number;complete:boolean};
 selections:number;executed:number|null;
 athletes:Record<string,AthleteStrategy>;
 families:Record<ShotType,FamilyMetric>;
 stages:Record<SelectionStage,Record<ShotType,FamilyMetric>>;
 mix:{target:Record<string,number>;pace:Record<string,number>;spin:Record<string,number>;tactic:Record<string,number>};
 rallies:{sample:number;averageContacts:number|null;longestContacts:number|null};
 /** No stable movement-boundary definition has been captured yet. */
 kitchenEntries:null;
 attackOpportunities:{eligible:number;selected:number};
}

/** Explicit projection also validates cached summaries before they reach clients. */
export function publicStrategy(value:MatchStrategy):MatchStrategy {
 const n=(v:number)=>{if(!Number.isFinite(v)||v<0)throw Error('Invalid strategy count');return v;};
 const integer=(v:number)=>{n(v);if(!Number.isSafeInteger(v))throw Error('Invalid strategy count');return v;};
 const family=(v:FamilyMetric):FamilyMetric=>({selected:integer(v.selected),eligible:integer(v.eligible),selectedWhenEligible:integer(v.selectedWhenEligible),executed:integer(v.executed),terminalPointsWon:integer(v.terminalPointsWon),terminalPointsLost:integer(v.terminalPointsLost)});
 const fs=(v:Record<ShotType,FamilyMetric>)=>Object.fromEntries(['serve','return','drive','block','overhead','drop','dink','volley','reset','lob','counter','flick'].map(t=>[t,family(v[t as ShotType])])) as Record<ShotType,FamilyMetric>;
 const mix=(v:Record<string,number>)=>Object.fromEntries(Object.entries(v).map(([k,c])=>{if(k.length>80||!/^[a-z/-]+$/.test(k))throw Error('Invalid strategy category');return [k,integer(c)];}));
 if(value.definitionVersion!==STRATEGY_VERSION||typeof value.coverage.complete!=='boolean')throw Error('Invalid strategy definition');
 return {definitionVersion:STRATEGY_VERSION,athletes:Object.fromEntries(Object.entries(value.athletes).map(([id,a])=>{if(id.length>200)throw Error('Invalid athlete');return [id,{selections:integer(a.selections),families:fs(a.families),stages:Object.fromEntries(['serve','return','third','fourth','later','unknown'].map(t=>[t,fs(a.stages[t as SelectionStage])])) as AthleteStrategy['stages']}];})),coverage:{expectedSelections:integer(value.coverage.expectedSelections),recordedSelections:integer(value.coverage.recordedSelections),contextSelections:integer(value.coverage.contextSelections),complete:value.coverage.complete},selections:integer(value.selections),executed:value.executed===null?null:integer(value.executed),families:fs(value.families),stages:Object.fromEntries(['serve','return','third','fourth','later','unknown'].map(t=>[t,fs(value.stages[t as SelectionStage])])) as MatchStrategy['stages'],mix:{target:mix(value.mix.target),pace:mix(value.mix.pace),spin:mix(value.mix.spin),tactic:mix(value.mix.tactic)},rallies:{sample:integer(value.rallies.sample),averageContacts:value.rallies.averageContacts===null?null:n(value.rallies.averageContacts),longestContacts:value.rallies.longestContacts===null?null:integer(value.rallies.longestContacts)},kitchenEntries:null,attackOpportunities:{eligible:integer(value.attackOpportunities.eligible),selected:integer(value.attackOpportunities.selected)}};
}
