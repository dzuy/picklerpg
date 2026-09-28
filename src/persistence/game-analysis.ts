import {gameplayRecord,mergeGameplayRecord,type GameplayRecord,type PlayedShot} from './gameplay-record';
import type {MatchCheckpoint} from '../engine/checkpoint';

export interface GameAnalysis {
 version:1;
 /** Older games may only have records from the point where recording began. */
 firstPoint:number;
 points:{index:number;complete:boolean;score:MatchCheckpoint['scoring']['score'];events:MatchCheckpoint['rally']['state']['rallyHistory'];telemetry?:GameplayRecord}[];
}
/** Keep executed contact/shot/bounce events, not hypothetical menu trajectories or replay frames. */
export function recordGameAnalysis(previous:GameAnalysis|undefined,checkpoint:MatchCheckpoint,played:PlayedShot[]=[]):GameAnalysis{
 const prior=previous?.points.find(p=>p.index===checkpoint.pointIndex);
 const point={telemetry:mergeGameplayRecord(prior?.telemetry,gameplayRecord(checkpoint,played)),index:checkpoint.pointIndex,complete:checkpoint.rally.kind==='point-end',score:structuredClone(checkpoint.scoring.score),events:structuredClone(checkpoint.rally.state.rallyHistory)};
 const points=[...(previous?.points??[])];
 const index=points.findIndex(p=>p.index===point.index);
 if(index<0)points.push(point);else points[index]=point;
 return {version:1,firstPoint:previous?.firstPoint??checkpoint.pointIndex,points};
}
