import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,creation,action} from './helpers/remote';

test('real Postgres: all migrations, role restrictions, races, rollback, durable receipts and completion',async()=>{
 const db=await database();
 try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  let repository=new PgRepository(db.pool),service=new MatchService(repository,testers);const input=creation();
  const [s,t]=await Promise.all([service.create(A,input),service.create(A,input)]);assert.equal(s.id,t.id);
  for(const role of ['anon','authenticated']){
   const c=await db.pool.connect();try{await c.query(`set role ${role}`);
    for(const table of ['async_matches','async_match_actions']){
     await assert.rejects(c.query(`select * from public.${table}`),/permission denied/);
     await assert.rejects(c.query(`delete from public.${table}`),/permission denied/);
     await assert.rejects(c.query(`insert into public.${table} default values`),/permission denied/);
    }
    await assert.rejects(c.query('select public.create_async_test_match($1)',[{}]),/permission denied/);
    await assert.rejects(c.query('select public.commit_async_match_action($1,$2,$3,$4,0,$5,null,$6,null,$7,$8)',[s.id,A,randomUUID(),'0'.repeat(64),{},'active','[]',{}]),/permission denied/);
   }finally{await c.query('reset role');c.release();}
  }
  assert.deepEqual((await db.pool.query("select relrowsecurity from pg_class where relname in ('async_matches','async_match_actions')")).rows,[{relrowsecurity:true},{relrowsecurity:true}]);
  await assert.rejects(repository.query('update public.async_matches set version=4'),/permission denied/);
  const a=action(s),b=action(s);
  const raced=await Promise.allSettled([service.act(s.id,A,a),service.act(s.id,A,b)]);assert.equal(raced.filter(r=>r.status==='fulfilled').length,1);
  const rejected=raced.find(r=>r.status==='rejected') as PromiseRejectedResult;assert.equal(rejected.reason.code,'PT409');
  const accepted=raced[0].status==='fulfilled'?a:b,receipt=raced.find(r=>r.status==='fulfilled')! as PromiseFulfilledResult<any>;
  assert.equal((await db.pool.query('select count(*) from public.async_match_actions')).rows[0].count,1);
  await db.restart();repository=new PgRepository(db.pool);service=new MatchService(repository,testers);
  assert.deepEqual(await service.act(s.id,A,accepted),receipt.value);
  const old=await repository.get(s.id,A);assert.ok(old);
  // A failing second statement rolls back the already inserted receipt in the same RPC.
  await db.pool.query("create function public.reject_test_update() returns trigger language plpgsql as $$begin raise exception 'injected write failure'; end$$; create trigger reject_test_update before update on public.async_matches for each row execute function public.reject_test_update();");
  let current=await service.get(s.id,old.current_action_user_id!);const next=action(current),actor=old.current_action_user_id!;
  await assert.rejects(service.act(s.id,actor,next),/injected write failure/);assert.equal((await repository.get(s.id,A))!.version,1);assert.equal(await repository.receipt(s.id,next.actionId),null);
  await db.pool.query('drop trigger reject_test_update on public.async_matches');
  const [retry,duplicate]=await Promise.all([service.act(s.id,actor,next),service.act(s.id,actor,next)]);assert.deepEqual(retry,duplicate);current=retry.state;
  for(let i=0;i<600&&current.status!=='completed';i++){const who=current.currentTeam==='home'?A:B;current=await service.get(s.id,who);current=(await service.act(s.id,who,action(current,i))).state;}
  assert.equal(current.status,'completed');const row=(await repository.get(s.id,A))!;assert.ok(row.completed_at);assert.equal(row.current_action_user_id,null);
  assert.deepEqual(await service.act(s.id,A,accepted),receipt.value);await assert.rejects(service.get(s.id,C));
  assert.equal((await db.pool.query('select count(*) from public.async_match_actions where match_id=$1',[s.id])).rows[0].count,row.version);
  assert.equal((await db.pool.query('select count(*) from public.match_history')).rows[0].count,0);
 }finally{await db.close();}
});
