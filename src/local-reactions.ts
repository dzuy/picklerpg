import type {MatchStorage} from './persistence/local-match-store';
import type {PlayerId} from './engine/model';
import type {Transport} from './multiplayer/match-session';
import {CHAT_LIMIT,CHAT_DURATION,cleanTrashTalk,type TrashTalk} from './multiplayer/trash-talk';
interface LocalReaction extends TrashTalk {at:number}
export interface ReactionContext {id:string;point:number;time:number;player:PlayerId}
/** Same reaction controls, with device-local delivery for computer-managed games. */
export class LocalReactions {
 constructor(private storage:MatchStorage,private owner:()=>string,private context:()=>ReactionContext){}
 private key(id:string){return `pickle-local-reactions-v1:${this.owner()}:${id}`}
 private read(id:string):LocalReaction[]{try{const data=JSON.parse(this.storage.getItem(this.key(id))??'[]');return Array.isArray(data)?data.filter(m=>m&&typeof m.id==='string'&&typeof m.text==='string'&&typeof m.createdAt==='string'&&Number.isFinite(m.at)&&Number.isInteger(m.version)&&['you','partner','opponent-left','opponent-right'].includes(m.player)).slice(-60):[]}catch{return []}}
 readonly request:Transport=async <T>(_token:string,path:string,body?:unknown):Promise<T>=>{
  const c=this.context();if(path!==`/api/matches/${c.id}/trash-talk`)throw new Error('This game has changed. Reopen reactions.');
  let messages=this.read(c.id);
  if(body){
   const draft=body as {id?:unknown;text?:unknown};if(typeof draft.id!=='string'||typeof draft.text!=='string')throw new Error('Enter a short message.');
   const text=cleanTrashTalk(draft.text);if(!text||[...text].length>CHAT_LIMIT)throw new Error(`Use 1–${CHAT_LIMIT} characters.`);
   if(!messages.some(m=>m.id===draft.id)){
    messages=[...messages,{id:draft.id,player:c.player,text,version:c.point,createdAt:new Date().toISOString(),at:c.time}].slice(-60);
    this.storage.setItem(this.key(c.id),JSON.stringify(messages));
   }
  }
  return {messages,serverTime:new Date().toISOString()} as T;
 };
 replay(id:string,point:number,time:number){const latest=new Map<PlayerId,TrashTalk>();for(const m of this.read(id))if(m.version===point&&time>=m.at&&time<m.at+CHAT_DURATION/1000*1.5)latest.set(m.player,m);return [...latest.values()];}
}
