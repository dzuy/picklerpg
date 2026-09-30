import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {cleanCardPng,createPlayerCardHandler,publishCard,MAX_CARD_BYTES} from '../server/multiplayer/player-cards';
import {A} from './helpers/remote';
import {publishedCardCaption} from '../src/player-trading-card';
const valid=await readFile(new URL('./fixtures/player-cards/valid.png',import.meta.url));
test('PNG validation accepts card dimensions, canonicalizes bytes and rejects corrupt, oversized or disguised files',async()=>{
 const clean=cleanCardPng(valid);assert.deepEqual(cleanCardPng(clean),clean);
 assert.throws(()=>cleanCardPng(Buffer.from('<svg/>')));
 assert.throws(()=>cleanCardPng(Buffer.concat([valid,Buffer.from('trailing payload')])));
 const corrupt=Buffer.from(valid);corrupt[corrupt.length-1]^=255;assert.throws(()=>cleanCardPng(corrupt));
 assert.throws(()=>cleanCardPng(Buffer.alloc(MAX_CARD_BYTES+1)));
 const wrong=await readFile(new URL('./fixtures/player-cards/wrong-size.png',import.meta.url));assert.throws(()=>cleanCardPng(wrong));
});
test('content-addressed upload returns direct public PNG URLs and tolerates duplicate uploads only',async()=>{
 const paths:string[]=[];let failure:unknown=null;
 const client={from:()=>({upsert:async(row:any)=>{assert.equal(row.owner_id,A);return {error:null}}}),storage:{from:(bucket:string)=>{
  assert.equal(bucket,'player-cards');
  return {
   upload:async(path:string,body:Buffer,options:unknown)=>{paths.push(path);assert.deepEqual(body,cleanCardPng(valid));assert.deepEqual(options,{contentType:'image/png',cacheControl:'31536000',upsert:false});return {error:failure};},
   getPublicUrl:(path:string)=>({data:{publicUrl:`https://storage.example/storage/v1/object/public/player-cards/${path}`}}),
  };
 }}};
 const first=await publishCard(client as any,valid,A);failure={statusCode:'409'};const second=await publishCard(client as any,valid,A);assert.equal(first.url,second.url);assert.match(paths[0],/^v2\/[a-f0-9-]{36}\/[a-f0-9]{64}\.png$/);
 failure={statusCode:'403'};await assert.rejects(()=>publishCard(client as any,valid,A),/could not be published/);
 const caption=publishedCardCaption('Rally Queen',first.url);assert.ok(caption.includes(first.url));assert.ok(caption.includes('https://picklebash.app/'));
});
test('public upload route handles guests and rejects other origins, types, methods and rate-limited uploads',async()=>{
 let uploads=0,blocked=false;
 const server=createServer(createPlayerCardHandler(async bytes=>{cleanCardPng(bytes);uploads++;return {url:'https://storage.example/card.png'};},async()=>blocked?30:0,0,async token=>token==='test-session'?A:null));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{
  const post=(headers:Record<string,string>)=>fetch(base,{method:'POST',headers:{Authorization:'Bearer test-session',...headers},body:valid});
  assert.equal((await post({'Content-Type':'image/png',Authorization:''})).status,401);
  assert.equal((await post({'Content-Type':'image/png'})).status,201);
  assert.equal((await post({'Content-Type':'image/png',Origin:'https://unrelated.example'})).status,403);
  assert.equal((await post({'Content-Type':'text/html'})).status,415);
  assert.equal((await fetch(base)).status,405);
  blocked=true;const limited=await post({'Content-Type':'image/png'});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'30');assert.equal(uploads,1);
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});

test('production dispatches card uploads and allows the native app preflight',async()=>{
 const {createProductionServer}=await import('../server/production.mjs');
 const server=createProductionServer({playerCardHandler:createPlayerCardHandler(async bytes=>{cleanCardPng(bytes);return {url:'https://storage.example/production-card.png'};},undefined,0,async token=>token==='test-session'?A:null)});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/player-cards`;
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'image/png',Authorization:'Bearer test-session'},body:valid});assert.equal(response.status,201);assert.equal((await response.json()).url,'https://storage.example/production-card.png');
  const preflight=await fetch(url,{method:'OPTIONS',headers:{Origin:'capacitor://localhost'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'capacitor://localhost');
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
