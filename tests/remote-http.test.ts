import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {A,B,C,creation,action,testers,MemoryRepository} from './helpers/remote';
// @ts-ignore production is an intentionally plain Node module
import {createProductionServer} from '../server/production.mjs';

test('emitted Node engine serves authenticated remote APIs alongside static, health, and AI routes',async()=>{
 await promisify(execFile)(process.execPath,['scripts/build-server.mjs']);
 const {createMatchHandler,MatchService,configuredMatchHandler}=await import('../dist-server/multiplayer.mjs');
 const root=await mkdtemp(join(tmpdir(),'pickle-remote-http-'));await writeFile(join(root,'index.html'),'<h1>PickleBash</h1>');
 const repository=new MemoryRepository();
 const handler=createMatchHandler(new MatchService(repository,testers),async(token:string)=>{
  if([A,B,C].includes(token))return token;throw new Error('invalid test token');
 });
 const server=createProductionServer({root,matchHandler:handler,apiHandler:async(_req:any,res:any)=>res.writeHead(200).end('{"ai":true}')});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 const request=(path:string,actor=A,body?:unknown,headers={})=>fetch(url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${actor}`,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 try{
  for(const path of ['/','/healthz','/api/opponent'])assert.equal((await fetch(url+path)).status,200);
  assert.equal((await fetch(url+'/api/matches')).status,401);
  assert.equal((await request('/api/matches',A,creation(),{Origin:'https://unrelated.example'})).status,403);
  assert.equal((await request('/api/matches',A,{...creation(),extra:'x'.repeat(40000)})).status,413);
  const response=await request('/api/matches',A,creation());assert.equal(response.status,201);const s=await response.json();
  assert.equal((await request(`/api/matches/${s.id}`,C)).status,404);
  assert.equal((await request(`/api/matches/${s.id}/archive`,C,{archived:true})).status,404);
  assert.equal((await request(`/api/matches/${s.id}/archive`,A,{archived:true})).status,200);
  assert.equal((await (await request(`/api/matches/${s.id}`,A)).json()).archived,true);
  assert.equal((await (await request(`/api/matches/${s.id}`,B)).json()).archived,false);
  assert.equal((await request(`/api/matches/${s.id}/archive`,A,{archived:false})).status,200);
  assert.equal((await request(`/api/matches/${s.id}/actions`,B,action(s))).status,403);
  const a=action(s),first=await request(`/api/matches/${s.id}/actions`,A,a);assert.equal(first.status,200);const receipt=await first.json();
  assert.deepEqual(await (await request(`/api/matches/${s.id}/actions`,A,a)).json(),receipt);
  assert.equal((await request(`/api/matches/${s.id}/actions`,A,{...a,expectedVersion:5})).status,409);
  assert.equal((await request('/api/matches/not-a-uuid')).status,404);
  let status=0;const fake:any={writeHead(n:number){status=n;return this},end(){}};
  await configuredMatchHandler({})(null,fake);assert.equal(status,503);
 }finally{await new Promise<void>(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});

test('registration works before login and obeys origin checks',async()=>{
 const {createMatchHandler}=await import('../server/multiplayer/routes');const {MatchService}=await import('../server/multiplayer/service');
 let calls=0;const handler=createMatchHandler(new MatchService(new MemoryRepository(),testers),async()=>{throw Error('no auth');},async input=>{calls++;assert.deepEqual(input,{email:'new@example.com',password:'long-password-123'});return {created:true};});
 const server=createProductionServer({matchHandler:handler});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{const post=(origin:string)=>fetch(base+'/api/multiplayer/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'new@example.com',password:'long-password-123'})});assert.equal((await post('https://unrelated.example')).status,403);assert.equal(calls,0);assert.equal((await post(base)).status,201);assert.equal(calls,1);
 }finally{await new Promise<void>(resolve=>server.close(resolve));}
});
