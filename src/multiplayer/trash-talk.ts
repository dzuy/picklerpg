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
export function replayTrashTalk(messages:TrashTalk[],version:number,time:number){
 if(time<0||time>=CHAT_DURATION/1000)return [];
 const latest=new Map<PlayerId,TrashTalk>();
 for(const message of messages)if(message.version===version-1)latest.set(message.player,message);
 return [...latest.values()];
}
