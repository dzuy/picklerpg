import type {PlayerId,Team} from './model';
export type PlayMode='solo'|'local-human';
export type LocalPlayerId='player-a'|'player-b';
export type Controller={kind:'human';playerId:LocalPlayerId}|{kind:'cpu'};
export const teamOf=(slot:PlayerId):Team=>slot==='you'||slot==='partner'?'home':'away';
export const playerForTeam=(team:Team):LocalPlayerId=>team==='home'?'player-a':'player-b';
export const teamLabel=(team:Team)=>team==='home'?'Team A':'Team B';
export function controllersFor(mode:PlayMode,playerAutonomy:boolean,partnerAutonomy:boolean):Record<PlayerId,Controller>{
 if(mode==='local-human')return {you:{kind:'human',playerId:'player-a'},partner:{kind:'human',playerId:'player-a'},'opponent-left':{kind:'human',playerId:'player-b'},'opponent-right':{kind:'human',playerId:'player-b'}};
 return {you:playerAutonomy?{kind:'cpu'}:{kind:'human',playerId:'player-a'},partner:partnerAutonomy?{kind:'cpu'}:{kind:'human',playerId:'player-a'},'opponent-left':{kind:'cpu'},'opponent-right':{kind:'cpu'}};
}
/** World coordinates stay fixed. A 180-degree camera turn rotates both horizontal axes. */
export function viewerPoint<T extends {x:number;z:number}>(point:T,team:Team):T{return {...point,x:team==='home'?point.x:-point.x,z:team==='home'?point.z:-point.z};}
export function isOpposingTarget(point:{z:number},team:Team){return team==='home'?point.z<0:point.z>0;}
export const LOCAL_HUMAN_SKILL=70;
