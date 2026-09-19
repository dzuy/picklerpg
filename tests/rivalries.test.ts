import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {A,B,C,creation,testers,action,MemoryRepository} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
import {publicRivalry} from '../server/multiplayer/rivalries';
import {parseMatchRivalry} from '../src/multiplayer/rivalry';
import {SupabaseMatchRepository} from '../server/multiplayer/repository';

// Deliberate authoritative database fixtures for long, precisely ordered histories.
// Actual engine completion, retries, and rollback are covered in the second test.
async function fixture(repo:PgRepository,home=A,away=B){
 const service=new MatchService(repo,new Map([...testers,[C,'C']]));
 return repo.create(service.prepare(home,{...creation(),opponentId:away}));
}
async function finish(pool:any,row:any,winner:string,time:string,score=[3,1]){
 const c=structuredClone(row.checkpoint),team=winner===row.home_user_id?'home':'away';
 c.scoring.winner=team;c.scoring.score={home:team==='home'?score[0]:score[1],away:team==='away'?score[0]:score[1]};
 c.rally.kind='point-end';c.rally.state.phase='complete';c.rally.state.stage='point-end';c.rally.state.result={winner:team,reason:'winner'};c.rally.state.score=c.scoring.score;
 await pool.query("update public.async_matches set status='completed',current_action_user_id=null,completed_at=$2,winner_user_id=$3,checkpoint=$4 where id=$1",[row.id,time,winner,c]);
}
const when=(n:number)=>new Date(Date.UTC(2026,8,18,12,n)).toISOString();

