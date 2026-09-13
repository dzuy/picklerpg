import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// @ts-ignore server-only module
import {createProductionServer} from '../server/production.mjs';
// @ts-ignore server-only module
import {createOpponentHandler} from '../server/opponent.mjs';

test('production serves game assets and HTTPS-origin AI on one port',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pickle-host-'));
 await mkdir(join(root,'assets'));await mkdir(join(root,'models'));
 await writeFile(join(root,'index.html'),'<h1>Pickle RPG</h1>');
 await writeFile(join(root,'assets','game.js'),'console.log("ready")');
 await writeFile(join(root,'assets','voice.wasm'),Buffer.from([0,97,115,109]));
 await writeFile(join(root,'models','player.glb'),'model');
 await writeFile(join(root,'voice-capture-worklet.js'),'worklet');
 const server=createProductionServer({root,apiHandler:createOpponentHandler({choose:async()=>({choice:0})})});
 try{
  await new Promise<void>(resolve=>server.listen(0,'0.0.0.0',resolve));
  const port=server.address().port,url=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(url)).status,200);
  assert.equal((await fetch(url+'/healthz')).status,200);
  for(const [path,type] of [['/assets/game.js','text/javascript'],['/assets/voice.wasm','application/wasm'],['/models/player.glb','model/gltf-binary'],['/voice-capture-worklet.js','text/javascript']]){
   const response=await fetch(url+path);assert.equal(response.status,200);assert.ok(response.headers.get('content-type')?.startsWith(type));
  }
  assert.equal((await fetch(url+'/.env.local')).status,404);
  assert.equal((await fetch(url+'/missing.js')).status,404);
  assert.equal(await (await fetch(url,{method:'HEAD'})).text(),'');
  const request=(origin:string)=>fetch(url+'/api/opponent',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({version:1,options:[{}]})});
  assert.deepEqual(await (await request(`https://127.0.0.1:${port}`)).json(),{choice:0});
  assert.equal((await request('https://unrelated.example')).status,403);
 }finally{await new Promise<void>(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true})}
});
