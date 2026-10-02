import test from 'node:test';
import assert from 'node:assert/strict';
import {canChallengeAccount} from '../server/multiplayer/opponent-eligibility';
import {InvitationService} from '../server/multiplayer/invitations';
import {newPlayer} from '../src/player-design';
import {A,B} from './helpers/remote';
import {startCommunityBots} from '../server/multiplayer/community-bots';
import {TeamDirectoryService} from '../server/multiplayer/team-directory';

const human={email:'player@example.com',is_anonymous:false,app_metadata:{multiplayer_playtest:true},user_metadata:{}};
const bot={...human,email:'player@community-bots.invalid',app_metadata:{multiplayer_playtest:true,community_bot:true},user_metadata:{open_play_team:[newPlayer('one'),newPlayer('two')]}};
test('suggested opponents are real registered accounts or ready generated accounts',()=>{
 assert.equal(canChallengeAccount({...human,app_metadata:{...human.app_metadata,account_archived_at:'2026-10-01'}}),false);
 assert.equal(canChallengeAccount({...bot,app_metadata:{...bot.app_metadata,account_archived_at:'2026-10-01'}}),false);
 assert.equal(canChallengeAccount(human),true);assert.equal(canChallengeAccount(human,false),true);
 assert.equal(canChallengeAccount(bot),true);assert.equal(canChallengeAccount(bot,false),false);
 assert.equal(canChallengeAccount({...bot,user_metadata:{}}),false);
 assert.equal(canChallengeAccount({...bot,user_metadata:{open_play_team:[{},{}]}}),false);
 assert.equal(canChallengeAccount({...human,email:'dead@community-bots.invalid'}),false);
 assert.equal(canChallengeAccount({...human,app_metadata:{multiplayer_playtest:true,bot_seed_batch:'old'}}),false);
 assert.equal(canChallengeAccount({...human,is_anonymous:true}),false);
 assert.equal(canChallengeAccount({...human,user_metadata:{community_bot:true}},false),true,'editable metadata cannot grant automated control');
});
test('new invitations recheck stale opponents before writing a game invitation',async()=>{
 const service=new InvitationService({create:()=>assert.fail('unavailable opponent must not create an invitation')} as any,{config:()=>({creationEnabled:true})} as any,new Map([[B,'Opponent']]),undefined,undefined,undefined,async()=>{if(!canChallengeAccount({...bot,user_metadata:{}}))throw Error('This player is unavailable.');});
 await assert.rejects(service.create(A,{requestId:A,opponentId:B,court:'forest',scoring:'rally-doubles',team:[newPlayer('one'),newPlayer('two')]}),/unavailable/);
});

test('directory hides generated accounts without a running worker or valid team',async()=>{
 const self={...human,id:A},people=[{...human,id:'human'},{...bot,id:'ready'},{...bot,id:'broken',user_metadata:{}},{...human,id:'dead',email:'dead@community-bots.invalid'}];
 const client={auth:{admin:{getUserById:async()=>({data:{user:self}}),listUsers:async()=>({data:{users:[self,...people]}})}},from:()=>({select(){return this},or:async()=>({data:[],error:null})})} as any;
 const names=new Map(people.map(person=>[person.id,'Player']));
 assert.deepEqual((await new TeamDirectoryService(client,names).list(A)).teams.map(team=>team.id).sort(),['human','ready']);
 assert.deepEqual((await new TeamDirectoryService(client,names,undefined,false).list(A)).teams.map(team=>team.id),['human']);
});

test('worker recovers ordinary invitations and manual rematches after initial acceptance fails',async()=>{
 const accepted:string[]=[],rows=[{id:'ordinary',recipient_id:B,created_at:'2020-01-01',rematch_of:null,rematch_manual:false},{id:'manual',recipient_id:B,created_at:'2020-01-01',rematch_of:A,rematch_manual:true},{id:'automatic',recipient_id:B,created_at:'2020-01-01',rematch_of:A,rematch_manual:false}];
 let complete!:()=>void;const finished=new Promise<void>(resolve=>{complete=resolve;});
 const client={auth:{admin:{listUsers:async()=>({data:{users:[{...bot,id:B}]}})}},from:()=>({select(fields:string){this.fields=fields;return this},fields:'',eq(){return this},async in(){if(this.fields.includes('current_action_user_id')){complete();return {data:[],error:null};}return {data:rows,error:null};}})} as any;
 const stop=startCommunityBots(client,{} as any,{accept:async(id:string)=>{accepted.push(id);}} as any,async()=>{});
 try{await finished;assert.deepEqual(accepted,['ordinary','manual']);}finally{stop();}
});
