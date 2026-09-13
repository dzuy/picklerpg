import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OpponentMemory,tacticalSnapshot,localDecision,validateChoice,STRATEGIES} from '../src/engine/opponent-brain';
import {Match} from '../src/match';
test('snapshot contains no future execution results and is detached',()=>{const m=new Match(),s=tacticalSnapshot(m.state,m.availableIntents,m.memory,'Wall',.9);assert.ok(!JSON.stringify(s).includes('resolution'));s.players[0].skills.drive=0;assert.notEqual(m.state.players[0].skills.drive,0);for(const x of [{choice:-1},{choice:1},{choice:0,score:11},null])assert.throws(()=>validateChoice(x,1));assert.equal(validateChoice({choice:0},1),0)});
test('memory is bounded and adaptation depends on intelligence without modifying skills',()=>{const m=new Match(),memory=new OpponentMemory();const drive={...m.availableIntents[0],type:'drive' as const};for(let i=0;i<45;i++)memory.add({intent:drive,crash:false,lowBackhandError:false});assert.equal(memory.summary().samples,40);const s=tacticalSnapshot(m.state,[drive,{...drive,type:'block'}],memory,'Banger',.9);assert.equal(localDecision(s),1);assert.equal(localDecision({...s,intelligence:.2}),0)});

function playPoint(m:Match){
 for(let i=0;i<3000&&m.state.phase!=='complete';i++){
  if(m.state.phase==='decision'&&m.state.possession==='home')m.submitIntent(m.availableIntents[0]);
  if(m.receptionDecision)m.chooseReception(m.canTakeAir?'air':'bounce');
  m.update(.05);
  assert.equal(m.thinking,false,'Model requests must never block a shot');
  assert.ok(!(m.state.phase==='decision'&&m.state.possession==='away'),'Opponent must play within the update');
 }
 assert.equal(m.state.phase,'complete');
}
test('a pending LLM strategy never pauses play and costs at most one call per point',async()=>{
 const original=globalThis.fetch;let resolve!:(r:Response)=>void,calls=0,payload:any;
 globalThis.fetch=((_url,init)=>{calls++;payload=JSON.parse(init!.body as string);return new Promise<Response>(r=>resolve=r);}) as typeof fetch;
 try{
  const m=new Match();m.brainMode='llm';playPoint(m);
  assert.equal(calls,1);assert.equal(payload.kind,'strategy');assert.equal(payload.options.length,STRATEGIES.length);assert.equal(payload.ball,undefined);
  resolve(new Response(JSON.stringify({choice:0})));await new Promise(r=>setTimeout(r,0));
  assert.match(m.brainStatus,/LLM strategy/);
  m.nextPoint();m.update(0);assert.equal(calls,2);
  m.reset();const before=m.snapshot();resolve(new Response(JSON.stringify({choice:1})));await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(m.snapshot(),before);assert.doesNotMatch(m.brainStatus,/Patient soft game/);
 }finally{globalThis.fetch=original;}
});
test('invalid strategy falls back without retrying every shot',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({choice:999}));}) as typeof fetch;
 try{const m=new Match();m.brainMode='llm';m.update(0);await new Promise(r=>setTimeout(r,0));assert.match(m.brainStatus,/fallback/);playPoint(m);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
test('background strategy biases legal choices without changing execution skills',()=>{
 const m=new Match(),base=m.availableIntents[0];
 const snapshot=tacticalSnapshot(m.state,[{...base,type:'drive'},{...base,type:'lob'}],m.memory,'Technician',.2);
 const before=structuredClone(snapshot);
 assert.equal(localDecision(snapshot,STRATEGIES[0]),0);assert.equal(localDecision(snapshot,STRATEGIES[3]),1);assert.deepEqual(snapshot,before);
});
