import type {PublicMatch} from './protocol';
import {rivalryData} from './rivalry-view';
export type RivalryShareMatch=Pick<PublicMatch,'id'|'status'|'endedEarly'|'viewerTeam'|'score'|'rivalry'>;
/** Only explicit shared result facts enter text. Never serialize a match DTO. */
export function rivalryShareText(match:RivalryShareMatch,opponent:string,origin:string,includeGame=false):string {
 if(match.status!=='completed'||match.endedEarly||! /^[a-f0-9-]{36}$/i.test(match.id))throw Error('Finish a game before sharing its rivalry moment.');
 const base=new URL(origin);if(!['http:','https:'].includes(base.protocol))throw Error('Invalid share address.');
 const s=rivalryData(match.rivalry)?.atCompletion;
 if(!s||s.recent[0]?.matchId!==match.id)throw Error('Rivalry history is unavailable. Reopen the game and try again.');
 const you=match.score[match.viewerTeam],other=match.score[match.viewerTeam==='home'?'away':'home'];
 if(!Number.isSafeInteger(you)||!Number.isSafeInteger(other)||you<0||other<0||you===other||s.recent[0].score.you!==you||s.recent[0].score.opponent!==other)throw Error('Result and rivalry history do not agree.');
 const name=opponent.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'my friend';
 const result=you>other?`I beat ${name} ${you}–${other}`:`${name} beat me ${other}–${you}`;
 const series=s.wins===s.losses?`After this game, our series was tied ${s.wins}–${s.losses}.`:s.wins>s.losses?`After this game, I led our series ${s.wins}–${s.losses}.`:`After this game, ${name} led our series ${s.losses}–${s.wins}.`;
 const url=new URL(includeGame?`/?openplay=1&match=${encodeURIComponent(match.id)}`:'/?openplay=1',base.origin).href;
 return `${result} in PickleBash. ${series}\n${includeGame?'Rematch? Open our game (players only):':'Play PickleBash:'}\n${url}`;
}
export type ShareOutcome='shared'|'copied'|'cancelled';
export async function sendRivalryText(text:string,mode:'share'|'copy',io:{share?:(data:{title:string;text:string})=>Promise<void>;copy:(text:string)=>Promise<void>}):Promise<ShareOutcome>{
 if(mode==='share'&&io.share){try{await io.share({title:'PickleBash rivalry',text});return 'shared';}catch(e){if((e as {name?:string})?.name==='AbortError')return 'cancelled';throw e;}}
 await io.copy(text);return 'copied';
}
