import type {PlayerId} from '../engine/model';
export const CHAT_LIMIT=40,CHAT_DURATION=5000,CHAT_COOLDOWN=3000;
export const TRASH_TALK_OPTIONS=['🔥','🤣','💀','😍','🤬','💩','🥶','🤡','🤪','👏','😎','👀','🎯','😤','🙌','🫡','🤝','🫠'];
export interface TrashTalk {id:string;player:PlayerId;text:string;version:number;createdAt:string}
export interface TrashTalkFeed {messages:TrashTalk[];serverTime:string}
// Whole-word matching avoids censoring innocent words such as “classic” and “pass”.
const profanity=/\b(?:motherfuck(?:er|ers|ing)?|fuck(?:s|ed|er|ers|ing)?|shit(?:s|ty|ting|head)?|bullshit|bitch(?:es|y|ing)?|ass(?:hole|holes)?|bastard(?:s)?|damn(?:ed|it)?|crap|piss(?:ed|ing)?|dick(?:s|head)?|cock(?:s)?|cunt(?:s)?|prick(?:s)?|wanker(?:s)?|twat(?:s)?|fag(?:got|gots|s)?|nigg(?:er|ers|a|as))\b/gi;
export function cleanTrashTalk(input:string){
 return input.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').replace(/\s+/g,' ').trim().replace(profanity,'!@#$%');
}
/** Messages before a move play at its start; replies to that move play after contact. */
export function replayTrashTalk(messages:TrashTalk[],version:number,time:number,contactTime=0){
 const latest=new Map<PlayerId,TrashTalk>();
 for(const message of messages){
  const start=message.version===version-1?0:message.version===version?contactTime:Infinity;
  if(time>=start&&time<start+CHAT_DURATION/1000)latest.set(message.player,message);
 }
 return [...latest.values()];
}
export function reactionReplayDuration(messages:TrashTalk[],version:number,contactTime:number){
 return messages.some(m=>m.version===version)?contactTime+CHAT_DURATION/1000:contactTime;
}
