import type {RematchStatus} from '../../src/multiplayer/rematch-protocol';
import {isValidTargetScore} from '../../src/engine/scoring';
import {randomUUID} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {validatePlayer} from '../../src/player-design';
import type {Invitation,InviteRequest,TeamSelection} from '../../src/multiplayer/invitation-protocol';
import type {StoredMatch} from './repository';
import {MatchService,publicMatch} from './service';
import {uuid,requestHash} from './validation';
import {ApiError,missing} from './errors';
export function parseTeam(value:unknown):TeamSelection {
 if(!Array.isArray(value)||value.length!==2)throw new ApiError(400,'team','Choose your player and partner.');
 try{return value.map(validatePlayer) as TeamSelection}catch{throw new ApiError(400,'team','Choose a valid player for each team slot.');}
}
export interface InviteRow {id:string;creator_id:string;recipient_id:string;team:TeamSelection;court:'forest'|'venice'|'arizona';points_limit?:number;scoring:InviteRequest['scoring'];status:Invitation['status'];created_at:string;match_id:string|null;request_id:string;request_hash:string;accept_hash?:string}
export type CloseInvitationAction='decline'|'cancel'|'delete';
export interface InviteRepository {rematchFor?(source:string,actor:string):Promise<InviteRow|null>;rematch(source:string,actor:string,row:InviteRow):Promise<InviteRow>;close(id:string,actor:string,action:CloseInvitationAction):Promise<InviteRow>;list(actor:string):Promise<InviteRow[]>;get(id:string,actor:string):Promise<InviteRow|null>;create(row:InviteRow):Promise<InviteRow>;accept(id:string,actor:string,hash:string,match:StoredMatch):Promise<StoredMatch>}
export class SupabaseInviteRepository implements InviteRepository {
 constructor(private client:SupabaseClient){}
 private check(error:any){if(error)throw new ApiError(error.code==='PT409'?409:503,'invitation',error.code==='PT409'?'This invitation has changed. Refresh to see its current status.':'Invitations are temporarily unavailable. Try again.');}
 async rematchFor(source:string,actor:string){const {data,error}=await this.client.from('async_invitations').select('*').eq('rematch_of',source).or(`creator_id.eq.${actor},recipient_id.eq.${actor}`).maybeSingle();this.check(error);return data as InviteRow|null;}
 async rematch(source:string,actor:string,row:InviteRow){const {data,error}=await this.client.rpc('create_async_rematch',{p_source:source,p_actor:actor,p_invite:row});this.check(error);return data as InviteRow}
 async close(id:string,actor:string,action:CloseInvitationAction){const {data,error}=await this.client.rpc('close_async_invitation',{p_id:id,p_actor:actor,p_action:action});this.check(error);return data as InviteRow}
 async list(actor:string){const {data,error}=await this.client.from('async_invitations').select('*').or(`creator_id.eq.${actor},recipient_id.eq.${actor}`).in('status',['pending','declined']).order('created_at',{ascending:false});this.check(error);return (data as InviteRow[]).filter(i=>i.status==='pending'||i.creator_id===actor)}
 async get(id:string,actor:string){const {data,error}=await this.client.from('async_invitations').select('*').eq('id',id).or(`creator_id.eq.${actor},recipient_id.eq.${actor}`).maybeSingle();this.check(error);return data as InviteRow|null}
 async create(row:InviteRow){const {data,error}=await this.client.rpc('create_async_invitation',{p_invite:row});this.check(error);return data as InviteRow}
 async accept(id:string,actor:string,hash:string,match:StoredMatch){const {data,error}=await this.client.rpc('accept_async_invitation',{p_id:id,p_actor:actor,p_hash:hash,p_match:match});this.check(error);return data as StoredMatch}
}
export class InvitationService {
 constructor(private repo:InviteRepository,private matches:MatchService,private names:ReadonlyMap<string,string>,private resolveTeam:(team:TeamSelection)=>Promise<TeamSelection>=async team=>team,private onCreated?:(invite:Invitation)=>Promise<void>){}
 private view(r:InviteRow):Invitation{return {id:r.id,creatorId:r.creator_id,recipientId:r.recipient_id,creatorName:this.names.get(r.creator_id)??'Player',recipientName:this.names.get(r.recipient_id)??'Player',team:r.team,court:r.court,scoring:r.scoring,target:r.points_limit??3,status:r.status,createdAt:r.created_at,matchId:r.match_id}}
 async list(actor:string){return (await this.repo.list(actor)).map(r=>this.view(r))}
 async get(id:string,actor:string){const r=await this.repo.get(id,actor);if(!r)throw missing();return this.view(r)}
 async close(id:string,actor:string,action:CloseInvitationAction){const r=await this.repo.get(id,actor);if(!r)throw missing();if((action==='decline'?r.recipient_id:r.creator_id)!==actor)throw new ApiError(403,'invitation','This action is not available to you.');return this.view(await this.repo.close(id,actor,action))}
 async create(actor:string,input:any){
  if(!input||Object.keys(input).some(k=>!['requestId','opponentId','team','court','scoring','target'].includes(k))||!uuid(input.requestId)||!uuid(input.opponentId)||input.opponentId===actor||!['forest','venice','arizona'].includes(input.court)||!['rally-doubles','side-out-doubles'].includes(input.scoring))throw new ApiError(400,'invitation','Choose a player, team, court, and scoring.');
  if(input.target!==undefined&&!isValidTargetScore(input.target))throw new ApiError(400,'invitation','Choose a points limit from 1 to 99.');
  if(!this.matches.config(actor).creationEnabled||!this.names.has(input.opponentId))throw new ApiError(403,'invitation','This player cannot be invited.');
  const parsed=parseTeam(input.team),normalized={...input,team:parsed},team=await this.resolveTeam(parsed);const row=await this.repo.create({id:randomUUID(),creator_id:actor,recipient_id:input.opponentId,team,court:input.court,scoring:input.scoring,points_limit:input.target??3,status:'pending',created_at:new Date().toISOString(),match_id:null,request_id:input.requestId,request_hash:requestHash(normalized)});
  return this.created(row,actor);
 }
 private async created(row:InviteRow,actor:string){
  if(row.status==='pending'&&this.onCreated){
   try{await this.onCreated(this.view(row));}catch{console.warn('Automatic invitation acceptance deferred to bot worker.');}
   return this.get(row.id,actor);
  }
  return this.view(row);
 }
 async rematchStatus(source:string,actor:string):Promise<RematchStatus>{
  await this.matches.get(source,actor);
  if(!this.repo.rematchFor)throw new ApiError(503,'rematch','Rematch status is unavailable.');
  const row=await this.repo.rematchFor(source,actor);
  return row?{invitationId:row.id,matchId:row.match_id,requesterId:row.creator_id,status:row.status}:{invitationId:null,matchId:null,requesterId:null,status:'none'};
 }
 async rematch(source:string,actor:string){
  const game=await this.matches.get(source,actor);
  if(game.status!=='completed')throw new ApiError(409,'rematch','Finish this game before requesting a rematch.');
  if(!this.matches.config(actor).creationEnabled)throw new ApiError(403,'rematch','New games are not available for this account.');
  const team:TeamSelection=game.viewerTeam==='home'?[game.roster.you,game.roster.partner]:[game.roster['opponent-left'],game.roster['opponent-right']];
  const opponent=game.accountIds?.[game.viewerTeam==='home'?'away':'home'];if(!opponent)throw missing();
  const row=await this.repo.rematch(source,actor,{id:randomUUID(),creator_id:actor,recipient_id:opponent,team,court:game.court??'forest',scoring:game.rules.scoring as InviteRequest['scoring'],points_limit:game.rules.target,status:'pending',created_at:new Date().toISOString(),match_id:null,request_id:randomUUID(),request_hash:requestHash({source})});
  if(row.status==='accepted')return {invitationId:row.id,matchId:row.match_id};
  if(row.status!=='pending')throw new ApiError(409,'rematch','This rematch was cancelled or declined. Start a new challenge to play again.');
  // The second player's Rematch tap is their acceptance of the shared request.
  if(row.recipient_id===actor){const next=await this.accept(row.id,actor,{team});return {invitationId:row.id,matchId:next.id};}
  const invitation=await this.created(row,actor);
  return {invitationId:row.id,matchId:invitation.matchId};
 }
 async accept(id:string,actor:string,input:any){
  const r=await this.repo.get(id,actor);if(!r)throw missing();if(r.recipient_id!==actor)throw new ApiError(403,'invitation','Only the invited player can accept.');
  if(!input||Object.keys(input).some(k=>k!=='team'))throw new ApiError(400,'team','Choose your team.');const parsed=parseTeam(input.team),team=r.status==='pending'?await this.resolveTeam(parsed):parsed;
  const match=this.matches.prepare(actor,{creationId:r.id,opponentId:r.creator_id,scoring:r.scoring,roster:{you:team[0],partner:team[1],'opponent-left':r.team[0],'opponent-right':r.team[1]}});
  match.checkpoint.rules.target=r.points_limit??3;
  match.id=r.id;match.checkpoint.matchId=r.id;match.checkpoint.court=r.court;
  return publicMatch(await this.repo.accept(id,actor,requestHash(parsed),match),actor,this.names);
 }
}
