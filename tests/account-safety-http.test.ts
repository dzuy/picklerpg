import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {createMatchHandler} from '../server/multiplayer/routes';import {ApiError} from '../server/multiplayer/errors';import {A,B} from './helpers/remote';
test('safety endpoints require a bearer identity, scope requests to it, and reject another origin',async()=>{
 const calls:string[]=[];const safety:any={blocks:async(actor:string)=>{calls.push(actor);return {blocked:[]}},report:async(actor:string)=>{calls.push(actor);return {ok:true}},deletion:async(actor:string)=>{calls.push(actor);return {requested:true}}};
 const handler=createMatchHandler({} as any,async token=>{if(token!==A)throw new ApiError(401,'auth','Sign in.');return A},undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,async()=>0,0,undefined,safety);
 const server=createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${(server.address() as any).port}`,path=origin+'/api/multiplayer/safety';
 try{
  assert.equal((await fetch(path+'/blocks')).status,401);
  assert.equal((await fetch(path+'/blocks',{headers:{Authorization:`Bearer ${A}`}})).status,200);
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${A}`};
  assert.equal((await fetch(path+'/report',{method:'POST',headers,body:JSON.stringify({actorId:B,targetId:B})})).status,201);
  assert.equal((await fetch(path+'/delete-account',{method:'POST',headers,body:JSON.stringify({actorId:B,confirmation:'DELETE'})})).status,202);
  assert.equal((await fetch(path+'/report',{method:'POST',headers:{...headers,Origin:'https://unrelated.example'},body:'{}'})).status,403);
  assert.deepEqual(calls,[A,A,A]);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
});
