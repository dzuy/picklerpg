import {validatePlayer,newPlayer,type Appearance} from '../player-design';
import {LOOKS} from '../player-looks';
import {teamDisplayName} from '../team-name';
import type {TeamSelection} from './invitation-protocol';
export interface LobbyTeam {id:string;manager:string;name:string;players:TeamSelection;starter:boolean;avatar:Appearance}
export interface TeamDirectory {self:LobbyTeam;teams:LobbyTeam[];friends:string[]}
export function defaultTeam(value:unknown):TeamSelection|null {
 try{if(!Array.isArray(value)||value.length!==2)return null;return value.map(validatePlayer) as TeamSelection}catch{return null}
}
/** A manager's profile identity is independent of their match lineup. */
export function profileAvatar(id:string,value:unknown):Appearance{
 if(value&&typeof value==='object')try{return validatePlayer({...newPlayer('profile'),appearance:value}).appearance}catch{}
 const hash=Array.from(id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 return {...LOOKS[hash%LOOKS.length].appearance};
}
export function lobbyTeam(id:string,manager:string,metadata:Record<string,unknown>):LobbyTeam{
 const handle=typeof metadata.username==='string'?metadata.username.trim().toLowerCase():'';
 if(/^[a-z0-9_]{3,24}$/.test(handle))manager=handle;
 const selected=defaultTeam(metadata.open_play_team);
 const players=selected??LOOKS.slice(0,2).map((look,i)=>({...newPlayer(`preset-${i}`),name:look.name,appearance:{...look.appearance},skills:{...look.skills}})) as TeamSelection;
 return {id,manager,avatar:profileAvatar(id,metadata.profile_avatar),name:teamDisplayName(manager,typeof metadata.team_name==='string'?metadata.team_name.slice(0,48):undefined),players,starter:!selected};
}
export function friendIds(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.filter((v):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v)))].slice(0,200):[]}
