import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore server-only JS module
import {decide} from '../server/opponent.mjs';
test('server builds structured request and rejects state-changing output',async()=>{let body:any;const fetcher=async(_url:string,init:any)=>{body=JSON.parse(init.body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'{"choice":0}'}]}]}))};assert.deepEqual(await decide({version:1,options:[{}]},{key:'test',model:'test-model',fetcher}),{choice:0});assert.equal(body.store,false);assert.equal(body.text.format.strict,true);await assert.rejects(()=>decide({version:1,options:[{}]},{key:'',model:'x'}));await assert.rejects(()=>decide({version:1,options:[{}]},{key:'x',model:'x',fetcher:async()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'{"choice":0,"score":11}'}]}]}))}));});
test('API defaults to lightweight development model',async()=>{let model:string|undefined;await decide({version:1,options:[{}]},{key:'test',fetcher:async(_url:string,init:any)=>{model=JSON.parse(init.body).model;return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'{"choice":0}'}]}]}))}});assert.equal(model,process.env.OPENAI_MODEL||'gpt-5.6-luna')});
test('strategy requests ask for point-level planning with the offered strategy schema',async()=>{
 let body:any;
 const snapshot={version:1,kind:'strategy',options:[{name:'Pressure'},{name:'Soft game'}]};
 const result=await decide(snapshot,{key:'test',fetcher:async(_url:string,init:any)=>{body=JSON.parse(init.body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'{"choice":1}'}]}]}));}});
 assert.deepEqual(result,{choice:1});assert.match(body.instructions,/background planning/);assert.deepEqual(body.text.format.schema.properties.choice.enum,[0,1]);
});
