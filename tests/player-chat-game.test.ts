import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {chatPreviewDatabase} from './helpers/chat-preview';
import {A,B,C,testers,creation,action} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
import {TrashTalkService} from '../server/multiplayer/trash-talk';
import {AccountSafetyService} from '../server/multiplayer/account-safety';
import {createMatchHandler} from '../server/multiplayer/routes';
import {ApiError} from '../server/multiplayer/errors';

test('main-game routes integrate turns, persistent chat, pair mute, blocking and reported evidence',async()=>{
 const db=await database();let server:ReturnType<typeof createServer>|undefined;
 try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),client=chatPreviewDatabase(repo,testers);
  const game=await service.create(A,creation()),next=await service.create(A,creation());
  const handler=createMatchHandler(service,async token=>{if([A,B,C].includes(token))return token;throw new ApiError(401,'auth','Sign in.');},undefined,undefined,undefined,undefined,new TrashTalkService(client),undefined,undefined,undefined,undefined,undefined,0,undefined,new AccountSafetyService(client,async()=>null));
  server=createServer(handler);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const request=async(actor:string,path:string,body?:unknown)=>{const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${actor}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,value:await response.json()}};
  const path=`/api/matches/${game.id}/trash-talk`,id=randomUUID();
  assert.equal((await request(C,path)).status,404);
  assert.equal((await request(A,path,{id,text:'That serve is mine 😎'})).status,200);
  assert.equal((await request(B,path)).value.messages[0].text,'That serve is mine 😎');
  const turn=await request(A,`/api/matches/${game.id}/actions`,action(game));assert.equal(turn.status,200);assert.equal(turn.value.state.version,1);
  assert.equal((await request(A,`/api/matches/${next.id}/trash-talk`)).value.messages[0].id,id);
  assert.equal((await request(B,`/api/matches/${game.id}/chat-preferences`,{muted:true})).status,200);
  assert.equal((await request(B,`/api/matches/${next.id}/trash-talk`)).value.muted,true);
  assert.equal((await request(A,path)).value.muted,false);
  assert.equal((await request(B,'/api/multiplayer/safety/report',{matchId:next.id,messageId:id,reason:'other',details:'Local integration check'})).status,201);
  const report=(await db.pool.query('select reporter_id,target_id,evidence from public.player_reports')).rows[0];assert.equal(report.reporter_id,B);assert.equal(report.target_id,A);assert.equal(report.evidence.messages[0].text,'That serve is mine 😎');
  assert.equal((await request(B,'/api/multiplayer/safety/block',{matchId:game.id,blocked:true})).status,200);
  assert.equal((await request(A,path,{id:randomUUID(),text:'Blocked'})).status,403);assert.equal((await request(A,path)).value.blocked,true);
  assert.equal((await request(B,'/api/multiplayer/safety/block',{matchId:next.id,blocked:false})).status,200);
  assert.equal((await request(A,path)).value.messages[0].id,id);
 }finally{if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));await db.close();}
});
