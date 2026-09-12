import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {writeFile} from 'node:fs/promises';
// @ts-ignore local server adapter
import {decideWithCodex} from '../server/codex-opponent.mjs';
test('Codex bridge uses ChatGPT login, isolated read-only run and validates result',async()=>{
 let args:string[]=[],prompt='';
 const spawnProcess=(_binary:string,a:string[],opts:any)=>{args=a;assert.equal(opts.env.OPENAI_API_KEY,undefined);const child:any=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=async(p:string)=>{prompt=p;await writeFile(a[a.indexOf('--output-last-message')+1],'{"choice":1}');child.emit('close',0)};return child};
 assert.deepEqual(await decideWithCodex({version:1,options:[{},{}]},{spawnProcess}),{choice:1});assert.ok(args.includes('read-only'));assert.ok(args.includes('forced_login_method="chatgpt"'));assert.ok(args.includes('gpt-5.6-luna'));assert.match(prompt,/Do not use tools/);
 await assert.rejects(()=>decideWithCodex({version:1,options:[{}]},{spawnProcess}));
});
