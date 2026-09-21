/** Local-only simulated accounts/challenges backed by the real match engine. */
import {randomBytes,randomUUID} from 'node:crypto';
import {MatchService} from '../../server/multiplayer/service';
import {createMatchHandler} from '../../server/multiplayer/routes';
import {ApiError} from '../../server/multiplayer/errors';
import type {FriendService} from '../../server/multiplayer/friends';
import type {InvitationService} from '../../server/multiplayer/invitations';
import type {TeamDirectoryService} from '../../server/multiplayer/team-directory';
import {lobbyTeam} from '../../src/multiplayer/team-directory';
import type {TeamSelection} from '../../src/multiplayer/invitation-protocol';
import {A,B,creation,MemoryRepository} from './remote';
export {A,B};
export function createInviteLab(){
 const people=new Map([[A,'Alice'],[B,'Bob']]),repo=new MemoryRepository(),service=new MatchService(repo,people);
 type Invite={token:string;matchId:string;inviterName:string;invitedName:string;status:string};
 const invites=new Map<string,Invite>();
 const get=(token:string)=>{const invite=invites.get(token);if(!invite)throw new ApiError(404,'challenge','Challenge not found.');return invite;};
 const friends={
  get:async(token:string)=>get(token),preview:(invite:Invite)=>invite,event:async()=>{},clientEvent:async()=>({ok:true}),
  async create(actor:string,input:{name:string;team?:TeamSelection;requestId?:string;scoring?:'rally-doubles'|'side-out-doubles';target?:number;court?:'forest'|'venice'|'arizona'}){
   const request=creation();request.creationId=input.requestId??randomUUID();request.opponentId=actor===A?B:A;
   if(input.team){request.roster.you=input.team[0];request.roster.partner=input.team[1];}
   request.roster['opponent-left'].name=input.name||'Bob';
   request.scoring=input.scoring??request.scoring;
   const row=service.prepare(actor,request);row.checkpoint.rules.target=input.target??3;row.checkpoint.court=input.court??'forest';row.friend_state='pending';row.invited_name=input.name||'Bob';row.away_user_id=null;row.current_action_user_id=null;
   const saved=await repo.create(row);const existing=[...invites.values()].find(i=>i.matchId===saved.id);if(existing)return existing;
   const invite={token:randomBytes(32).toString('base64url'),matchId:saved.id,inviterName:people.get(actor)!,invitedName:row.invited_name,status:'pending'};
   invites.set(invite.token,invite);return invite;
  },
  async accept(token:string,actor:string,cancel=false,_acceptAs?:string,team?:TeamSelection){
   const invite=get(token),row=repo.rows.get(invite.matchId)!;
   if(cancel){if(row.home_user_id!==actor)throw new ApiError(403,'owner','Only the sender can cancel.');if(invite.status!=='pending')throw new ApiError(409,'claimed','Already accepted.');invite.status='cancelled';row.friend_state='cancelled';return {matchId:row.id};}
   if(invite.status==='cancelled')throw new ApiError(404,'challenge','Challenge cancelled.');
   if(invite.status==='accepted'){if(row.away_user_id!==actor)throw new ApiError(409,'claimed','Another player accepted this challenge.');return {matchId:row.id};}
   if(row.home_user_id===actor)throw new ApiError(409,'owner','Open this invitation in a recipient window.');
   const checkpoint=await service.friendOpening(row.id,row.home_user_id,team);
   // Recheck after await so two simulated recipients cannot both claim the slot.
   if(invite.status!=='pending')throw new ApiError(409,'claimed','Another player accepted this challenge.');
   row.checkpoint=checkpoint!;row.away_user_id=actor;row.current_action_user_id=actor;row.friend_state='accepted';invite.status='accepted';
   return {matchId:row.id};
  },
  async own(actor:string,id:string){const row=await repo.get(id,actor);if(!row)throw new ApiError(404,'match','Match not found.');return [...invites.values()].find(i=>i.matchId===id);},
 };
 const teams={list:async(actor:string)=>({self:lobbyTeam(actor,people.get(actor)!,{}),teams:[...people].filter(([id])=>id!==actor).map(([id,name])=>lobbyTeam(id,name,{})),friends:[]}),record:async()=>({games:0,wins:0,losses:0})};
 const handler=createMatchHandler(service,async token=>{if(!people.has(token))throw new ApiError(401,'authentication','Sign in to return to this game.');return token;},undefined,{list:async()=>[]} as unknown as InvitationService,undefined,undefined,undefined,friends as unknown as FriendService,teams as unknown as TeamDirectoryService);
 function guest(){const id=randomUUID();people.set(id,'Bob');return id;}
 return {handler,guest,friends,service,repo};
}
