import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {A,B,C,creation,action,testers} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
test('archive and restore are durable participant preferences, independent of turns and opponents',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),game=await service.create(A,creation());
  const before=await repo.get(game.id,A);
  await service.archive(game.id,A,{archived:true});await service.archive(game.id,A,{archived:true});
  assert.equal((await service.list(A))[0].archived,true);assert.equal((await service.list(B))[0].archived,false);
  const after=await repo.get(game.id,A);assert.deepEqual(after?.checkpoint,before?.checkpoint);assert.equal(after?.version,before?.version);assert.deepEqual(after?.updated_at,before?.updated_at);
  await assert.rejects(service.archive(game.id,C,{archived:true}));
  await assert.rejects(repo.setArchived(game.id,C,true));
  for(const input of [{archived:'true'},{archived:true,actor:B},{}])await assert.rejects(service.archive(game.id,A,input));
  await service.act(game.id,A,action(game));assert.equal((await service.get(game.id,A)).archived,true);
  await service.archive(game.id,B,{archived:true});await service.archive(game.id,A,{archived:false});
  assert.equal((await service.get(game.id,A)).archived,false);assert.equal((await service.get(game.id,B)).archived,true);
  await db.restart();const restored=new MatchService(new PgRepository(db.pool),testers);assert.equal((await restored.get(game.id,B)).archived,true);
  const c=await db.pool.connect();try{await c.query('set role authenticated');await assert.rejects(c.query('select public.set_async_match_archived($1,$2,true)',[game.id,A]));}finally{await c.query('reset role');c.release()}
 }finally{await db.close()}
});
