import {cleanTrashTalk} from './trash-talk';
import {validatePlayer,newPlayer,type Appearance} from '../player-design';
import {LOOKS} from '../player-looks';
import {teamDisplayName} from '../team-name';
import type {TeamSelection} from './invitation-protocol';
export interface LobbyTeam {id:string;manager:string;name:string;players:TeamSelection;starter:boolean;avatar:Appearance}
export interface TeamDirectory {self:LobbyTeam;teams:LobbyTeam[];friends:string[];communityIds?:string[]}
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
 let starter=newPlayer('starter');starter.name=manager.trim().slice(0,24)||'Player';
 try{if(metadata.starter_player)starter=validatePlayer(metadata.starter_player);}catch{}
 const players=selected??[starter,structuredClone(starter)] as TeamSelection;
 manager=cleanTrashTalk(manager);
 return {id,manager,avatar:profileAvatar(id,metadata.profile_avatar),name:teamDisplayName(manager,typeof metadata.team_name==='string'?cleanTrashTalk(metadata.team_name.slice(0,48)):undefined),players,starter:!selected};
}
export function friendIds(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.filter((v):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v)))].slice(0,200):[]}
