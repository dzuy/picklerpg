import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createMatchHandler} from '../server/multiplayer/routes';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,MemoryRepository} from './helpers/remote';
test('push HTTP endpoints verify bearer and origin, use verified user, and disclose only public config',async()=>{
 const calls:any[]=[];const push:any={publicKey:'public-vapid-key',subscribe:async(...args:any[])=>calls.push(['subscribe',...args]),remove:async(...args:any[])=>calls.push(['remove',...args]),activity:async(...args:any[])=>calls.push(['activity',...args])};
 const server=createServer(createMatchHandler(new MatchService(new MemoryRepository(),testers),async token=>token===A?A:B,undefined,undefined,push));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${(server.address() as any).port}/api/multiplayer/push`;
 try{
  const request=(path:string,body?:any,extra={})=>fetch(url+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${A}`,...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});
  assert.equal((await fetch(url+'/config')).status,401);
  const config=await request('/config');assert.equal(config.headers.get('cache-control'),'no-store');assert.deepEqual(await config.json(),{publicKey:'public-vapid-key'});
  assert.equal((await request('/subscribe',{userId:B},{Origin:'https://evil.test'})).status,403);assert.equal(calls.length,0);
  for(const path of ['/subscribe','/unsubscribe','/activity'])assert.equal((await request(path,{userId:B,endpoint:'test'})).status,200);
  assert.ok(calls.every(c=>c[1]===A));assert.equal((await request('/unknown',{})).status,404);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
