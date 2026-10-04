import type {SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
import {uuid} from './validation';
export const REPORT_REASONS=['harassment','inappropriate_content','impersonation','other'] as const;
export class AccountSafetyService {
 constructor(private db:SupabaseClient,private verifyPassword:(email:string,password:string)=>Promise<string|null>){}
 private check(error:any){if(error)throw new ApiError(503,'safety_unavailable','Could not save this change. Please try again.');}
 async target(actor:string,input:any){
  if(input?.matchId&&uuid(input.matchId)){const {data:m,error}=await this.db.from('async_matches').select('home_user_id,away_user_id').eq('id',input.matchId).maybeSingle();this.check(error);if(m&&[m.home_user_id,m.away_user_id].includes(actor))return m.home_user_id===actor?m.away_user_id:m.home_user_id;throw new ApiError(404,'player_unavailable','This game is unavailable.');}
  if(input?.publicId&&uuid(input.publicId)){const {data,error}=await this.db.from('players').select('owner_id').eq('public_id',input.publicId).eq('is_public',true).maybeSingle();this.check(error);if(data)return data.owner_id as string;}
  if(input?.targetId&&uuid(input.targetId)){const {data,error}=await this.db.auth.admin.getUserById(input.targetId);if(!error&&data.user)return data.user.id;}
  throw new ApiError(404,'player_unavailable','This player is unavailable.');
 }
 async blocks(actor:string){const {data,error}=await this.db.from('player_blocks').select('blocked_id').eq('owner_id',actor);this.check(error);const blocked=await Promise.all((data??[]).map(async x=>{const {data:user}=await this.db.auth.admin.getUserById(x.blocked_id);const name=user.user?.user_metadata?.username??user.user?.user_metadata?.player_name;return {id:x.blocked_id,name:typeof name==='string'?name.slice(0,24):'Player'};}));return {blocked};}
 async block(actor:string,input:any){const target=await this.target(actor,input);if(actor===target||typeof input.blocked!=='boolean')throw new ApiError(400,'block','Choose another player.');const q=this.db.from('player_blocks');const {error}=input.blocked?await q.upsert({owner_id:actor,blocked_id:target},{onConflict:'owner_id,blocked_id'}):await q.delete().eq('owner_id',actor).eq('blocked_id',target);this.check(error);return {ok:true};}
 async report(actor:string,input:any){
  if(!input||!REPORT_REASONS.includes(input.reason)||typeof input.details!=='string'||input.details.trim().length>500)throw new ApiError(400,'report','Choose a reason and use at most 500 characters.');
  const target=await this.target(actor,input);if(target===actor)throw new ApiError(400,'report','Choose another player.');
  let evidence:unknown=null;
  if(input.messageId&&!input.matchId)throw new ApiError(400,'report','Choose a valid message.');
  if(input.matchId){
   if(!uuid(input.matchId)||(input.messageId&&!uuid(input.messageId)))throw new ApiError(400,'report','Choose a valid message.');
   const {data,error}=await this.db.rpc('player_chat_report_evidence',{p_match_id:input.matchId,p_actor:actor,p_message_id:input.messageId??null});
   if(error?.code==='P0002')throw new ApiError(404,'report','Message unavailable.');this.check(error);evidence=data;
  }
  if(input.publicId){const {data,error}=await this.db.from('players').select('name,catchphrase,appearance').eq('public_id',input.publicId).maybeSingle();this.check(error);evidence=data;}
  const {error}=await this.db.from('player_reports').insert({reporter_id:actor,target_id:target,public_id:input.publicId??null,reason:input.reason,details:input.details.trim(),evidence});this.check(error);return {ok:true};
 }
 async deletion(actor:string,input:any){
  if(!input||input.confirmation!=='DELETE'||typeof input.password!=='string'||input.password.length>128)throw new ApiError(400,'delete_account','Confirm deletion and enter your password.');
  const {data,error}=await this.db.auth.admin.getUserById(actor);if(error||!data.user)throw new ApiError(401,'delete_account','Sign in to your account first.');
  if(!data.user.is_anonymous&&(!data.user.email||await this.verifyPassword(data.user.email,input.password)!==actor))throw new ApiError(401,'delete_account','Check your password and try again.');
  // This authenticated request is durable even if provider cleanup is temporarily unavailable.
  const {error:requestError}=await this.db.from('account_deletion_requests').upsert({account_id:actor},{onConflict:'account_id',ignoreDuplicates:true});this.check(requestError);
  return {requested:true};
 }
}
