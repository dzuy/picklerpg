import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {A,B,creation,testers} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
test('summary pages are bounded, stable across updates, private, and do not deserialize historical engines',async()=>{
 const db=await database();try{
  const other=randomUUID();await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,other]);
  const repo=new PgRepository(db.pool);
  const service=new MatchService(Object.assign(repo,{summaries:async(actor:string,filter:string,time:string|null,id:string|null)=>(await repo.query('select public.list_match_summaries($1,$2,$3,$4) as value',[actor,filter,time,id])).rows[0].value}),testers);
  const ids:string[]=[];for(let i=0;i<53;i++)ids.push((await service.create(A,{...creation(),creationId:randomUUID()})).id);
  // Neither bad history nor an old engine needs reconstruction to display the list.
  await db.pool.query("update async_matches set engine_version='legacy',checkpoint=checkpoint #- '{rally}' where id=$1",[ids[0]]);
  const page=await service.summaries(A,new URLSearchParams());assert.equal(page.matches.length,50);assert.ok(page.nextCursor);
  const text=JSON.stringify(page);for(const field of ['resolution_secret','checkpoint','animation','choices','shotHistory'])assert.ok(!text.includes(`\"${field}\"`));
  await db.pool.query('update async_matches set updated_at=now() where id=$1',[ids[0]]);
  const last=await service.summaries(A,new URLSearchParams({cursor:page.nextCursor!}));assert.equal(last.matches.length,3);assert.equal(last.nextCursor,null);
  assert.equal(new Set([...page.matches,...last.matches].map(g=>g.id)).size,53);
  assert.equal((await service.summaries(other,new URLSearchParams())).matches.length,0);
  await service.archive(ids[0],A,{archived:true});
  const archived=await service.summaries(A,new URLSearchParams({filter:'archived'}));assert.equal(archived.matches[0].id,ids[0]);
  assert.equal((await service.summaries(B,new URLSearchParams({filter:'archived'}))).matches.length,0);
  const c=await db.pool.connect();try{await c.query('set role authenticated');await assert.rejects(c.query("select list_match_summaries($1,'active')",[A]),/permission denied/);}finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
