import type {SupabaseClient} from '@supabase/supabase-js';
import {CHAT_LIMIT,cleanTrashTalk,type TrashTalkFeed} from '../../src/multiplayer/trash-talk';
import {ApiError} from './errors';
import {uuid} from './validation';
export function parseTrashTalk(input:unknown){
 const value=input as {id?:unknown;text?:unknown};
 if(!value||typeof value!=='object'||typeof value.id!=='string'||!uuid(value.id)||typeof value.text!=='string'||[...value.text].length>CHAT_LIMIT)throw new ApiError(400,'chat',`Enter a message of 1–${CHAT_LIMIT} characters.`);
 const text=cleanTrashTalk(value.text);
 if(!text||[...text].length>CHAT_LIMIT)throw new ApiError(400,'chat',`Enter a message of 1–${CHAT_LIMIT} characters.`);
 return {id:value.id,text};
}
export class TrashTalkService {
 constructor(private client:SupabaseClient){}
 async feed(id:string,actor:string,beforeTime?:string|null,beforeId?:string|null){
  if((beforeTime||beforeId)&&(!beforeTime||!Number.isFinite(Date.parse(beforeTime))||!beforeId||!uuid(beforeId)))throw new ApiError(400,'chat_cursor','Invalid message cursor.');
  return this.call('get_player_chat',{p_match_id:id,p_actor:actor,p_before_time:beforeTime??null,p_before_id:beforeId??null});
 }
 async send(id:string,actor:string,input:unknown){const message=parseTrashTalk(input);return this.call('send_player_chat',{p_match_id:id,p_actor:actor,p_id:message.id,p_text:message.text});}
 async mute(id:string,actor:string,input:unknown){const value=input as {muted?:unknown};if(typeof value?.muted!=='boolean')throw new ApiError(400,'chat','Choose whether to mute this chat.');return this.call('set_player_chat_muted',{p_match_id:id,p_actor:actor,p_muted:value.muted});}
 private async call(name:string,args:Record<string,unknown>):Promise<TrashTalkFeed>{
  const {data,error}=await this.client.rpc(name,args);
  if(error){if(error.code==='PT410')throw new ApiError(403,'blocked','Messages are unavailable for this player.');if(error.code==='P0002')throw new ApiError(404,'not_found','Match not found.');if(error.code==='PT429')throw new ApiError(429,'chat_cooldown','Give it three seconds before your next message.');if(error.code==='PT409')throw new ApiError(409,'chat_conflict','That message was already sent.');throw new ApiError(503,'chat_unavailable',"Oh !@#$. This isn't working right now...");}
  return data as TrashTalkFeed;
 }
}
