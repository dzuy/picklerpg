import type {RallyShot} from '../engine/model';
import type {MatchCheckpoint} from '../engine/checkpoint';
import {simulatedDupr} from '../engine/simulated-dupr';
import {sameShotIntent} from '../engine/shot-intent';

/** Increment when gameplay tuning changes so analysis can separate populations. */
export const GAMEPLAY_DEFINITION='gameplay-2026-09-28.1';
export interface PlayedShot {shotIndex:number;shot:RallyShot}
export function gameplayRecord(c:MatchCheckpoint,played:PlayedShot[]=[]){
 const events=structuredClone(c.rally.state.rallyHistory);
 const shots=events.filter(e=>e.type==='shot');
 const last=shots.at(-1),shot=c.rally.shot;
 const candidates=[...(last?[{shotIndex:last.shotIndex,shot}]:[]),...played];
 const executions=new Map<number,{shotIndex:number;contact:RallyShot['contact'];aimPoint:RallyShot['aimPoint'];legs:RallyShot['legs'];positions:RallyShot['positions'];feedback:RallyShot['feedback']|null;resolution:RallyShot['resolution']|null}>();
 for(const entry of candidates){if(!shots.some(e=>e.shotIndex===entry.shotIndex&&sameShotIntent(e.intent,entry.shot.intent)))continue;const s=entry.shot;executions.set(entry.shotIndex,structuredClone({shotIndex:entry.shotIndex,contact:s.contact,aimPoint:s.aimPoint,legs:s.legs,positions:s.positions,feedback:s.feedback??null,resolution:s.resolution??null}));}
 return {
  schemaVersion:1 as const,definitionVersion:GAMEPLAY_DEFINITION,engineVersion:c.engineVersion,
  gameId:c.matchId,pointIndex:c.pointIndex,revision:c.revision,court:null as string|null,endedEarly:false,
  rules:c.rules,score:c.scoring.score,complete:c.rally.kind==='point-end',gameComplete:!!c.scoring.winner,
  roster:Object.fromEntries(Object.entries(c.roster).map(([slot,p])=>[slot,{skills:p.skills,rating:simulatedDupr(p.skills),handedness:p.handedness,tendencies:p.tendencies}])),
  controllers:{playerAutonomy:c.solo.playerAutonomy,partnerAutonomy:c.solo.partnerAutonomy,brainMode:c.solo.brainMode,personality:c.solo.personality,intelligence:c.solo.intelligence},
  events,
  executions:[...executions.values()],
 };
}
export type GameplayRecord=ReturnType<typeof gameplayRecord>;
export function mergeGameplayRecord(previous:GameplayRecord|undefined,next:GameplayRecord):GameplayRecord{
 const executions=new Map(previous?.executions.map(e=>[e.shotIndex,e]));
 for(const entry of next.executions)executions.set(entry.shotIndex,entry);
 return {...next,executions:[...executions.values()].sort((a,b)=>a.shotIndex-b.shotIndex)};
}
