import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {PushService,parseSubscription} from '../server/multiplayer/push';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,action,MemoryRepository} from './helpers/remote';
const valid={endpoint:'https://web.push.apple.com/a',keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')}};
test('subscription validates provider, transport and key lengths before server network access',()=>{
 assert.deepEqual(parseSubscription(valid),valid);
 for(const endpoint of ['http://web.push.apple.com/a','https://localhost/a','https://web.push.apple.com.evil.test/a','https://web.push.apple.com:123/a','https://user@web.push.apple.com/a'])assert.throws(()=>parseSubscription({...valid,endpoint}));
 assert.throws(()=>parseSubscription({...valid,keys:{p256dh:'abc',auth:'abc'}}));assert.throws(()=>parseSubscription(null));
});
function fakeStore(rows:any[]){
 const operations:any[]=[];let claimed=false;
 const client:any={rpc:async()=>({data:!claimed&&(claimed=true),error:null}),from:(table:string)=>{
  const op:any={table,filters:[]};operations.push(op);
  const q:any={select:()=>{op.kind='select';return q},upsert:(v:any)=>{op.kind='upsert';op.value=v;return q},update:(v:any)=>{op.kind='update';op.value=v;return q},delete:()=>{op.kind='delete';return q},eq:(key:string,value:any)=>{op.filters.push([key,value]);return q},maybeSingle:async()=>({data:rows.length?{id:event.matchId}:null,error:null}),then:(resolve:any)=>Promise.resolve({data:rows,error:null}).then(resolve)};return q;
 }};
 return {client,operations};
}
const event={userId:B,matchId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',version:1,opponentName:'Chris'};
test('all devices receive push once; dead endpoints deleted; network failure isolated',async()=>{
 const rows=['ok','gone','invalid','failed'].map(id=>({id,endpoint:id,p256dh:'key',auth:'secret',active_until:null}));const db=fakeStore(rows);const sent:string[]=[];
 const push=new PushService(db.client,'public','private','mailto:test@example.com',async(s,payload)=>{
  sent.push(s.endpoint);assert.equal(JSON.parse(payload as string).opponentName,'Chris');
  if(s.endpoint!=='ok')throw {statusCode:s.endpoint==='gone'?410:s.endpoint==='invalid'?404:503};return {} as any;
 });
 await push.notify(event);await push.notify(event);assert.equal(sent.length,4);
 const removed=db.operations.filter(o=>o.kind==='delete');assert.equal(removed.length,2);assert.deepEqual(removed.map(o=>o.filters[0][1]),['gone','invalid']);
 assert.ok(removed.every(o=>o.filters.some(([k,v]:string[])=>k==='user_id'&&v===B)));
});
test('active account suppresses sending before contacting providers; stale leases do not',async()=>{
 for(const active_until of [new Date(Date.now()+30000).toISOString(),new Date(0).toISOString()]){
  const db=fakeStore([{id:'a',endpoint:'a',active_until}]);let sent=0;
  const push=new PushService(db.client,'p','s','mailto:test@example.com',async()=>{sent++;return {} as any});await push.notify(event);
  assert.equal(sent,Date.parse(active_until)>Date.now()?0:1);
 }
});
test('unsubscribe and activity are restricted to authenticated account and endpoint',async()=>{
 const db=fakeStore([]),push=new PushService(db.client,'p','s','mailto:test@example.com');
 await push.remove(A,{endpoint:valid.endpoint});await push.activity(A,{endpoint:valid.endpoint,active:true});
 for(const op of db.operations)assert.deepEqual(op.filters,[['user_id',A],['endpoint',valid.endpoint]]);
 await push.subscribe(B,valid);assert.equal(db.operations.at(-1).value.user_id,B);
});
test('only committed actionable ownership changes notify; failed side effects and retries preserve game',async()=>{
 const db=new MemoryRepository();const events:any[]=[];
 const service=new MatchService(db,testers,true,async event=>{events.push(event);throw Error('provider offline')});
 let state=await service.create(A,creation());
 for(let i=0;i<20;i++){
  const actor=state.currentTeam==='home'?A:B;state=await service.get(state.id,actor);const request=action(state,i);const before=events.length;
  const committed=await service.act(state.id,actor,request);await new Promise(resolve=>setImmediate(resolve));state=committed.state;
  const next=db.rows.get(state.id)!.current_action_user_id;
  assert.equal(events.length-before,next&&next!==actor&&state.status==='active'?1:0);
  await service.act(state.id,actor,request);await new Promise(resolve=>setImmediate(resolve));assert.equal(events.length,before+(next&&next!==actor&&state.status==='active'?1:0));
  assert.equal(db.rows.get(state.id)!.version,state.version);
 }
 assert.ok(events.length>0);
});
async function worker(windows:any[]=[]){
 const handlers:any={},shown:any[]=[],opened:any[]=[];
 const context={URL,encodeURIComponent,self:{location:{origin:'https://pickle.test'},addEventListener:(name:string,fn:any)=>handlers[name]=fn,skipWaiting:async()=>{},registration:{showNotification:async(...args:any[])=>shown.push(args)},clients:{claim:async()=>{},matchAll:async()=>windows,openWindow:async(url:string)=>opened.push(url)}}};
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),context);
 const fire=async(name:string,extra:any)=>{let work;handlers[name]({...extra,waitUntil:(p:any)=>work=p});await work;};return {fire,shown,opened,handlers};
}
test('worker shows required notification, reuses match window, and routes closed app safely',async()=>{
 const w=await worker();await w.fire('push',{data:{json:()=>event}});assert.equal(w.shown[0][0],'PickleBash');assert.equal(w.shown[0][1].body,'Chris played. Your turn.');
 const notification={data:w.shown[0][1].data,close(){}};await w.fire('notificationclick',{notification});assert.equal(w.opened[0],`https://pickle.test/?multiplayer=1&match=${event.matchId}`);
 let focused=false,navigated='';const reused=await worker([{url:'https://pickle.test/?multiplayer=1',focus:async()=>focused=true,navigate:async(url:string)=>{navigated=url;return {}}}]);await reused.fire('notificationclick',{notification});assert.ok(focused);assert.equal(navigated,w.opened[0]);assert.equal(reused.opened.length,0);
 await w.fire('notificationclick',{notification:{data:{url:'https://evil.test/'},close(){}}});assert.equal(w.opened[1],'https://pickle.test/?multiplayer=1');
 assert.equal(w.handlers.fetch,undefined,'no authoritative state caching');await w.fire('activate',{});await w.fire('install',{});
});

