import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptBotChallenge,botAction,botDelay,botReaction,surpriseInvitePlan} from '../server/multiplayer/community-bots';
import {MatchService} from '../server/multiplayer/service';
import {MemoryRepository,A,B,testers,creation} from './helpers/remote';
test('bot delay is bounded, varied, and stable across retries',()=>{
 const values=new Set<number>();for(let i=0;i<100;i++){const key=`game:${i}`;const delay=botDelay(key);assert.ok(delay>=4000&&delay<=14000);assert.equal(delay,botDelay(key));values.add(delay);assert.ok(botDelay(key,true)>=8000&&botDelay(key,true)<=25000);}assert.ok(values.size>80);
});
test('bot actions use normal rules, reject waiting turns, and complete a saved match',async()=>{
 const repo=new MemoryRepository(),service=new MatchService(repo,testers);let game=await service.create(A,creation());
 assert.equal(botAction(await service.get(game.id,B)),null);
 for(let turn=0;turn<1500&&game.status==='active';turn++){
  const actor=repo.rows.get(game.id)!.current_action_user_id!;
  game=await service.get(game.id,actor);const action=botAction(game);assert.ok(action);assert.deepEqual(action,botAction(game));
  const result=await service.act(game.id,actor,action);assert.equal(result.toVersion,game.version+1);
  if(turn===0)assert.equal((await service.act(game.id,actor,action)).toVersion,result.toVersion);
  game=result.state;
 }
 assert.equal(game.status,'completed');assert.equal(botAction(game),null);
});

test('challenging a generated bot immediately accepts and plays once; human accounts stay pending',async()=>{
 const {database,PgRepository}=await import('./helpers/postgres');
 const {pgInvitations}=await import('./helpers/invitations');
 const {InvitationService}=await import('../server/multiplayer/invitations');
 const {randomUUID}=await import('node:crypto');
 const {starterPlayer}=await import('../src/starter-player');
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const matches=new MatchService(new PgRepository(db.pool),testers);
  const team=[starterPlayer('Mila','starter'),starterPlayer('Jun','partner')];
  let automated=true;const lookups:string[]=[];
  const client={auth:{admin:{async getUserById(id:string){lookups.push(id);return {data:{user:{id,app_metadata:{community_bot:automated,multiplayer_playtest:true},user_metadata:{community_bot:true,open_play_team:team}}},error:null};}}}} as any;
  const invites:InstanceType<typeof InvitationService>=new InvitationService(pgInvitations(new PgRepository(db.pool)),matches,testers,async team=>team,invite=>acceptBotChallenge(client,matches,invites,invite));
  const request={requestId:randomUUID(),opponentId:B,team:[starterPlayer('You','starter'),starterPlayer('Partner','partner')],court:'forest',scoring:'rally-doubles',target:3};
  const invite=await invites.create(A,request);
  assert.equal(invite.status,'accepted');assert.ok(invite.matchId);assert.deepEqual(lookups,[B]);
  let game=await matches.get(invite.matchId!,B);
  assert.equal(game.roster.you.name,'Mila');assert.equal(game.version,1);
  const retry=await invites.create(A,request);assert.equal(retry.matchId,invite.matchId);
  assert.equal((await matches.get(invite.matchId!,B)).version,1,'retry cannot play an extra opening turn');
  for(let turn=0;game.status==='active'&&turn<1500;turn++){
   const actor=game.currentTeam==='home'?B:A;
   const current=await matches.get(game.id,actor),action=botAction(current);assert.ok(action);
   game=(await matches.act(game.id,actor,action)).state;
  }
  assert.equal(game.status,'completed');
  const rematch=await invites.rematch(game.id,A);assert.ok(rematch.matchId);
  assert.equal((await matches.get(rematch.matchId!,B)).version,1,'bot rematch also starts automatically');
  automated=false;
  const human=await invites.create(A,{...request,requestId:randomUUID()});
  assert.equal(human.status,'pending');assert.equal(human.matchId,null,'user metadata cannot opt an account into bot control');

 }finally{await db.close();}
});

test('surprise invitations have persistent cooldowns and stable senders',()=>{
 const anchor='2026-09-17T12:00:00Z',start=Date.parse(anchor),senders=new Set();
 for(let i=0;i<50;i++){
  const first=surpriseInvitePlan(`user-${i}`,anchor,[A,B],true),repeat=surpriseInvitePlan(`user-${i}`,anchor,[A,B],false);
  assert.ok(first.due>=start+15*60000&&first.due<start+90*60000);
  assert.ok(repeat.due>=start+24*3600000&&repeat.due<start+72*3600000);
  assert.deepEqual(first,surpriseInvitePlan(`user-${i}`,anchor,[B,A],true));senders.add(first.botId);
  assert.notEqual(first.requestId,surpriseInvitePlan(`user-${i}`,'2026-09-18T12:00:00Z',[A,B],false).requestId);
 }assert.equal(senders.size,2);
});

test('bot reactions are occasional, varied, stable, and respect cooldowns and inactive games',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),game=await service.create(A,creation());
 let count=0;const texts=new Set<string>();
 for(let version=2;version<502;version++){
  const state={...game,version},reaction=botReaction(state,null,100000);
  if(!reaction)continue;
  count++;texts.add(reaction.text);assert.deepEqual(reaction,botReaction(state,null,100000));
  assert.equal(botReaction(state,60000,100000),null);
  assert.deepEqual(botReaction(state,55000,100000),reaction);
  assert.equal(botReaction({...state,status:'completed'},null),null);
  assert.equal(botReaction({...state,currentTeam:'away'},null),null);
  assert.equal(botReaction({...state,friendState:'pending'},null),null);
 }
 assert.ok(count>40&&count<140);assert.ok(texts.size>4);
});
