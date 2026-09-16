import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {cleanTrashTalk,replayTrashTalk,type TrashTalk} from '../src/multiplayer/trash-talk';
import {parseTrashTalk} from '../server/multiplayer/trash-talk';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,creation,action} from './helpers/remote';
test('trash talk filters whole words before storage and validates Unicode length',()=>{
 assert.equal(cleanTrashTalk('  SHIT! That fucking shot.  '),'!@#$%! That !@#$% shot.');
 assert.equal(cleanTrashTalk('classic pass grass'), 'classic pass grass');
 assert.equal(cleanTrashTalk('ｆｕｃｋ sh\u200bit'),'!@#$% !@#$%');
 assert.equal(parseTrashTalk({id:randomUUID(),text:'😎'.repeat(40)}).text.length,80);
 for(const text of ['', ' '.repeat(40),'a'.repeat(41)])assert.throws(()=>parseTrashTalk({id:randomUUID(),text}));
 assert.throws(()=>parseTrashTalk({id:'bad',text:'Hello'}));
});
test('replay ties messages to the next move, replaces bubbles, and supports scrubbing',()=>{
 const messages:TrashTalk[]=[{id:'1',player:'you',text:'First',version:3,createdAt:''},{id:'2',player:'you',text:'Second',version:3,createdAt:''},{id:'3',player:'opponent-left',text:'Nice try!',version:3,createdAt:''},{id:'4',player:'you',text:'Next move',version:4,createdAt:''}];
 assert.deepEqual(replayTrashTalk(messages,4,0).map(m=>m.id),['2','3']);
 assert.deepEqual(replayTrashTalk(messages,4,4.999).map(m=>m.id),['2','3']);
 assert.deepEqual(replayTrashTalk(messages,4,5),[]);
});
test('trash talk database: membership, concurrent cooldown, idempotency, replay persistence, and isolated gameplay',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),match=await service.create(A,creation());
  const send=async(actor:string,id=randomUUID(),text='Nice try!')=>(await repo.query('select public.send_match_trash_talk($1,$2,$3,$4) as value',[match.id,actor,id,text])).rows[0].value;
  const feed=async(actor:string)=>(await repo.query('select public.get_match_trash_talk($1,$2) as value',[match.id,actor])).rows[0].value;
  await assert.rejects(send(C),/Match not found/);await assert.rejects(feed(C),/Match not found/);
  const before=await repo.get(match.id,A),id=randomUUID();
  const first=await send(A,id);assert.equal(first.messages[0].player,'you');assert.equal(first.messages[0].version,0);
  assert.equal((await send(A,id)).messages.length,1);
  await assert.rejects(send(A,id,'Changed'),/Message conflict/);await assert.rejects(send(A),/Chat cooldown/);
  const concurrent=await Promise.allSettled([send(B),send(B)]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
  const after=await repo.get(match.id,A);assert.equal(after!.version,before!.version);assert.deepEqual(after!.checkpoint,before!.checkpoint);assert.deepEqual(after!.updated_at,before!.updated_at);
  assert.deepEqual((await feed(B)).messages.map((m:TrashTalk)=>m.player),['you','opponent-left']);
  await service.act(match.id,A,action(match));assert.equal((await feed(A)).messages.length,2,'messages remain for next move replay');
  await db.restart();assert.equal((await db.pool.query('select count(*) from public.match_trash_talk')).rows[0].count,2);
  const c=await db.pool.connect();try{await c.query('set role authenticated');await assert.rejects(c.query('select * from public.match_trash_talk'),/permission denied/);await assert.rejects(c.query('select public.get_match_trash_talk($1,$2)',[match.id,A]),/permission denied/);}finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