test('nudges recheck current turn and share active suppression, payload and dead endpoint cleanup',async()=>{
 for(const mode of ['stale','active','ready']){
  const db=fakeStore(mode==='stale'?[]:[{id:'dead',endpoint:'dead',auth:'secret',active_until:mode==='active'?new Date(Date.now()+30000).toISOString():null}]);let sent=0;
  const push=new PushService(db.client,'p','s','mailto:test@example.com',async(_s,payload)=>{sent++;assert.equal(JSON.parse(payload as string).type,'nudge');throw {statusCode:410}});
  await push.notifyNudge(event);assert.equal(sent,mode==='ready'?1:0);
  assert.deepEqual(db.operations[0].filters,[['id',event.matchId],['version',event.version],['status','active'],['current_action_user_id',B]]);
  assert.equal(db.operations.filter(o=>o.kind==='delete').length,mode==='ready'?1:0);
 }
 const w=await worker();await w.fire('push',{data:{json:()=>({...event,type:'nudge'})}});
 assert.equal(w.shown[0][1].body,'Chris nudged you. Your turn.');
 await w.fire('notificationclick',{notification:{data:w.shown[0][1].data,close(){}}});
 assert.equal(w.opened[0],`https://pickle.test/?multiplayer=1&match=${event.matchId}`);
});
