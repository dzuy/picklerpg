import {validatePlayer,type DesignedPlayer} from './player-design';
import {isValidTargetScore,type ScoringMode} from './engine/scoring';
import type {CourtLocation} from './locations';
import type {PlayerId} from './engine/model';
export interface SoloLaunch {players:Record<PlayerId,DesignedPlayer>;court:CourtLocation;scoring:ScoringMode;target:number}
export function parseSoloLaunch(value:unknown):SoloLaunch{
 const v=value as SoloLaunch;
 if(!v||!['forest','venice','arizona'].includes(v.court)||!['rally-doubles','side-out-doubles'].includes(v.scoring)||!isValidTargetScore(v.target))throw Error('Choose valid game settings.');
 const players=Object.fromEntries((['you','partner','opponent-left','opponent-right'] as const).map(slot=>[slot,validatePlayer(v.players?.[slot])])) as SoloLaunch['players'];
 return {players,court:v.court,scoring:v.scoring,target:v.target};
}
