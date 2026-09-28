import test from 'node:test';
import assert from 'node:assert/strict';
import {remoteRequest,RemoteError} from '../src/multiplayer/api';
test('Retry-After suppresses repeat reads without blocking turn submissions or another account',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return calls===1?new Response(JSON.stringify({error:{code:'rate_limited',message:'Wait'}}),{status:429,headers:{'Retry-After':'60'}}):new Response('{}');};
 try{
  await assert.rejects(remoteRequest('reader','/api/matches/a'),e=>e instanceof RemoteError&&e.retryAfter===60);
  await assert.rejects(remoteRequest('reader','/api/multiplayer/push/badge'),e=>e instanceof RemoteError&&e.status===429);
  assert.equal(calls,1);
  await remoteRequest('reader','/api/matches/a/actions',{});await remoteRequest('other','/api/matches/a');assert.equal(calls,3);
 }finally{globalThis.fetch=original;}
});
