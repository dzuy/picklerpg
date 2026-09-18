import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultTeam,lobbyTeam,friendIds} from '../src/multiplayer/team-directory';
import {newPlayer} from '../src/player-design';
import {TeamDirectoryService} from '../server/multiplayer/team-directory';
import type {SupabaseClient} from '@supabase/supabase-js';
test('default lineup preserves duplicate characters and their actual abilities',()=>{const player=newPlayer('my-player');player.skills.dink=95;const team=defaultTeam([player,player]);assert.equal(team?.length,2);assert.equal(team?.[0].skills.dink,95);assert.equal(team?.[1].id,'my-player');assert.equal(lobbyTeam('one','Alex',{open_play_team:team}).starter,false);});
test('invalid saved teams fall back to explicitly identified starter athletes',()=>{for(const value of [null,[],[newPlayer()], [{},{}]]){assert.equal(defaultTeam(value),null);const team=lobbyTeam('one','Alex',{open_play_team:value});assert.equal(team.starter,true);assert.deepEqual(team.players.map(p=>p.id),['preset-0','preset-1']);}});
test('directory projects only team fields and eligible community managers',async()=>{const self={id:'self',user_metadata:{player_name:'Alex',team_name:'The Dinkers',email:'private',open_play_friends:[]}},publicUser={id:'allowed',user_metadata:{player_name:'Sam',private_notes:'secret'},app_metadata:{multiplayer_playtest:true}},excluded={...publicUser,id:'excluded'},guest={...publicUser,id:'guest',app_metadata:{}};const client={auth:{admin:{getUserById:async()=>({data:{user:self},error:null}),listUsers:async()=>({data:{users:[self,publicUser,excluded,guest]},error:null})}}} as unknown as SupabaseClient;const result=await new TeamDirectoryService(client,new Map([['allowed','Sam'],['guest','Guest']])).list('self');assert.equal(result.self.name,'The Dinkers');assert.deepEqual(result.teams.map(t=>t.id),['allowed']);assert.equal(JSON.stringify(result).includes('secret'),false);assert.equal(JSON.stringify(result).includes('private'),false);});
test('friend ids are bounded and deduplicated',()=>{const id='12345678-1234-1234-1234-123456789abc';assert.deepEqual(friendIds([id,id,42,'no']),[id]);assert.deepEqual(friendIds(null),[]);});
test('profile identity stays independent of selected roster athletes',()=>{
 const avatar=newPlayer().appearance,first=newPlayer('first'),second=newPlayer('second');
 avatar.hair='#123456';first.appearance.hair='#ffffff';second.appearance.hair='#000000';
 const before=lobbyTeam('alex','Alex',{profile_avatar:avatar,open_play_team:[first,first]});
 const after=lobbyTeam('alex','Alex',{profile_avatar:avatar,open_play_team:[second,second]});
 assert.deepEqual(before.avatar,after.avatar);assert.equal(after.avatar.hair,'#123456');
 assert.deepEqual(lobbyTeam('alex','Alex',{}).avatar,lobbyTeam('alex','Alex',{open_play_team:[second,second]}).avatar);
 assert.deepEqual(lobbyTeam('alex','Alex',{profile_avatar:{invalid:true}}).avatar,lobbyTeam('alex','Alex',{}).avatar);
});

test('friend records aggregate recorded solo and online results without exposing games',async()=>{
 const history=[{id:'solo-win',home_score:11,away_score:5},{id:'solo-loss',home_score:2,away_score:11},{id:'early',home_score:5,away_score:1,ended_early:true}];
 let owner='';
 const query={select(){return this},eq(_key:string,value:string){owner=value;return this},order(){return this},async range(){return {data:history,error:null}}};
 const client={from:()=>query} as unknown as SupabaseClient;
 const service=new TeamDirectoryService(client,new Map());
 service.list=async()=>({self:lobbyTeam('self','Me',{}),teams:[lobbyTeam('friend','Friend',{})],friends:['friend']});
 const remote=async()=>[{id:'online-win',status:'completed',viewerTeam:'away',score:{home:3,away:11}},{id:'pending',status:'active',viewerTeam:'home',score:{home:1,away:2}}] as import('../src/multiplayer/protocol').PublicMatch[];
 const {activity,...record}=await service.record('self','friend',remote);assert.deepEqual(record,{games:3,wins:2,losses:1});assert.ok(activity);assert.equal(owner,'friend');
});

test('friend records reject profiles outside the directory before reading results',async()=>{
 const service=new TeamDirectoryService({from:()=>{throw Error('must not read')}} as unknown as SupabaseClient,new Map());
 service.list=async()=>({self:lobbyTeam('self','Me',{}),teams:[],friends:[]});
 await assert.rejects(service.record('self','hidden',async()=>{throw Error('must not read')}),/profile is unavailable/);
});

test('friend record query failures do not appear as zero games',async()=>{
 const query={select(){return this},eq(){return this},order(){return this},async range(){return {data:null,error:Error('offline')}}};
 const service=new TeamDirectoryService({from:()=>query} as unknown as SupabaseClient,new Map());
 service.list=async()=>({self:lobbyTeam('self','Me',{}),teams:[lobbyTeam('friend','Friend',{})],friends:[]});
 await assert.rejects(service.record('self','friend',async()=>[]),/record is unavailable/);
});

test('community identity uses unique usernames instead of duplicate display names',()=>{
 const first=lobbyTeam('human','Luna',{username:'luna',player_name:'Luna'});
 const bot=lobbyTeam('bot','Luna',{username:'luna_lobs',player_name:'Luna'});
 assert.equal(first.manager,'luna');assert.equal(bot.manager,'luna_lobs');assert.notEqual(first.name,bot.name);
});
