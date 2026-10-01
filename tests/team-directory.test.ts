import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultTeam,lobbyTeam,friendIds} from '../src/multiplayer/team-directory';
import {newPlayer} from '../src/player-design';
import {TeamDirectoryService} from '../server/multiplayer/team-directory';
import type {SupabaseClient} from '@supabase/supabase-js';
import {canShowCommunityAccount} from '../src/multiplayer/community-directory';
import {loadPlaytesters} from '../server/multiplayer/accounts';

test('community selects the latest 100 across all Auth pages and preserves older friends',async()=>{
 const friend='12345678-1234-1234-1234-123456789abc';
 const self={id:'self',user_metadata:{open_play_friends:[friend]}};
 const users=Array.from({length:1005},(_,index)=>({id:`account-${String(index).padStart(4,'0')}`,email:'private@example.test',created_at:'2026-01-01T00:00:00Z',last_sign_in_at:new Date(Date.UTC(2026,0,1)+index*60000).toISOString(),user_metadata:{username:`player_${index}`},app_metadata:{multiplayer_playtest:true}}));
 users.push({...users[0],id:friend,user_metadata:{username:'old_friend'}});
 const hidden={...users[0],id:'hidden',last_sign_in_at:'2027-01-01T00:00:00Z',app_metadata:{multiplayer_playtest:true,directory_hidden:true}};
 const blocked={...hidden,id:'blocked',app_metadata:{multiplayer_playtest:true}};
 const guest={...blocked,id:'guest',is_anonymous:true};
 const all=[hidden,blocked,guest,...users],pages:number[]=[];
 const client={from:()=>({select(){return this},or:async()=>({data:[{owner_id:'self',blocked_id:'blocked'}],error:null})}),auth:{admin:{getUserById:async()=>({data:{user:self},error:null}),listUsers:async({page,perPage}:{page:number;perPage:number})=>{pages.push(page);return {data:{users:all.slice((page-1)*perPage,page*perPage)},error:null}}}}} as unknown as SupabaseClient;
 const eligible=await loadPlaytesters(client);assert.ok(eligible.has('account-1004'),'eligibility scans beyond the first thousand');
 pages.length=0;
 const result=await new TeamDirectoryService(client,eligible).list('self');
 assert.ok(pages.includes(11));assert.equal(result.communityIds?.length,100);
 assert.equal(result.communityIds?.[0],'account-1004');assert.equal(result.communityIds?.at(-1),'account-0905');
 assert.equal(result.teams.length,101);assert.ok(result.teams.some(team=>team.id===friend));assert.deepEqual(result.friends,[friend]);assert.ok(!result.communityIds?.includes(friend));
 assert.ok(!result.teams.some(team=>['hidden','blocked','guest'].includes(team.id)));
 assert.ok(!JSON.stringify(result).includes('last_sign_in_at'));assert.ok(!JSON.stringify(result).includes('private@example.test'));
});

