import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OpponentMemory,tacticalSnapshot,localDecision,validateChoice} from '../src/engine/opponent-brain';
import {Match} from '../src/match';
test('snapshot contains no future execution results and is detached',()=>{const m=new Match(),s=tacticalSnapshot(m.state,m.availableIntents,m.memory,'Wall',.9);assert.ok(!JSON.stringify(s).includes('resolution'));s.players[0].skills.drive=0;assert.notEqual(m.state.players[0].skills.drive,0);for(const x of [{choice:-1},{choice:1},{choice:0,score:11},null])assert.throws(()=>validateChoice(x,1));assert.equal(validateChoice({choice:0},1),0)});
test('memory is bounded and adaptation depends on intelligence without modifying skills',()=>{const m=new Match(),memory=new OpponentMemory();const drive={...m.availableIntents[0],type:'drive' as const};for(let i=0;i<45;i++)memory.add({intent:drive,crash:false,lowBackhandError:false});assert.equal(memory.summary().samples,40);const s=tacticalSnapshot(m.state,[drive,{...drive,type:'block'}],memory,'Banger',.9);assert.equal(localDecision(s),1);assert.equal(localDecision({...s,intelligence:.2}),0)});
test('LLM invalid response falls back and restart discards in-flight response',async()=>{
 const original=globalThis.fetch;let resolve!:(r:Response)=>void;
 globalThis.fetch=(()=>new Promise<Response>(r=>resolve=r)) as typeof fetch;
 try{const m=new Match();m.brainMode='llm';for(let i=0;i<500&&!m.thinking;i++){if(m.state.phase==='decision'&&m.state.possession==='home')m.submitIntent(m.availableIntents[0]);m.update(.05)}assert.equal(m.thinking,true);m.reset();const before=m.snapshot();resolve(new Response(JSON.stringify({choice:0})));await new Promise(r=>setTimeout(r,0));assert.deepEqual(m.snapshot(),before);
 globalThis.fetch=(async()=>new Response(JSON.stringify({choice:999,score:11}))) as typeof fetch;
 for(let i=0;i<500&&!m.thinking;i++){if(m.state.phase==='decision'&&m.state.possession==='home')m.submitIntent(m.availableIntents[0]);m.update(.05)}await new Promise(r=>setTimeout(r,0));assert.match(m.brainStatus,/fallback/);assert.equal(m.thinking,false);assert.equal(m.state.phase,'flight');
 }finally{globalThis.fetch=original}
});
