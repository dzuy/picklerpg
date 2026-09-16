import test from 'node:test';
import assert from 'node:assert/strict';
import {challengeIdentity} from '../src/multiplayer/challenge-identity';
import {creation} from './helpers/remote';
import {FriendService} from '../server/multiplayer/friends';
const actor='22222222-2222-4222-8222-222222222222';
test('fresh guests enter as the invited friend, while different named sessions need an explicit choice',()=>{
 assert.deepEqual(challengeIdentity({id:actor,is_anonymous:true},'Max'),{name:'Max',needsChoice:false,canSwitch:false});
 assert.equal(challengeIdentity({id:actor,is_anonymous:false,user_metadata:{player_name:' max '}},'Max').needsChoice,false);
 for(const anonymous of [true,false])assert.equal(challengeIdentity({id:actor,is_anonymous:anonymous,user_metadata:{player_name:'Ryan'}},'Max').needsChoice,true);
});
function fixture(anonymous=false,name:string|undefined='Ryan',status='pending'){
 const calls:any[]=[],user={id:actor,is_anonymous:anonymous,user_metadata:{player_name:name},app_metadata:{}};
 const client:any={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{invited_name:'Max',status}})})})}),auth:{admin:{getUserById:async()=>({data:{user}}),updateUserById:async(_id:string,value:any)=>{calls.push({metadata:value});return {};}}},rpc:async(_rpc:string,input:any)=>{calls.push(input);return {data:{match_id:'same-match'}};}};
 return {service:new FriendService(client,{friendOpening:async()=>({openingTeam:'away'})} as any),calls};
}
test('server refuses silent Ryan acceptance and permits only confirmation for the authenticated identity',async()=>{
 const {service,calls}=fixture();await assert.rejects(service.accept('token',actor),e=>(e as any).code==='identity_choice');assert.equal(calls.length,0);
 await assert.rejects(service.accept('token',actor,false,'another-user'));assert.equal(calls.length,0);
 assert.deepEqual(await service.accept('token',actor,false,actor),{matchId:'same-match'});assert.equal(calls[0].p_name,'Ryan');assert.equal(calls[0].p_guest,false);
});
test('new guest uses Max, while confirming an existing guest preserves Ryan’s identity',async()=>{
 const fresh=fixture(true,'');await fresh.service.accept('token',actor);assert.equal(fresh.calls[0].p_name,'Max');assert.equal(fresh.calls[1].metadata.user_metadata.player_name,'Max');
 const existing=fixture(true,'Ryan');await existing.service.accept('token',actor,false,actor);assert.equal(existing.calls[0].p_name,'Ryan');assert.equal(existing.calls[1].metadata.user_metadata.player_name,'Ryan');
});
test('returning to an accepted challenge does not require identity confirmation again',async()=>{
 const {service,calls}=fixture(false,'Ryan','accepted');await service.accept('token',actor);assert.equal(calls.length,1);
});

test('registered acceptance sends selected team while guests use automatic assignment',async()=>{
 const roster=creation().roster,team=[roster.you,roster.partner];
 const registered=fixture(false,'Max');await registered.service.accept('token',actor,false,undefined,team);assert.equal(registered.calls[0].p_selected_team,true);
 const guest=fixture(true,'');await assert.rejects(guest.service.accept('token',actor,false,undefined,team),/assigned team/);assert.equal(guest.calls.length,0);
 await guest.service.accept('token',actor);assert.equal(guest.calls[0].p_selected_team,false);
});
