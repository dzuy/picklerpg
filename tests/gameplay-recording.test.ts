import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {gameplayRecord} from '../src/persistence/gameplay-record';
import {GameplaySync} from '../src/persistence/gameplay-sync';
import {OpenPlayStore} from '../src/persistence/open-play-store';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,creation,testers,action} from './helpers/remote';
import {randomUUID} from 'node:crypto';
const memory=()=>{const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v)},removeItem:(k:string)=>{m.delete(k)}}};

test('gameplay projection excludes names, appearance and hypothetical options',()=>{
 const m=new Match(),c=m.exportCheckpoint(),record=gameplayRecord(c);
 assert.equal(record.events.filter(e=>e.type==='shot').length,0);
 assert.equal(record.executions.length,0);
 assert.ok(Object.values(record.roster).every(p=>p.rating>=2&&Object.keys(p.skills).length===11));
 const text=JSON.stringify(record);for(const key of ['appearance','catchphrase','offered','options'])assert.ok(!text.includes(`"${key}"`));
});

test('durable uploads retry after failure and reload, deduplicate, and isolate accounts',async()=>{
 const storage=memory(),store=new OpenPlayStore(storage,'a'),m=new Match();store.save(m.exportCheckpoint(),'forest');
 let attempts=0;
 const upload=async()=>{attempts++;if(attempts===1)throw new Error('offline')};
 const sync=new GameplaySync(store,storage,'a',upload);
 await assert.rejects(sync.flush(),/offline/);
 await new GameplaySync(store,storage,'a',upload).flush();assert.equal(attempts,2);
 await sync.flush();assert.equal(attempts,2);
 await new GameplaySync(new OpenPlayStore(storage,'b'),storage,'b',upload).flush();assert.equal(attempts,2);
 m.onCheckpoint=(c,played)=>store.save(c,'forest',played);m.submitIntent(m.availableIntents[0]);
 await sync.flush();assert.equal(attempts,3);
 assert.equal(store.load(m.matchId)!.analysis!.points[0].telemetry!.executions.length,1);
});

test('cloud gameplay stores retries once, rejects stale records and isolates client authority',async()=>{
 const db=await database();try{
  const owner=randomUUID(),other=randomUUID();await db.pool.query('insert into auth.users(id) values($1),($2)',[owner,other]);
  const m=new Match(),r=gameplayRecord(m.exportCheckpoint());
  const c=await db.pool.connect();try{
   await c.query('set role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
   await c.query('select record_solo_gameplay($1)',[r]);await c.query('select record_solo_gameplay($1)',[r]);
   await assert.rejects(c.query('select * from gameplay_rallies'),/permission denied/);
   await assert.rejects(c.query("select store_gameplay_record('friends-server',$1,$2,0)",[owner,r]),/permission denied/);
   await assert.rejects(c.query('select record_solo_gameplay($1)',[{...r,events:{}}]),/Invalid/);
   await c.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await c.query('select record_solo_gameplay($1)',[r]);
  }finally{await c.query('reset role');c.release();}
  assert.equal((await db.pool.query('select * from gameplay_rallies')).rowCount,2);
  const later={...r,revision:2,complete:true,gameComplete:true,score:{home:7,away:5},events:[{type:'shot',shotIndex:0,intent:{...m.availableIntents[0],power:.9},contact:{x:0,y:1,z:7}},{type:'point-end',result:{winner:'home',reason:'winner'}}],executions:[]};
  await db.pool.query("select store_gameplay_record('solo-client',$1,$2,2)",[owner,later]);
  await db.pool.query("select store_gameplay_record('solo-client',$1,$2,0)",[owner,r]);
  const saved=(await db.pool.query('select * from gameplay_games where owner_id=$1',[owner])).rows[0];
  assert.equal(saved.complete_event_coverage,true);assert.equal(Number(saved.shots),1);
  assert.equal(Number((await db.pool.query('select power from gameplay_shots where owner_id=$1',[owner])).rows[0].power),.9);
 }finally{await db.close();}
});


test('Friends actions capture every closing rally before advancing and retries do not duplicate',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers);
  let game=await service.create(A,creation());
  for(let i=0;i<60&&game.status!=='completed';i++){
   const actor=game.currentTeam==='home'?A:B;game=await service.get(game.id,actor);
   const request=action(game,i),receipt=await service.act(game.id,actor,request);
   await service.act(game.id,actor,request);game=receipt.state;
  }
  const rows=(await db.pool.query("select * from gameplay_rallies where source='friends-server' and game_id=$1 order by point_index",[game.id])).rows;
  assert.ok(rows.length>1);
  assert.ok(rows.slice(0,-1).every(r=>r.record.complete&&r.record.events.some((e:any)=>e.type==='point-end')));
  assert.ok(rows.every(r=>r.record.accountControllers.home==='human'&&r.record.accountControllers.away==='human'));
  for(const r of rows){const indices=r.record.events.filter((e:any)=>e.type==='shot').map((e:any)=>e.shotIndex);assert.equal(new Set(indices).size,indices.length);}
  const early=await service.create(A,creation());await service.act(early.id,A,action(early));
  await db.pool.query('select leave_async_match($1,$2)',[early.id,A]);
  assert.equal((await db.pool.query('select ended_early from gameplay_games where game_id=$1',[early.id])).rows[0].ended_early,true);

 }finally{await db.close();}
});
