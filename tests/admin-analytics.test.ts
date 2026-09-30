import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createAdminAnalyticsHandler,dashboardQueries} from '../server/multiplayer/admin-analytics';
import {percentage} from '../src/analytics/dashboard-contract';
const admin='admin-uuid';
async function serve(options:any,run:(url:string)=>Promise<void>){
 const handler=createAdminAnalyticsHandler({authenticate:async(token:string)=>token==='admin'?{id:admin}:token==='guest'?{id:admin,is_anonymous:true}:token==='player'?{id:'player'}:null,adminIds:new Set([admin]),...options});
 const server=createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await run(`http://127.0.0.1:${(server.address() as any).port}/api/admin/analytics`);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
const headers={Authorization:'Bearer admin'};
test('dashboard denies unauthenticated, ordinary and guest users before querying or revealing setup',async()=>{
 let calls=0;await serve({fetcher:async()=>{calls++;throw Error('secret');}},async url=>{
  assert.equal((await fetch(url)).status,401);
  for(const token of ['guest','player'])assert.equal((await fetch(url,{headers:{Authorization:`Bearer ${token}`}})).status,403);
  assert.equal((await fetch(url,{headers:{Authorization:'Bearer invalid'}})).status,401);
  assert.equal(calls,0);
  const result=await fetch(url,{headers});assert.equal(result.headers.get('cache-control'),'no-store');assert.equal((await result.json()).status,'setup');
 });
});
test('dashboard accepts only fixed ranges and GET, and fails closed without allowlist',async()=>{
 await serve({},async url=>{
  for(const query of ['?days=90','?days=7&days=30','?sql=SELECT','?days=7%20OR%201'])assert.equal((await fetch(url+query,{headers})).status,400);
  assert.equal((await fetch(url,{headers,method:'POST'})).status,405);
 });
 await serve({adminIds:new Set()},async url=>assert.equal((await fetch(url,{headers})).status,403));
});
test('aggregates are cached and concurrent requests share queries; errors never expose provider details',async()=>{
 let calls=0,time=Date.parse('2026-11-01T12:00:00Z');
 const fetcher=async(url:any,options:any)=>{
  calls++;assert.equal(url,'https://us.posthog.com/api/projects/632654/query/');assert.equal(options.headers.Authorization,'Bearer private-key');
  const query=JSON.parse(options.body).query.query;
  assert.match(query,/environment = 'production'/);assert.doesNotMatch(query,/SELECT \*/);
  const lengths=query.includes('countDistinctIf(person_id, event =')?3:query.includes('countIf(accepted >= sent)')?4:query.includes('SELECT sum(if(active')?1:2;
  return new Response(JSON.stringify({results:[Array(lengths).fill(4)]}));
 };
 await serve({key:'private-key',project:'632654',fetcher,now:()=>time},async url=>{
  const results=await Promise.all([fetch(url,{headers}),fetch(url,{headers})]);const data=await results[0].json();assert.equal(data.status,'ready');assert.equal(data.current.active,4);assert.equal(calls,12);assert.ok(!JSON.stringify(data).includes('private-key'));
  await fetch(url,{headers});assert.equal(calls,12);time+=300001;await fetch(url,{headers});assert.equal(calls,24);
 });
 let failed=0;await serve({key:'secret',project:'632654',fetcher:async()=>{failed++;return new Response('private sensitive response',{status:403});}},async url=>{
  const r=await fetch(url,{headers});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret|private sensitive/);await fetch(url,{headers});assert.equal(failed,2,'one failure per concurrently queried period, then cooldown');
 });
});
test('SQL preserves distinct matches, nullable ordered stages, server-owned rematch requests and mature D7 cohorts',()=>{
 const queries=dashboardQueries(Date.parse('2026-10-01'),Date.parse('2026-10-08'),Date.parse('2026-09-28'));
 assert.match(queries[0].sql,/countDistinctIf\(toString\(properties.match_id\)/);
 assert.match(queries[1].sql,/, NULL\)/);assert.match(queries[1].sql,/finish >= begin/);
 assert.match(queries[3].sql,/event_source = 'server'/);
 assert.match(queries[4].sql,/activated >= accepted AND completed >= activated/);
 assert.match(queries[5].sql,/addDays\(toStartOfDay\(toTimeZone\(c.joined, 'UTC'\)\), 8\)/);
 assert.equal(percentage(0,0),null);assert.equal(percentage(1,4),25);
});
