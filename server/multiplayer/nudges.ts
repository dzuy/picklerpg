import type {SupabaseClient} from '@supabase/supabase-js';
import type {NudgeStatus,NudgeResult} from '../../src/multiplayer/nudge-protocol';
import type {TurnNotifier} from './push';
import {ApiError,missing} from './errors';
export class NudgeService {
 constructor(private client:SupabaseClient,private names:ReadonlyMap<string,string>,private notify?:TurnNotifier,readonly unlimited=false){}
 private async rpc(name:string,args:Record<string,unknown>){
  const {data,error}=await this.client.rpc(name,this.unlimited?{...args,p_unlimited:true}:args);
  if(error){if(error.code==='P0002')throw missing();throw new ApiError(503,'nudge_unavailable','Nudges are unavailable. Try again shortly.');}
  return data;
 }
 async status(id:string,actor:string):Promise<NudgeStatus>{
  const status=await this.rpc('get_match_nudge_status',{p_match_id:id,p_actor:actor}) as NudgeStatus;
  return this.notify?{...status,unlimited:this.unlimited}:{...status,state:'unavailable'};
 }
 async send(id:string,actor:string,input:unknown):Promise<NudgeResult>{
  const value=input as {expectedVersion?:unknown};
  if(!value||Array.isArray(value)||Object.keys(value).length!==1||!Number.isSafeInteger(value.expectedVersion)||(value.expectedVersion as number)<0)throw new ApiError(400,'nudge_request','Refresh the match before nudging.');
  if(!this.notify){await this.status(id,actor);throw new ApiError(503,'nudge_unavailable','Nudges are unavailable. Try again shortly.');}
  const {recipientUserId,...result}=await this.rpc('claim_match_nudge',{p_match_id:id,p_actor:actor,p_expected_version:value.expectedVersion}) as NudgeResult&{recipientUserId?:string};
  if(result.accepted&&recipientUserId){
   // The persistent claim is the retry boundary; delivery never changes game state.
   void Promise.resolve().then(()=>this.notify!({userId:recipientUserId,matchId:id,version:result.version,opponentName:this.names.get(actor)??'Your opponent'})).catch(()=>console.warn('Nudge delivery unavailable'));
  }
  return {...result,unlimited:this.unlimited};
 }
}
