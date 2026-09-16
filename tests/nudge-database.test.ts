import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,creation,action} from './helpers/remote';
test('nudges: real Postgres authorization, elapsed turn clock, persistent per-turn and cross-match limits',async()=>{
 const db=await database();
 try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,new Map([...testers,[C,'C']]));
  const first=await service.create(A,creation()),second=await service.create(A,creation());
  const status=async(id=first.id,actor=B)=>(await repo.query('select public.get_match_nudge_status($1,$2) as value',[id,actor])).rows[0].value;
  const claim=async(id=first.id,actor=B,version=0)=>(await repo.query('select public.claim_match_nudge($1,$2,$3) as value',[id,actor,version])).rows[0].value;
  assert.equal((await status()).state,'waiting');assert.equal((await claim()).accepted,false);
  const testing=await repo.query('select public.get_match_nudge_status($1,$2,true) as value',[first.id,B]);assert.equal(testing.rows[0].value.state,'ready');
  for(let i=0;i<15;i++){const sent=(await repo.query('select public.claim_match_nudge($1,$2,0,true) as value',[first.id,B])).rows[0].value;assert.equal(sent.accepted,true);assert.equal(sent.state,'ready');}
  assert.equal((await repo.query('select public.claim_match_nudge($1,$2,0,true) as value',[first.id,A])).rows[0].value.accepted,false);
  await db.pool.query('delete from public.match_nudges');
  assert.equal((await status(first.id,A)).state,'not_waiting');assert.equal((await claim(first.id,A)).accepted,false);
  await assert.rejects(status(first.id,C),/Match not found/);await assert.rejects(claim(first.id,C),/Match not found/);
  await assert.rejects(repo.query('select public.claim_match_nudge($1,null,0)',[first.id]),/Match not found/);
  assert.equal((await claim(first.id,B,1)).state,'stale');
  await db.pool.query("update public.async_matches set action_ready_at=now()-interval '31 minutes'");
  assert.equal((await status()).state,'ready');
  const before=await repo.get(first.id,A);
  await service.archive(first.id,A,{archived:true});assert.equal((await status()).state,'ready','archiving does not restart the wait');
  const results=await Promise.all([claim(),claim()]);assert.equal(results.filter(r=>r.accepted).length,1);assert.ok(results.every(r=>r.state==='already_nudged'));
  const after=await repo.get(first.id,A);assert.equal(after!.version,before!.version);assert.deepEqual(after!.checkpoint,before!.checkpoint);
  assert.equal((await status()).state,'already_nudged');assert.equal((await status(second.id)).state,'daily_limit');assert.equal((await claim(second.id)).accepted,false);
  await db.restart();assert.equal((await db.pool.query('select public.get_match_nudge_status($1,$2) as value',[first.id,B])).rows[0].value.state,'already_nudged','limit survives restart');
  // Pool changes on restart; subsequent operations use the new connection pool.
  const repo2=new PgRepository(db.pool),service2=new MatchService(repo2,testers);
  const turn=await service2.act(first.id,A,action(first));
  const clock=(await db.pool.query('select action_ready_at,updated_at from public.async_matches where id=$1',[first.id])).rows[0];assert.equal(+clock.action_ready_at,+clock.updated_at);
  const newOwner=turn.state.currentTeam==='home'?A:B;
  const newWaiter=newOwner===A?B:A;
  assert.notEqual((await db.pool.query('select public.get_match_nudge_status($1,$2) as value',[first.id,newWaiter])).rows[0].value.state,'already_nudged');
  assert.equal((await db.pool.query('select public.claim_match_nudge($1,$2,0) as value',[first.id,B])).rows[0].value.state,'stale');
  // The pair cooldown expires after 24 hours.
  await db.pool.query("update public.match_nudges set created_at=now()-interval '25 hours'");
  assert.equal((await db.pool.query('select public.get_match_nudge_status($1,$2) as value',[second.id,B])).rows[0].value.state,'ready');
  await db.pool.query("update public.async_matches set status='completed',current_action_user_id=null,completed_at=now(),winner_user_id=home_user_id where id=$1",[second.id]);
  assert.equal((await db.pool.query('select public.claim_match_nudge($1,$2,0) as value',[second.id,B])).rows[0].value.state,'finished');
 }finally{await db.close();}
});
test('nudges: concurrent different matches share a 24-hour pair limit; roles cannot bypass RPCs',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,new Map([...testers,[C,'C']]));
  const games=await Promise.all([service.create(A,creation()),service.create(A,creation()),service.create(C,{...creation(),opponentId:B})]);
  await db.pool.query("update public.async_matches set action_ready_at=now()-interval '30 minutes'");
  const results=await Promise.all(games.slice(0,2).map(g=>repo.query('select public.claim_match_nudge($1,$2,0) as value',[g.id,B])));
  assert.equal(results.filter(r=>r.rows[0].value.accepted).length,1);assert.equal(results.filter(r=>r.rows[0].value.state==='daily_limit').length,1);
  assert.equal((await repo.query('select public.claim_match_nudge($1,$2,0) as value',[games[2].id,B])).rows[0].value.accepted,true,'different opponent has independent limit');
  await db.pool.query("update public.match_nudges set created_at=now()-interval '25 hours'");
  const winner=games[results.findIndex(r=>r.rows[0].value.accepted)];
  const repeated=(await repo.query('select public.claim_match_nudge($1,$2,0) as value',[winner.id,B])).rows[0].value;
  assert.equal(repeated.state,'already_nudged');assert.equal(repeated.accepted,false,'expired daily cap does not reset per-turn cap');
  for(const role of ['anon','authenticated','service_role']){
   const c=await db.pool.connect();try{
    await c.query(`set role ${role}`);
    await assert.rejects(c.query('insert into public.match_nudges default values'),/permission denied/);
    await assert.rejects(c.query('delete from public.match_nudges'),/permission denied/);
    if(role!=='service_role'){
     await assert.rejects(c.query('select * from public.match_nudges'),/permission denied/);
     await assert.rejects(c.query('select public.get_match_nudge_status($1,$2)',[games[0].id,B]),/permission denied/);
     await assert.rejects(c.query('select public.claim_match_nudge($1,$2,0)',[games[0].id,B]),/permission denied/);
    }
   }finally{await c.query('reset role');c.release();}
  }
  assert.equal((await db.pool.query("select relrowsecurity from pg_class where oid='public.match_nudges'::regclass")).rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
