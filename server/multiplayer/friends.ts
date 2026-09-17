import {starterPlayer} from '../../src/starter-player';
import {isValidTargetScore} from '../../src/engine/scoring';
import {challengeIdentity} from '../../src/multiplayer/challenge-identity';
import {randomBytes,randomUUID} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {newPlayer} from '../../src/player-design';
import {parseTeam} from './invitations';
import {MatchService} from './service';
import {playerName,registrationInput,requireAvailableUsername} from './accounts';
import {ApiError} from './errors';
import {uuid,requestHash} from './validation';
export class FriendService {
 constructor(private client:SupabaseClient,private matches:MatchService){}
 private check(error:any){if(error)throw new ApiError(error.code==='PT409'?409:503,'challenge',error.code==='PT409'?'This challenge has already been accepted or is no longer available.':'Could not save your challenge. Please try again.');}
 async event(actor:string|null,event:string,invite?:any){const {error}=await this.client.from('invite_events').insert({event_key:randomUUID(),event,actor_id:actor,invite_id:invite?.id??null,game_id:invite?.match_id??null});if(error)console.warn('Invite analytics unavailable');}
 async clientEvent(actor:string,input:any){if(!input||!['invite_friend_started','invite_name_entered','invite_share_opened','invite_link_copied','guest_registration_started'].includes(input.event))throw new ApiError(400,'event','Invalid event.');let invite;if(input.token){invite=await this.get(input.token);if(invite.inviter_id!==actor)throw new ApiError(403,'event','Not your challenge.');}await this.event(actor,input.event,invite);return {ok:true};}
 async get(token:string){const {data,error}=await this.client.from('friend_challenges').select('*').eq('token',token).maybeSingle();this.check(error);if(!data)throw new ApiError(404,'challenge','This challenge is no longer available.');return data;}
 preview(i:any){return {inviterName:i.inviter_name,invitedName:i.invited_name,status:i.status};}
 async own(actor:string,match:string){const {data,error}=await this.client.from('friend_challenges').select('*').eq('match_id',match).eq('inviter_id',actor).maybeSingle();this.check(error);if(!data)throw new ApiError(404,'challenge','Challenge not found.');return {...this.preview(data),token:data.token,matchId:data.match_id};}
 async create(actor:string,input:any){
  if(!input||Object.keys(input).some(k=>!['name','requestId','team','court','scoring','target'].includes(k))||!uuid(input.requestId))throw new ApiError(400,'challenge','Enter your friend’s name.');
  const name=playerName(input.name);if(name.length>24)throw new ApiError(400,'name','Use a friend’s name of up to 24 characters.');const self=this.matches.config(actor).selfName;
  const court=input.court??'forest',scoring=input.scoring??'rally-doubles',target=input.target??3;
  if(!['forest','venice','arizona'].includes(court)||!['rally-doubles','side-out-doubles'].includes(scoring)||!isValidTargetScore(target))throw new ApiError(400,'settings','Choose valid scoring, points limit, and court.');
  const team=parseTeam(input.team);
  const make=(name:string)=>({...newPlayer(randomUUID()),name:name.slice(0,24)});
  const m=this.matches.prepare(actor,{creationId:input.requestId,opponentId:randomUUID(),scoring,roster:{you:team[0],partner:team[1],'opponent-left':make(name),'opponent-right':make('Partner')}},true);
  m.checkpoint.court=court;m.checkpoint.rules.target=target;
  const {data,error}=await this.client.rpc('create_friend_challenge',{p_match:m,p_invite:{id:randomUUID(),token:randomBytes(32).toString('base64url'),inviter_id:actor,inviter_name:self,invited_name:name,request_id:input.requestId,request_hash:requestHash({name,team,...(input.court!==undefined?{court}:{}),...(input.scoring!==undefined?{scoring}:{}),...(input.target!==undefined?{target}:{})})}});this.check(error);
  return {...this.preview(data),token:data.token,matchId:data.match_id};
 }
 async accept(token:string,actor:string,cancel=false,acceptAs?:string,selectedTeam?:unknown){
  const i=await this.get(token);const {data:{user},error}=await this.client.auth.admin.getUserById(actor);if(error||!user)throw new ApiError(401,'authentication','Please reopen the challenge.');
  const identity=challengeIdentity(user,i.invited_name);
  if(!cancel&&i.status==='pending'&&identity.needsChoice&&acceptAs!==actor)throw new ApiError(409,'identity_choice',`You’re signed in as ${identity.name}. Choose which player should accept this challenge.`);
  const name=playerName(identity.name);
  const team=!cancel&&i.status==='pending'&&selectedTeam!==undefined?parseTeam(selectedTeam):undefined;
  if(team&&user.is_anonymous)throw new ApiError(400,'team','Guest challenges start with an assigned team.');
  const opening=!cancel&&i.status==='pending'?await this.matches.friendOpening(i.match_id,i.inviter_id,team):null;
  const {data,error:claimError}=await this.client.rpc('claim_friend_challenge',{p_token:token,p_actor:actor,p_name:name.slice(0,24),p_cancel:cancel,p_guest:!!user.is_anonymous,p_opening_checkpoint:opening,p_selected_team:!!team});this.check(claimError);
  if(user.is_anonymous&&!cancel){const {error:updateError}=await this.client.auth.admin.updateUserById(actor,{user_metadata:{...user.user_metadata,player_name:name},app_metadata:{...user.app_metadata,multiplayer_playtest:true,friend_guest:true}});this.check(updateError);}
  return {matchId:data.match_id};
 }
 async upgrade(actor:string,input:unknown){
  const {email,password,playerName:name,username:handle}=registrationInput(input);
  const {data:{user},error}=await this.client.auth.admin.getUserById(actor);if(error||!user)throw new ApiError(401,'authentication','Please reopen your game.');
  if(!user.is_anonymous){if(user.email===email)return {created:true};throw new ApiError(409,'registration','This player already has an account.');}
  await requireAvailableUsername(this.client,handle,actor);
  const {error:saveError}=await this.client.auth.admin.updateUserById(actor,{email,password,email_confirm:true,user_metadata:{...user.user_metadata,player_name:name,username:handle,starter_player:starterPlayer(name,'starter')},app_metadata:{...user.app_metadata,multiplayer_playtest:true}});
  if(saveError)throw new ApiError(400,'registration','Could not save your player. That email may already have an account. Your game is still here.');
  await this.event(actor,'guest_registration_completed');
  return {created:true};
 }
}
