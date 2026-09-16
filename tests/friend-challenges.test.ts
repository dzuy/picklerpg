import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {publicMatch,MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,creation,action} from './helpers/remote';

test('friend slot exists before account claim; retries, races, cancellation, authorization and durable play',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
 const repo=new PgRepository(db.pool),service=new MatchService(repo,new Map([...testers,[C,'C']]));
 const make=async(actor=A)=>{const m=service.prepare(actor,{...creation(),opponentId:actor===B?A:B});const invite={id:randomUUID(),token:randomBytes(32).toString('base64url'),inviter_id:actor,inviter_name:'Dzuy',invited_name:'Ryan',request_id:randomUUID(),request_hash:'a'.repeat(64)};const create=()=>repo.query('select public.create_friend_challenge($1,$2) as value',[invite,m]);const first=(await create()).rows[0].value;assert.deepEqual((await create()).rows[0].value,first);return first;};
 const i=await make();const before=(await repo.get(i.match_id,A))!;assert.equal(before.away_user_id,null);assert.equal(before.friend_state,'pending');assert.equal((await service.get(i.match_id,A)).choices.length,0);await assert.rejects(service.act(i.match_id,A,action(publicMatch({...before,friend_state:undefined},A))),/not ready/);
 const opening=await service.friendOpening(i.match_id,A);
 const claim=(actor:string,token=i.token,cancel=false)=>repo.query('select public.claim_friend_challenge($1,$2,$3,$4,true,$5) as value',[token,actor,'Ryan',cancel,opening]);
 await assert.rejects(claim(A));await assert.rejects(claim(B,'z'.repeat(43)));
 await assert.rejects(repo.query('select public.claim_friend_challenge($1,$2,$3,false,true,$4)',[i.token,B,'Ryan',before.checkpoint]),/Invalid opening serve/);
 assert.equal((await repo.get(i.match_id,A))!.friend_state,'pending');
 const races=await Promise.allSettled([claim(B),claim(C)]);assert.equal(races.filter(r=>r.status==='fulfilled').length,1);const winner=races[0].status==='fulfilled'?B:C;await claim(winner);const after=(await repo.get(i.match_id,winner))!;assert.equal(after.id,before.id);assert.equal(after.version,0);assert.deepEqual(after.checkpoint.scoring.score,before.checkpoint.scoring.score);assert.equal(after.current_action_user_id,winner);assert.equal(after.checkpoint.openingTeam,'away');assert.equal(after.checkpoint.scoring.server,'opponent-left');assert.equal(after.checkpoint.roster['opponent-left'].design!.name,'Ryan');
 assert.equal((await service.get(i.match_id,A)).choices.length,0);
 let current=await service.get(i.match_id,winner);assert.equal(current.currentTeam,'away');assert.ok(current.choices.every(c=>c.intent.type==='serve'&&c.intent.actor==='opponent-left'));await assert.rejects(service.act(i.match_id,A,action(current)),/Wait for your turn/);current=(await service.act(i.match_id,winner,action(current))).state;assert.equal(current.version,1);assert.equal((await repo.get(i.match_id,winner))!.version,1);
 const snapshot=structuredClone((await repo.get(i.match_id,winner))!);await claim(winner);assert.deepEqual(await repo.get(i.match_id,winner),snapshot);
 await db.pool.query("insert into public.players(owner_id,id,name,appearance,skills,handedness) values($1,'ryan-character','Rally Ryan',$2,$3,'right')",[winner,snapshot.checkpoint.roster['opponent-left'].design!.appearance,snapshot.checkpoint.roster['opponent-left'].skills]);
 const changed=(await repo.get(i.match_id,winner))!;assert.equal(changed.checkpoint.roster['opponent-left'].design!.name,'Rally Ryan');assert.equal(changed.version,snapshot.version);assert.deepEqual(changed.checkpoint.scoring,snapshot.checkpoint.scoring);assert.deepEqual(changed.checkpoint.rally,snapshot.checkpoint.rally);assert.equal(changed.away_user_id,winner);
 let playing=await service.get(i.match_id,changed.current_action_user_id!);for(let turn=0;turn<600&&playing.status!=='completed';turn++){const actor=playing.currentTeam==='home'?A:winner;playing=await service.get(i.match_id,actor);playing=(await service.act(i.match_id,actor,action(playing,turn))).state;}assert.equal(playing.status,'completed');
 const events=(await db.pool.query('select event from public.invite_events where invite_id=$1',[i.id])).rows.map(r=>r.event);for(const event of ['invite_created','invite_accepted','guest_first_turn_completed','guest_character_created','guest_game_completed'])assert.ok(events.includes(event),event);
 const onward=await make(winner);assert.equal((await db.pool.query("select count(*) from public.invite_events where actor_id=$1 and event='guest_sent_first_invite'",[winner])).rows[0].count,1);assert.ok(onward.match_id!==i.match_id);
 const cancelled=await make();await claim(A,cancelled.token,true);await assert.rejects(claim(B,cancelled.token));
 for(const role of ['anon','authenticated']){const c=await db.pool.connect();try{await c.query(`set role ${role}`);await assert.rejects(c.query('select * from public.friend_challenges'),/permission denied/);await assert.rejects(c.query('select public.claim_friend_challenge($1,$2,$3,false)',[i.token,B,'Ryan']),/permission denied/);}finally{await c.query('reset role');c.release();}}
 }finally{await db.close();}
});
