import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('the ordinary Vite server handles multiplayer API routes without a second server',async()=>{
 const previous=process.env.MULTIPLAYER_ENABLED;
 process.env.MULTIPLAYER_ENABLED='false';
 const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});
 try{
  await server.listen();
  const address=server.httpServer!.address();
  assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;
  for(const path of ['/api/multiplayer/config','/api/matches','/api/invitations']){
   const response=await fetch(base+path);
   assert.equal(response.status,503);
   assert.match(response.headers.get('content-type')??'',/application\/json/);
   assert.deepEqual(await response.json(),{error:{code:'disabled',message:'Remote play is not enabled on this server.'}});
  }
  const home=await fetch(base+'/');
  assert.equal(home.status,200);
  assert.match(await home.text(),/PickleBash/);
 }finally{
  await server.close();
  if(previous===undefined)delete process.env.MULTIPLAYER_ENABLED;
  else process.env.MULTIPLAYER_ENABLED=previous;
 }
});
