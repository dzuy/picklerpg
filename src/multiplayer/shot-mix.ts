import {SHOT_TYPES,type ShotType} from '../engine/model';
import {publicStrategy,type FamilyMetric,type MatchStrategy,type SelectionStage} from './strategy';
export interface ShotMixFilter {scope:'recent'|'month'|'lifetime';opponent?:string;athlete?:string;stage:'all'|SelectionStage}
export interface ShotMixBucket {matches:number;available:number;complete:number;selections:number;families:Record<ShotType,FamilyMetric>;engineVersions:string[];ruleSets:string[]}
export interface ShotMixDashboard {definitionVersion:'shot-mix-1';filter:ShotMixFilter;totals:ShotMixBucket;recent:ShotMixBucket;previous:ShotMixBucket;opponents:Array<{id:string;name:string}>;athletes:Array<{id:string;name:string}>}
export function emptyShotMix():ShotMixBucket{return {matches:0,available:0,complete:0,selections:0,families:Object.fromEntries(SHOT_TYPES.map(t=>[t,{selected:0,eligible:0,selectedWhenEligible:0,executed:0,terminalPointsWon:0,terminalPointsLost:0}])) as Record<ShotType,FamilyMetric>,engineVersions:[],ruleSets:[]};}
export function addShotMix(bucket:ShotMixBucket,value:MatchStrategy|null,filter:ShotMixFilter,engine:string,rules:string){
 bucket.matches++;if(!value)return;
 const s=publicStrategy(value),athlete=filter.athlete?(Object.hasOwn(s.athletes,filter.athlete)?s.athletes[filter.athlete]:undefined):s;
 bucket.available++;if(s.coverage.complete)bucket.complete++;
 if(!athlete)return;
 const families=filter.stage==='all'?athlete.families:athlete.stages[filter.stage];
 for(const type of SHOT_TYPES){for(const key of Object.keys(bucket.families[type]) as Array<keyof FamilyMetric>)bucket.families[type][key]+=families[type][key];bucket.selections+=families[type].selected;}
 if(!bucket.engineVersions.includes(engine))bucket.engineVersions.push(engine);bucket.engineVersions.sort();
 if(!bucket.ruleSets.includes(rules))bucket.ruleSets.push(rules);bucket.ruleSets.sort();
}
