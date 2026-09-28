import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,type IncomingMessage} from 'node:http';
import {memoryRateLimits,clientAddress} from '../server/multiplayer/rate-limit';
import {createMatchHandler} from '../server/multiplayer/routes';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,action,MemoryRepository} from './helpers/remote';
import {database} from './helpers/postgres';
test('quota resets and independent players remain available beyond 5000 counters',async()=>{
 let now=0;const limit=memoryRateLimits(()=>now);
 assert.equal(await limit('a',1),0);assert.equal(await limit('a',1),60);
 for(let i=0;i<6000;i++)assert.equal(await limit(`user:${i}`,1),0);
 now=61000;assert.equal(await limit('a',1),0);
});
test('forwarded addresses are ignored unless trusted hops are configured',()=>{
 const req={socket:{remoteAddress:'10.0.0.1'},headers:{'x-forwarded-for':'1.2.3.4, 5.6.7.8'}} as IncomingMessage;
 assert.equal(clientAddress(req),'10.0.0.1');assert.equal(clientAddress(req,1),'5.6.7.8');
 assert.equal(clientAddress(req,3),'10.0.0.1');
});
test('exhausted reads cannot block a turn or another account sharing the connection address',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),match=await service.create(A,creation());
 const server=createServer(createMatchHandler(service,async token=>token));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{
  for(let i=0;i<300;i++){const r=await fetch(base+'/api/multiplayer/push/native/config',{headers:{Authorization:`Bearer ${A}`}});await r.text();assert.equal(r.status,200);}
  const blocked=await fetch(base+'/api/multiplayer/push/native/config',{headers:{Authorization:`Bearer ${A}`}});
  assert.equal(blocked.status,429);assert.ok(Number(blocked.headers.get('Retry-After'))>0);await blocked.text();
  const other=await fetch(base+'/api/multiplayer/push/native/config',{headers:{Authorization:`Bearer ${B}`}});assert.equal(other.status,200);await other.text();
  const turn=await fetch(base+`/api/matches/${match.id}/actions`,{method:'POST',headers:{Authorization:`Bearer ${A}`,'Content-Type':'application/json'},body:JSON.stringify(action(match))});assert.equal(turn.status,200);await turn.text();
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('database counters enforce one allowance across concurrent connections and reset',async()=>{
 const db=await database();try{
  const key='a'.repeat(64);
  const results=await Promise.all(Array.from({length:30},()=>db.pool.query('select public.consume_api_rate_limit($1,10) as delay',[key])));
  assert.equal(results.filter(r=>r.rows[0].delay===0).length,10);
  assert.ok(results.filter(r=>r.rows[0].delay>0).every(r=>r.rows[0].delay<=60));
  await db.pool.query("update public.api_rate_limits set window_start=now()-interval '61 seconds'");
  assert.equal((await db.pool.query('select public.consume_api_rate_limit($1,10) as delay',[key])).rows[0].delay,0);
  await db.pool.query('set role authenticated');await assert.rejects(db.pool.query('select public.consume_api_rate_limit($1,10)',[key]));
 }finally{await db.close();}
});
