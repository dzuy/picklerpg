import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {NudgeService} from '../server/multiplayer/nudges';
import {createMatchHandler} from '../server/multiplayer/routes';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,MemoryRepository} from './helpers/remote';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const status={state:'ready',version:3,availableAt:null,serverTime:new Date().toISOString()};
test('nudge service rejects client recipients and isolates delivery failure from accepted claim',async()=>{
 let calls=0,notified:any;const service=new NudgeService({rpc:async()=>{calls++;return {data:{...status,state:'already_nudged',accepted:calls===1,recipientUserId:B},error:null}}} as any,testers,async e=>{notified=e;throw Error('offline')});
 for(const input of [null,{},[],{expectedVersion:-1},{expectedVersion:1,userId:C}])await assert.rejects(service.send(id,A,input));assert.equal(calls,0);
 const result=await service.send(id,A,{expectedVersion:3});assert.ok(result.accepted);assert.equal('recipientUserId' in result,false);
 await new Promise(r=>setImmediate(r));assert.deepEqual(notified,{userId:B,matchId:id,version:3,opponentName:'A'});
 notified=null;assert.equal((await service.send(id,A,{expectedVersion:3})).accepted,false);await new Promise(r=>setImmediate(r));assert.equal(notified,null);
});
test('nudge status is unavailable without delivery configuration and storage failures fail closed',async()=>{
 const service=new NudgeService({rpc:async()=>({data:status})} as any,testers);
 assert.equal((await service.status(id,A)).state,'unavailable');await assert.rejects(service.send(id,A,{expectedVersion:3}),/unavailable/);
 for(const code of ['P0002','42501']){const failing=new NudgeService({rpc:async()=>({error:{code}})} as any,testers,async()=>{});await assert.rejects(failing.send(id,A,{expectedVersion:3}));}
});
test('nudge route verifies account/origin and server bounds repeated requests',async()=>{
 const calls:any[]=[];const nudges:any={status:async(...args:any[])=>{calls.push(args);return status},send:async(...args:any[])=>{calls.push(args);return {...status,accepted:true}}};
 const handler=createMatchHandler(new MatchService(new MemoryRepository(),testers),async token=>token===A?A:B,undefined,undefined,undefined,nudges);
 const server=createServer(handler);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${(server.address() as any).port}/api/matches/${id}/nudge`;
 try{
  assert.equal((await fetch(url)).status,401);
  const headers={Authorization:`Bearer ${A}`,'Content-Type':'application/json'};
  assert.equal((await fetch(url,{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{"expectedVersion":3}'})).status,403);
  assert.equal((await fetch(url,{headers})).status,200);assert.deepEqual(calls[0],[id,A]);
  for(let i=0;i<12;i++)assert.equal((await fetch(url,{method:'POST',headers,body:'{"expectedVersion":3}'})).status,200);
  assert.equal((await fetch(url,{method:'POST',headers,body:'{"expectedVersion":3}'})).status,429);assert.equal(calls.length,13);
  nudges.unlimited=true;for(let i=0;i<15;i++)assert.equal((await fetch(url,{method:'POST',headers,body:'{"expectedVersion":3}'})).status,200);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});

test('unlimited testing is server-controlled and returns ready after repeated sends',async()=>{
 const calls:any[]=[];const service=new NudgeService({rpc:async(name:any,args:any)=>{calls.push(args);return {data:{...status,accepted:true,recipientUserId:B}}}} as any,testers,async()=>{},true);
 assert.equal((await service.status(id,A)).unlimited,true);
 for(let i=0;i<3;i++){const result=await service.send(id,A,{expectedVersion:3});assert.equal(result.state,'ready');assert.equal(result.unlimited,true);assert.equal(result.accepted,true)}
 assert.ok(calls.every(args=>args.p_unlimited===true));
 await assert.rejects(service.send(id,A,{expectedVersion:3,p_unlimited:true}));
});

test('missing nudge RPC reports setup required instead of a retryable availability failure',async()=>{
 const service=new NudgeService({rpc:async()=>({error:{code:'PGRST202'}})} as any,testers,async()=>{});
 await assert.rejects(service.status(id,A),(error:any)=>error.code==='nudge_setup_required'&&error.status===503);
});
