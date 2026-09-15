import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,creation} from './helpers/remote';
test('push migration: RLS, multiple devices, endpoint uniqueness and atomic retry claims',async()=>{
 const db=await database();
 try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),match=await service.create(A,creation());
  for(const role of ['anon','authenticated']){
   const c=await db.pool.connect();try{await c.query(`set role ${role}`);
    for(const table of ['push_subscriptions','turn_push_claims']){
     await assert.rejects(c.query(`select * from public.${table}`),/permission denied/);
     await assert.rejects(c.query(`insert into public.${table} default values`),/permission denied/);
     await assert.rejects(c.query(`delete from public.${table}`),/permission denied/);
    }
    await assert.rejects(c.query('select public.claim_turn_push($1,0,$2)',[match.id,A]),/permission denied/);
   }finally{await c.query('reset role');c.release();}
  }
  await repo.query("insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values($1,'device1','key','auth'),($1,'device2','key','auth')",[A]);
  await assert.rejects(repo.query("insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values($1,'device1','key','auth')",[B]),/duplicate key/);
  const claim=(version:number,user=A)=>repo.query('select public.claim_turn_push($1,$2,$3) as claimed',[match.id,version,user]);
  assert.equal((await claim(0,C)).rows[0].claimed,false);assert.equal((await claim(1)).rows[0].claimed,false);
  const results=await Promise.all([claim(0),claim(0)]);assert.equal(results.filter(r=>r.rows[0].claimed).length,1);
  assert.equal((await claim(0)).rows[0].claimed,false);
  await db.pool.query("update public.async_matches set status='completed',current_action_user_id=null,completed_at=now(),winner_user_id=home_user_id where id=$1",[match.id]);assert.equal((await claim(0)).rows[0].claimed,false);
 }finally{await db.close();}
});
