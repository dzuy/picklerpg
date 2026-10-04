import test from 'node:test';import assert from 'node:assert/strict';
import {AccountSafetyService} from '../server/multiplayer/account-safety';
import {A,B} from './helpers/remote';
test('deletion requires explicit confirmation and password identity; queued request is actor scoped',async()=>{
 let saved:unknown;const db:any={auth:{admin:{getUserById:async()=>({data:{user:{email:'test@example.invalid',is_anonymous:false}}})}},from:(table:string)=>{assert.equal(table,'account_deletion_requests');return {upsert:async(row:unknown)=>{saved=row;return {error:null}}}}};
 const wrong=new AccountSafetyService(db,async()=>B);await assert.rejects(wrong.deletion(A,{confirmation:'DELETE',password:'password'}),/Check your password/);assert.equal(saved,undefined);
 const service=new AccountSafetyService(db,async()=>A);await assert.rejects(service.deletion(A,{confirmation:'yes',password:'password'}));await service.deletion(A,{confirmation:'DELETE',password:'password',targetId:B});assert.deepEqual(saved,{account_id:A});
});
test('reports reject oversized text and client supplied reasons before accessing data',async()=>{const service=new AccountSafetyService({} as any,async()=>null);for(const input of [{reason:'invented',details:''},{reason:'other',details:'a'.repeat(501)}])await assert.rejects(service.report(A,input));});
test('persistent guests can request deletion without inventing a password or another owner',async()=>{
 let saved:unknown;const db:any={auth:{admin:{getUserById:async()=>({data:{user:{id:A,is_anonymous:true}}})}},from:()=>({upsert:async(row:unknown)=>{saved=row;return {error:null}}})};
 const service=new AccountSafetyService(db,async()=>{throw Error('must not exchange guest password')});await service.deletion(A,{confirmation:'DELETE',password:''});assert.deepEqual(saved,{account_id:A});
});
test('match safety targets require membership and use the opponent derived by the server',async()=>{
 const q={select(){return this},eq(){return this},async maybeSingle(){return {data:{home_user_id:A,away_user_id:B},error:null}}};const service=new AccountSafetyService({from:()=>q} as any,async()=>null);
 assert.equal(await service.target(A,{matchId:A,targetId:A}),B);await assert.rejects(service.target('33333333-3333-4333-8333-333333333333',{matchId:A}),/unavailable/);
});
test('blocked chat suppresses feed and prevents retries from reusing old message receipts',async()=>{
 const {TrashTalkService}=await import('../server/multiplayer/trash-talk');
 const db:any={rpc:async(name:string)=>name==='get_player_chat'?{data:{messages:[],blocked:true},error:null}:{data:null,error:{code:'PT410'}}};const service=new TrashTalkService(db);
 assert.deepEqual((await service.feed(A,B)).messages,[]);await assert.rejects(service.send(A,B,{id:A,text:'Hi'}),/unavailable/);
});

test('chat reports snapshot only server-authorized conversation evidence',async()=>{
 let saved:any;const calls:any[]=[];
 const db:any={rpc:async(name:string,args:any)=>{calls.push({name,args});return {data:{messages:[{text:'Reported message'}]},error:null}},from:(table:string)=>table==='async_matches'?{select(){return this},eq(){return this},maybeSingle:async()=>({data:{home_user_id:A,away_user_id:B},error:null})}:{insert:async(row:any)=>{saved=row;return {error:null}}}};
 await new AccountSafetyService(db,async()=>null).report(A,{matchId:A,messageId:B,targetId:A,reason:'harassment',details:'Review this'});
 assert.deepEqual(calls,[{name:'player_chat_report_evidence',args:{p_match_id:A,p_actor:A,p_message_id:B}}]);assert.equal(saved.target_id,B);assert.equal(saved.reporter_id,A);assert.deepEqual(saved.evidence,{messages:[{text:'Reported message'}]});
});
