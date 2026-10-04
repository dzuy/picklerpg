import type {PlayerId} from '../engine/model';
export const CHAT_LIMIT=500,CHAT_DURATION=5000,CHAT_COOLDOWN=3000;
export const TRASH_TALK_OPTIONS=['🔥','🤣','💀','😍','🤬','💩','🥶','🤡','🤪','👏','😎','👀','🎯','😤','🙌','🫡','🤝','🫠'];
export interface TrashTalk {id:string;player:PlayerId;text:string;version:number;createdAt:string;senderId?:string;matchId?:string|null}
export interface ChatCursor {time:string;id:string}
export interface TrashTalkFeed {messages:TrashTalk[];serverTime:string;conversationId?:string;opponentName?:string;replayMessages?:TrashTalk[];nextCursor?:ChatCursor|null;muted?:boolean;blocked?:boolean;blockedByYou?:boolean}
export function chatPreview(text:string){const chars=[...text];return chars.length>60?chars.slice(0,59).join('')+'…':text;}
export function cleanTrashTalk(input:string){
 return input.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').replace(/\s+/g,' ').trim();
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
