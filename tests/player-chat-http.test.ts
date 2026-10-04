import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {createMatchHandler} from '../server/multiplayer/routes';import {TrashTalkService} from '../server/multiplayer/trash-talk';import {ApiError} from '../server/multiplayer/errors';import {A,B} from './helpers/remote';
test('chat HTTP preserves participant identity, validates pagination and mute, and accepts long messages',async()=>{
 const calls:any[]=[];const chat=new TrashTalkService({rpc:async(name:string,args:any)=>{calls.push({name,args});return {data:{messages:[],serverTime:new Date().toISOString()},error:null}}} as any);
 const handler=createMatchHandler({} as any,async token=>{if(token!==A)throw new ApiError(401,'auth','Sign in.');return A},undefined,undefined,undefined,undefined,chat);
 const server=createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${(server.address() as any).port}/api/matches/${B}`,headers={Authorization:`Bearer ${A}`,'Content-Type':'application/json'};
 try{
  assert.equal((await fetch(base+'/trash-talk')).status,401);
  assert.equal((await fetch(base+'/trash-talk?beforeTime=bad&beforeId='+B,{headers})).status,400);
  assert.equal((await fetch(base+'/trash-talk?beforeTime=2026-10-03T00%3A00%3A00Z&beforeId='+B,{headers})).status,200);
  assert.equal((await fetch(base+'/trash-talk',{method:'POST',headers,body:JSON.stringify({id:B,text:'🔥'.repeat(500),actorId:B})})).status,200);
  assert.equal((await fetch(base+'/trash-talk',{method:'POST',headers,body:JSON.stringify({id:B,text:'x'.repeat(501)})})).status,400);
  assert.equal((await fetch(base+'/chat-preferences',{method:'POST',headers,body:JSON.stringify({muted:'yes'})})).status,400);
  assert.equal((await fetch(base+'/chat-preferences',{method:'POST',headers,body:JSON.stringify({muted:true,actorId:B})})).status,200);
  assert.deepEqual(calls.map(c=>c.name),['get_player_chat','send_player_chat','set_player_chat_muted']);assert.ok(calls.every(c=>c.args.p_actor===A));assert.equal(calls[0].args.p_before_id,B);assert.equal(calls[2].args.p_muted,true);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