test('rivalry histories normalize orientation, retain as-of snapshots, rebuild, and protect private pairs',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  let repo=new PgRepository(db.pool);const rows=[];
  const winners=[A,A,A,B,B,B,A];
  for(let i=0;i<winners.length;i++){
   const row=await fixture(repo,i%2?B:A,i%2?A:B);rows.push(row);await finish(db.pool,row,winners[i],when(i),i===6?[3,2]:[3,1]);
  }
  const history=publicRivalry((await repo.rivalries(A,[rows[0].id,rows[6].id]))[rows[6].id]);
  assert.equal(history.current?.games,7);assert.equal(history.current?.wins,4);assert.equal(history.current?.losses,3);
  assert.deepEqual(history.current?.bestStreak,{you:3,opponent:3});assert.deepEqual(history.current?.streak,{owner:'you',length:1});
  assert.deepEqual(history.current?.previousStreak,{owner:'opponent',length:3});assert.deepEqual(history.current?.milestones,[2,3,5]);
  assert.equal(history.current?.closest.matchId,rows[6].id);
  assert.deepEqual(history.current?.recent.map(r=>r.matchId),rows.toReversed().map(r=>r.id));
  const fifth=publicRivalry((await repo.rivalries(A,[rows[4].id]))[rows[4].id]).atCompletion!;
  assert.deepEqual([fifth.wins,fifth.losses],[3,2]);
  const tie=publicRivalry((await repo.rivalries(A,[rows[5].id]))[rows[5].id]).atCompletion!;
  assert.deepEqual([tie.wins,tie.losses],[3,3]);assert.deepEqual(tie.streak,{owner:'opponent',length:3});
  const broken=publicRivalry((await repo.rivalries(A,[rows[3].id]))[rows[3].id]).atCompletion!;
  assert.deepEqual(broken.previousStreak,{owner:'you',length:3});assert.deepEqual(broken.streak,{owner:'opponent',length:1});
  const first=publicRivalry((await repo.rivalries(A,[rows[0].id]))[rows[0].id]);assert.equal(first.atCompletion?.games,1);assert.equal(first.current?.games,7);
  const away=publicRivalry((await repo.rivalries(B,[rows[6].id]))[rows[6].id]);assert.equal(away.current?.wins,3);assert.equal(away.current?.losses,4);
  assert.deepEqual(away.current?.streak,{owner:'opponent',length:1});assert.deepEqual(away.current?.recent[0].score,{you:2,opponent:3});
  assert.deepEqual(await repo.rivalries(C,rows.map(r=>r.id)),{});
  assert.deepEqual(parseMatchRivalry(history),history);
  assert.throws(()=>parseMatchRivalry({...history,current:{...history.current,wins:100}}));
  assert.throws(()=>parseMatchRivalry({...history,current:{...history.current,definitionVersion:2}}));
  assert.throws(()=>parseMatchRivalry({...history,current:{...history.current,recent:[history.current!.recent[0],history.current!.recent[0]]}}));
  await repo.setArchived(rows[0].id,A,true);assert.deepEqual(publicRivalry((await repo.rivalries(A,[rows[6].id]))[rows[6].id]),history);
  const left=await fixture(repo);await repo.query('select public.leave_async_match($1,$2)',[left.id,A]);
  assert.deepEqual(publicRivalry((await repo.rivalries(A,[left.id]))[left.id]),{current:history.current,atCompletion:null});
  // A separate opponent never contributes to this pair.
  const other=await fixture(repo,A,C);await finish(db.pool,other,C,when(8));
  assert.deepEqual(publicRivalry((await repo.rivalries(A,[rows[6].id]))[rows[6].id]),history);
  const before=(await db.pool.query('select * from public.async_rivalry_results order by match_id')).rows;
  await db.pool.query('delete from public.async_rivalry_results; delete from public.async_rivalries');
  const page=(await repo.query('select public.rebuild_async_rivalries(null,null,1) as value')).rows[0].value;
  assert.equal(page.processed,1);
  const next=(await repo.query('select public.rebuild_async_rivalries($1,$2,1) as value',[page.afterLow,page.afterHigh])).rows[0].value;assert.equal(next.processed,1);
  assert.equal((await repo.query('select public.rebuild_async_rivalries($1,$2,1) as value',[next.afterLow,next.afterHigh])).rows[0].value.processed,0);
  assert.deepEqual((await db.pool.query('select * from public.async_rivalry_results order by match_id')).rows,before);
  await repo.query('select public.rebuild_async_rivalry($1,$2)',[B,A]);
  assert.deepEqual((await db.pool.query('select * from public.async_rivalry_results order by match_id')).rows,before);
  await db.restart();repo=new PgRepository(db.pool);
  assert.deepEqual(publicRivalry((await repo.rivalries(A,[rows[6].id]))[rows[6].id]),history);
  // The guest's account ID stays the pair key when registration updates metadata.
  await db.pool.query("update auth.users set raw_user_meta_data='{\"player_name\":\"Registered guest\"}' where id=$1",[B]);
  assert.deepEqual(publicRivalry((await repo.rivalries(B,[rows[6].id]))[rows[6].id]),away);
  for(const role of ['anon','authenticated']){
   const client=await db.pool.connect();try{await client.query(`set role ${role}`);
    for(const table of ['async_rivalries','async_rivalry_results']){
     for(const sql of [`select * from public.${table}`,`insert into public.${table} default values`,`delete from public.${table}`,`update public.${table} set low_user_id=low_user_id`])await assert.rejects(client.query(sql),/permission denied/);
    }
    await assert.rejects(client.query('select public.get_async_rivalries($1,$2)',[A,[rows[0].id]]),/permission denied/);
    await assert.rejects(client.query('select public.rebuild_async_rivalry($1,$2)',[A,B]),/permission denied/);
    await assert.rejects(client.query('select public.rebuild_async_rivalries()'),/permission denied/);
   }finally{await client.query('reset role');client.release();}
  }
  await assert.rejects(repo.query('delete from public.async_rivalries'),/permission denied/);
 }finally{await db.close();}
});

test('real completion commits rivalry atomically; old action retries cannot count twice',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers);let state=await service.create(A,creation());
  const original=action(state),originalReceipt=await service.act(state.id,A,original);state=originalReceipt.state;
  assert.equal((await service.get(state.id,A)).rivalry?.current,null);
  let final:any;
  for(let i=0;i<600&&state.status==='active';i++){
   const actor=state.currentTeam==='home'?A:B;state=await service.get(state.id,actor);
   const request=action(state,i);const result=await service.act(state.id,actor,request);state=result.state;final={actor,request,result};
  }
  assert.equal(state.status,'completed');
  const completed=await service.get(state.id,A);assert.equal(completed.rivalry?.current?.games,1);assert.equal(completed.rivalry?.atCompletion?.games,1);
  assert.deepEqual(await service.act(state.id,A,original),originalReceipt);
  await Promise.all(Array.from({length:6},()=>service.act(state.id,final.actor,final.request)));
  assert.equal((await service.get(state.id,B)).rivalry?.current?.games,1);
  assert.equal((await db.pool.query('select count(*) from public.async_rivalry_results')).rows[0].count,1);
  // Fail the projection write inside a normal final action's transaction.
  const active=await fixture(repo),checkpoint=structuredClone((await repo.get(state.id,A))!.checkpoint);
  checkpoint.matchId=active.id;checkpoint.revision=1;
  await db.pool.query("create function public.reject_rivalry_test() returns trigger language plpgsql as $$begin raise exception 'injected rivalry failure';end$$;create trigger reject_rivalry_test before insert or update on public.async_rivalries for each row execute function public.reject_rivalry_test();");
  const request=action(await service.get(active.id,A));
  await assert.rejects(repo.commit({match:{...active,checkpoint,status:'completed',current_action_user_id:null},actor:A,hash:'a'.repeat(64),actionId:request.actionId,expectedVersion:0,action:request.action}),/injected rivalry failure/);
  assert.equal((await repo.get(active.id,A))!.status,'active');assert.equal(await repo.receipt(active.id,request.actionId),null);
  assert.equal((await db.pool.query('select count(*) from public.shot_selection_events where match_id=$1',[active.id])).rows[0].count,0);
  assert.equal((await service.get(state.id,A)).rivalry?.current?.games,1);
 }finally{await db.close();}
});

