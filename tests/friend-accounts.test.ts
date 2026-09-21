import test from 'node:test';
import assert from 'node:assert/strict';
import {FriendService} from '../server/multiplayer/friends';
import {A,B,C} from './helpers/remote';
test('registration upgrades the authenticated identity, preserves metadata and never creates a replacement user',async()=>{
 const writes:any[]=[];let user:any={id:A,is_anonymous:true,user_metadata:{player_name:'Ryan',open_play_friends:[B]},app_metadata:{friend_guest:true}};
 const client:any={auth:{admin:{listUsers:async()=>({data:{users:[user,{id:C,is_anonymous:false,user_metadata:{username:'dzuy'},app_metadata:{multiplayer_playtest:true}}]},error:null}),getUserById:async()=>({data:{user}}),updateUserById:async(id:string,update:any)=>{writes.push({id,update});user={...user,...update,is_anonymous:false};return {data:{user}};},createUser:()=>assert.fail('must never replace a guest')}},from:()=>({insert:async()=>({error:null})})};
 const service=new FriendService(client,{} as any);await service.upgrade(A,{email:'ryan@example.com',password:'pickleball',username:'ryan',playerName:'Ryan'});
 assert.deepEqual(writes[0].update.user_metadata.open_play_friends,[B,C]);assert.equal(writes.length,1);assert.equal(writes[0].update.user_metadata.username,'ryan');assert.equal(writes[0].id,A);assert.equal(writes[0].update.app_metadata.friend_guest,true);assert.equal(writes[0].update.email_confirm,true);
 await service.upgrade(A,{email:'ryan@example.com',password:'pickleball',username:'ryan',playerName:'Ryan'});assert.equal(writes.length,1);
 await assert.rejects(service.upgrade(A,{email:'someone@example.com',password:'pickleball',username:'ryan',playerName:'Ryan'}));
});


test('creating a named challenge never creates or updates a recipient account',async()=>{
 const {randomUUID}=await import('node:crypto');
 const {MatchService}=await import('../server/multiplayer/service');
 const {MemoryRepository,testers,creation}=await import('./helpers/remote');
 const matches=new MatchService(new MemoryRepository(),testers),roster=creation().roster;
 let created=false;
 const client:any={get auth(){assert.fail('Invitation creation must not access account administration');},rpc:async(name:string,input:any)=>{
  if(name==='account_skill_budget')return {data:35};
  assert.equal(name,'create_friend_challenge');created=true;
  assert.equal(input.p_invite.invited_name,'maeling');
  return {data:{...input.p_invite,match_id:input.p_match.id,status:'pending'}};
 }};
 const result=await new FriendService(client,matches).create(A,{name:'maeling',requestId:randomUUID(),team:[roster.you,roster.partner]});
 assert.equal(created,true);assert.equal(result.status,'pending');assert.equal(result.invitedName,'maeling');
});
