import test from 'node:test';import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {A,B,C,testers,creation,action} from './helpers/remote';
import {MatchService,publicMatch} from '../server/multiplayer/service';
test('leaving atomically ends and archives only your copy; outsiders and later turns are rejected',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),game=await service.create(A,creation());
  await assert.rejects(db.pool.query('select public.leave_async_match($1,$2)',[game.id,C]));
  await db.pool.query('select public.leave_async_match($1,$2)',[game.id,A]);
  const row=await repo.get(game.id,A);assert.equal(row!.status,'completed');assert.equal(row!.current_action_user_id,null);assert.equal(row!.archived_home,true);assert.equal(row!.archived_away,false);assert.equal(publicMatch(row!,A).endedEarly,true);assert.deepEqual(publicMatch(row!,A).score,game.score);
  await assert.rejects(service.act(game.id,A,action(game)));
  await db.pool.query('select public.leave_async_match($1,$2)',[game.id,A]);assert.equal((await repo.get(game.id,A))!.version,row!.version);
 }finally{await db.close();}
});
