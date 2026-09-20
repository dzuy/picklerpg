import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,creation} from './helpers/remote';
test('match mute persists independently per participant without changing the turn',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),game=await service.create(A,creation());
  await repo.query('select public.set_async_match_muted($1,$2,true)',[game.id,A]);
  assert.equal((await service.get(game.id,A)).notificationsMuted,true);
  assert.equal((await service.get(game.id,B)).notificationsMuted,false);
  assert.equal((await service.get(game.id,A)).version,game.version);
  await assert.rejects(repo.query('select public.set_async_match_muted($1,$2,true)',[game.id,C]),/not found/);
  await repo.query('select public.set_async_match_muted($1,$2,false)',[game.id,A]);
  assert.equal((await service.get(game.id,A)).notificationsMuted,false);
  await db.pool.query('set role authenticated');
  await assert.rejects(db.pool.query('select public.set_async_match_muted($1,$2,true)',[game.id,A]),/permission denied/);
 }finally{await db.close();}
});