test('simultaneous pair completions and rebuilding preserve stable timestamp/ID order',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);const repo=new PgRepository(db.pool);
  const rows=await Promise.all(Array.from({length:12},(_,i)=>fixture(repo,i%2?B:A,i%2?A:B)));
  await Promise.all(rows.map((row,i)=>finish(db.pool,row,i%3?A:B,when(Math.floor(i/2)))));
  const last=rows.toSorted((a,b)=>{
   const ai=rows.indexOf(a),bi=rows.indexOf(b);return Math.floor(ai/2)-Math.floor(bi/2)||a.id.localeCompare(b.id);
  }).at(-1)!;
  const before=(await db.pool.query('select * from public.async_rivalries')).rows;
  const history=publicRivalry((await repo.rivalries(A,[last.id]))[last.id]);assert.equal(history.current?.games,12);assert.equal(history.current?.wins,8);assert.equal(history.current?.recent.length,10);assert.deepEqual(history.current?.milestones,[2,3,5,10]);
  await repo.query('select public.rebuild_async_rivalry($1,$2)',[A,B]);assert.deepEqual((await db.pool.query('select * from public.async_rivalries')).rows,before);
  const another=await fixture(repo);
  await Promise.all([finish(db.pool,another,B,when(30)),repo.query('select public.rebuild_async_rivalry($1,$2)',[A,B])]);
  assert.equal(publicRivalry((await repo.rivalries(A,[another.id]))[another.id]).current?.games,13);
  await db.pool.query('update public.async_matches set status=status where id=$1',[another.id]);
  assert.equal(publicRivalry((await repo.rivalries(A,[another.id]))[another.id]).current?.games,13);
 }finally{await db.close();}
});

test('match reads batch rivalry data, strictly parse it, and isolate unavailable history',async()=>{
 const repo=new MemoryRepository(),service=new MatchService(repo,testers);
 const a=await service.create(A,creation()),b=await service.create(A,creation());let calls=0;
 (repo as any).rivalries=async(actor:string,ids:string[])=>{calls++;assert.equal(actor,A);assert.deepEqual(ids.sort(),[a.id,b.id].sort());return Object.fromEntries(ids.map(id=>[id,{viewerIsLow:true,current:null,atCompletion:null}]));};
 assert.ok((await service.list(A)).every(m=>m.rivalry?.current===null));assert.equal(calls,1);
 (repo as any).rivalries=async()=>{throw Error('offline');};assert.equal((await service.get(a.id,A)).rivalry,undefined);
 (repo as any).rivalries=async()=>({[a.id]:{viewerIsLow:true,current:{games:99,privateCheckpoint:'no'},atCompletion:null}});
 assert.equal((await service.get(a.id,A)).rivalry,undefined);
 assert.throws(()=>parseMatchRivalry({current:null,atCompletion:null,checkpoint:{}}));
 assert.throws(()=>parseMatchRivalry({current:{definitionVersion:2},atCompletion:null}));
 const batches:number[]=[];
 const client:any={rpc:async(name:string,input:any)=>{assert.equal(name,'get_async_rivalries');batches.push(input.p_match_ids.length);return {data:{},error:null};}};
 await new SupabaseMatchRepository(client).rivalries(A,Array(205).fill(a.id));assert.deepEqual(batches,[100,100,5]);
});