test('community recency uses creation for unsigned accounts and deterministic ties',async()=>{
 const self={id:'self',user_metadata:{}};
 const base={user_metadata:{},app_metadata:{multiplayer_playtest:true},created_at:'2026-01-01T00:00:00Z'};
 const users=[{...base,id:'signed',last_sign_in_at:'2026-03-01T00:00:00Z'},{...base,id:'tie-b',created_at:'2026-04-01T00:00:00Z'},{...base,id:'tie-a',created_at:'2026-04-01T00:00:00Z'},{...base,id:'never'}];
 const client={from:()=>({select(){return this},or:async()=>({data:[],error:null})}),auth:{admin:{getUserById:async()=>({data:{user:self},error:null}),listUsers:async()=>({data:{users},error:null})}}} as unknown as SupabaseClient;
 const result=await new TeamDirectoryService(client,new Map(users.map(user=>[user.id,user.id]))).list('self');
 assert.deepEqual(result.communityIds,['tie-a','tie-b','signed','never']);assert.deepEqual(result.teams.map(team=>team.id),result.communityIds);
});
test('default lineup preserves duplicate characters and their actual abilities',()=>{const player=newPlayer('my-player');player.skills.dink=95;const team=defaultTeam([player,player]);assert.equal(team?.length,2);assert.equal(team?.[0].skills.dink,95);assert.equal(team?.[1].id,'my-player');assert.equal(lobbyTeam('one','Alex',{open_play_team:team}).starter,false);});
test('invalid saved teams fall back to the account player without Emma or Leo presets',()=>{for(const value of [null,[],[newPlayer()], [{},{}]]){assert.equal(defaultTeam(value),null);const team=lobbyTeam('one','Alex',{open_play_team:value});assert.equal(team.starter,true);assert.deepEqual(team.players.map(p=>p.id),['starter','starter']);assert.deepEqual(team.players.map(p=>p.name),['Alex','Alex']);}});
test('directory projects only team fields and eligible community managers',async()=>{const self={id:'self',user_metadata:{player_name:'Alex',team_name:'The Dinkers',email:'private',open_play_friends:[]}},publicUser={id:'allowed',user_metadata:{player_name:'Sam',private_notes:'secret'},app_metadata:{multiplayer_playtest:true}},qa={...publicUser,id:'qa',user_metadata:{username:'inviteqa_a_8ef92c31',purpose:'invitation-storage-regression'},app_metadata:{multiplayer_playtest:true}},hidden={...publicUser,id:'hidden',app_metadata:{multiplayer_playtest:true,directory_hidden:true}},excluded={...publicUser,id:'excluded'},guest={...publicUser,id:'guest',app_metadata:{}};const client={from:()=>({select(){return this},or:async()=>({data:[],error:null})}),auth:{admin:{getUserById:async()=>({data:{user:self},error:null}),listUsers:async()=>({data:{users:[self,publicUser,qa,hidden,excluded,guest]},error:null})}}} as unknown as SupabaseClient;const result=await new TeamDirectoryService(client,new Map([['allowed','Sam'],['qa','QA'],['hidden','Hidden'],['guest','Guest']])).list('self');assert.equal(result.self.name,'The Dinkers');assert.deepEqual(result.teams.map(t=>t.id),['allowed']);assert.equal(JSON.stringify(result).includes('secret'),false);assert.equal(JSON.stringify(result).includes('private'),false);});
test('community accounts require a completed game and invitation QA handles are always hidden',()=>{assert.equal(canShowCommunityAccount('inviteqa_b_bbc57039',10),false);assert.equal(canShowCommunityAccount('new_player',null),true);assert.equal(canShowCommunityAccount('new_player',0),false);assert.equal(canShowCommunityAccount('new_player',1),true);});
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
 const {activity,lifetimeXp,...record}=await service.record('self','friend',remote);assert.deepEqual(record,{games:3,wins:2,losses:1});assert.ok(activity);assert.equal(owner,'friend');
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

 test('accepted anonymous guests stay out of the account directory until registration',async()=>{
 const self={id:'self',user_metadata:{}},guest={id:'guest',is_anonymous:true,user_metadata:{player_name:'Maeling'},app_metadata:{multiplayer_playtest:true,friend_guest:true}},registered={...guest,id:'registered',is_anonymous:false,user_metadata:{username:'maeling'}};
 const client={from:()=>({select(){return this},or:async()=>({data:[],error:null})}),auth:{admin:{getUserById:async()=>({data:{user:self},error:null}),listUsers:async()=>({data:{users:[self,guest,registered]},error:null})}}} as unknown as SupabaseClient;
 const result=await new TeamDirectoryService(client,new Map([['guest','Maeling'],['registered','maeling']])).list('self');
 assert.deepEqual(result.teams.map(t=>t.id),['registered']);
 });

test('directory records include saved XP and sample XP only for generated players',async()=>{
 for(const generated of [false,true]){
  const self={id:'self',user_metadata:{}},friend={id:'friend',user_metadata:{username:'friend',open_play_team:[newPlayer('one'),newPlayer('two')]},app_metadata:{multiplayer_playtest:true,community_bot:generated,bot_seed_record:{games:80,wins:45,losses:35}}};
  const client={auth:{admin:{getUserById:async()=>({data:{user:self}}),listUsers:async()=>({data:{users:[self,friend]}})}},from:(table:string)=>({select(){return this},or:async()=>({data:[],error:null}),eq(){return this},order(){return this},async range(){return {data:[],error:null}},async maybeSingle(){assert.equal(table,'account_xp');return {data:{lifetime_xp:120},error:null}}})} as unknown as SupabaseClient;
  const service=new TeamDirectoryService(client,new Map([['friend','Friend']]));
  const first=await service.record('self','friend',async()=>[]),second=await service.record('self','friend',async()=>[]);
  assert.equal(first.lifetimeXp,generated?1100:120);assert.equal(second.lifetimeXp,first.lifetimeXp);
 }
});
