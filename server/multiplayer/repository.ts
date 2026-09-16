import type {SupabaseClient} from '@supabase/supabase-js';
import type {MatchCheckpoint} from '../../src/engine/checkpoint';
import type {PointResult} from '../../src/engine/model';
import type {TurnAnimation} from '../../src/multiplayer/protocol';
import {ApiError,conflict,missing} from './errors';
export interface StoredMatch {friend_state?:'pending'|'accepted'|'cancelled';invited_name?:string;archived_home?:boolean;archived_away?:boolean;id:string;home_user_id:string;away_user_id:string|null;version:number;status:'active'|'completed';current_action_user_id:string|null;checkpoint:MatchCheckpoint&{court?:'forest'|'venice'|'arizona'};last_result:PointResult|null;animation:TurnAnimation[];creation_request_id:string;creation_hash:string;resolution_secret:string;seed_version:number;engine_version:string;created_at?:string;updated_at?:string;completed_at?:string|null}
export interface StoredReceipt {match_id:string;action_id:string;actor_id:string;request_hash:string;from_version:number;to_version:number;checkpoint:MatchCheckpoint&{court?:'forest'|'venice'|'arizona'};result:Pick<StoredMatch,'status'|'current_action_user_id'|'animation'|'last_result'>}
export interface CommitInput {match:StoredMatch;actor:string;hash:string;actionId:string;expectedVersion:number;action:unknown}
export interface MatchRepository {
 setArchived(id:string,actor:string,archived:boolean):Promise<void>;
 get(id:string,actor:string):Promise<StoredMatch|null>;
 list(actor:string):Promise<StoredMatch[]>;
 receipt(id:string,actionId:string):Promise<StoredReceipt|null>;
 create(row:StoredMatch):Promise<StoredMatch>;
 commit(input:CommitInput):Promise<StoredReceipt>;
}
function databaseError(error:any):never{if(['PT409','40001','23505'].includes(error?.code))throw conflict();if(error?.code==='P0002')throw missing();if(error?.code==='42501')throw new ApiError(403,'forbidden','That turn belongs to another player.');console.error('Match storage error code:',error?.code);throw new ApiError(503,'unavailable','Match storage is unavailable. Retry the same action.');}
export class SupabaseMatchRepository implements MatchRepository {
 constructor(private client:SupabaseClient){}
 async setArchived(id:string,actor:string,archived:boolean){const {error}=await this.client.rpc('set_async_match_archived',{p_id:id,p_actor:actor,p_archived:archived});if(error)databaseError(error);}
 async get(id:string,actor:string){const {data,error}=await this.client.from('async_matches').select('*').eq('id',id).or(`home_user_id.eq.${actor},away_user_id.eq.${actor}`).maybeSingle();if(error)databaseError(error);return data as StoredMatch|null;}
 async list(actor:string){
  const rows:StoredMatch[]=[];
  for(let offset=0;;offset+=100){const {data,error}=await this.client.from('async_matches').select('*').or(`home_user_id.eq.${actor},away_user_id.eq.${actor}`).order('updated_at',{ascending:false}).order('id').range(offset,offset+99);if(error)databaseError(error);rows.push(...data as StoredMatch[]);if(data.length<100)return rows;}
 }

 async receipt(id:string,actionId:string){const {data,error}=await this.client.from('async_match_actions').select('*').eq('match_id',id).eq('action_id',actionId).maybeSingle();if(error)databaseError(error);return data as StoredReceipt|null;}
 async create(row:StoredMatch){const {data,error}=await this.client.rpc('create_async_test_match',{p_match:row});if(error)databaseError(error);return data as StoredMatch;}
 async commit(input:CommitInput){const {data,error}=await this.client.rpc('commit_async_match_action',{p_match_id:input.match.id,p_actor:input.actor,p_action_id:input.actionId,p_request_hash:input.hash,p_expected_version:input.expectedVersion,p_checkpoint:input.match.checkpoint,p_current_actor:input.match.current_action_user_id,p_status:input.match.status,p_last_result:input.match.last_result,p_animation:input.match.animation,p_action:input.action});if(error)databaseError(error);return data as StoredReceipt;}
}
