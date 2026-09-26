import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,action} from './helpers/remote';
test('native devices rotate atomically, isolate accounts, enforce RLS; badges track turns and endings',async()=>{
 const db=await database();
 try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers);
  const first=randomUUID(),second=randomUUID();
  const register=(id:string,user:string,token:string)=>repo.query("select public.register_push_device($1,$2,$3,'production')",[id,user,token.repeat(64)]);
  await register(first,A,'a');await register(second,A,'b');await register(first,A,'c');
  assert.equal((await repo.query('select * from push_devices where user_id=$1',[A])).rowCount,2);
  assert.equal((await repo.query("select * from push_devices where device_token=$1",['a'.repeat(64)])).rowCount,0);
  await register(first,B,'c');assert.equal((await repo.query('select * from push_devices where user_id=$1',[A])).rowCount,1);
  await Promise.all([register(first,B,'c'),register(randomUUID(),B,'c')]);
  assert.equal((await repo.query('select * from push_devices where user_id=$1',[B])).rowCount,1);
  for(const role of ['anon','authenticated']){
   const c=await db.pool.connect();try{await c.query(`set role ${role}`);
    for(const table of ['push_devices','push_badge_jobs'])await assert.rejects(c.query(`select * from ${table}`),/permission denied/);
    await assert.rejects(c.query('select turn_badge_count($1)',[A]),/permission denied/);
    await assert.rejects(c.query("select register_push_device($1,$2,$3,'production')",[first,A,'a'.repeat(64)]),/permission denied/);
   }finally{await c.query('reset role');c.release();}
  }
  const count=async(user:string)=>(await repo.query('select turn_badge_count($1) as count',[user])).rows[0].count;
  const match=await service.create(A,creation());const other=await service.create(A,creation());
  assert.equal(await count(A),2);assert.equal(await count(B),0);
  await repo.query('select set_async_match_muted($1,$2,true)',[match.id,A]);assert.equal(await count(A),2,'mute does not hide an actionable turn');
  const original=(await repo.query('select revision from push_badge_jobs where user_id=$1',[A])).rows[0].revision;
  await service.act(match.id,A,action(match));
  const after=await repo.get(match.id,A);assert.equal(await count(A),1+(after!.current_action_user_id===A?1:0));assert.equal(await count(B),after!.current_action_user_id===B?1:0);
  await repo.query('delete from push_badge_jobs where user_id=$1 and revision=$2',[A,original]);
  assert.equal((await repo.query('select * from push_badge_jobs where user_id=$1',[A])).rowCount,1,'new mutation survives acknowledgement of old revision');
  await db.pool.query("update async_matches set status='completed',current_action_user_id=null,winner_user_id=home_user_id,completed_at=now() where id=$1",[match.id]);
  assert.equal(await count(A),1);assert.equal(await count(B),0);
  await db.pool.query("update async_matches set friend_state='pending' where id=$1",[other.id]);assert.equal(await count(A),0);
  await db.pool.query('delete from async_matches where id=$1',[other.id]);assert.equal(await count(A),0);
 }finally{await db.close();}
});
