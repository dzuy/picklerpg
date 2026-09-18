import test from 'node:test';
import assert from 'node:assert/strict';
import {botAction,botDelay,surpriseInvitePlan} from '../server/multiplayer/community-bots';
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

test('a community bot accepts a human invitation with its saved team and plays the opening turn',async()=>{
 const {database,PgRepository}=await import('./helpers/postgres');
 const {pgInvitations}=await import('./helpers/invitations');
 const {InvitationService}=await import('../server/multiplayer/invitations');
 const {randomUUID}=await import('node:crypto');
 const {starterPlayer}=await import('../src/starter-player');
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const matches=new MatchService(new PgRepository(db.pool),testers),invites=new InvitationService(pgInvitations(new PgRepository(db.pool)),matches,testers);
  const team=[starterPlayer('Mila','starter'),starterPlayer('Jun','partner')];
  const invite=await invites.create(A,{requestId:randomUUID(),opponentId:B,team:[starterPlayer('You','starter'),starterPlayer('Partner','partner')],court:'forest',scoring:'rally-doubles',target:3});
  const game=await invites.accept(invite.id,B,{team});
  assert.equal((await invites.get(invite.id,A)).status,'accepted');
  assert.equal(game.roster.you.name,'Mila');
  const action=botAction(game);assert.ok(action);assert.equal((await matches.act(game.id,B,action)).toVersion,1);
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
