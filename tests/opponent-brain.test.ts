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

test('local opponents vary shot families and defenders while remaining seed reproducible',async()=>{
 const {intendedReceiver}=await import('../src/engine/opponent-brain');
 const m=new Match(),base={...m.availableIntents[0],actor:'opponent-left' as const};
 const options=(['dink','drop'] as const).flatMap(type=>(['you','partner'] as const).map(playerId=>({...base,type,target:{kind:'player' as const,playerId,aim:'feet' as const}})));
 const snapshot=tacticalSnapshot(m.state,options,m.memory,'Technician',.8);
 function run(){const recent:{intent:typeof options[number];receiver:string|null}[]=[],chosen:number[]=[];for(let i=0;i<120;i++){const choice=localDecision(snapshot,undefined,{seed:1741+i*7919,recent});chosen.push(choice);recent.push({intent:options[choice],receiver:intendedReceiver(snapshot,options[choice])});if(recent.length>8)recent.shift()}return chosen}
 const choices=run();assert.deepEqual(choices,run());assert.equal(new Set(choices).size,4);
 const partner=choices.filter(i=>options[i].target.playerId==='partner').length;assert.ok(partner>35&&partner<85,`partner received ${partner}/120`);
 const drops=choices.filter(i=>options[i].type==='drop').length;assert.ok(drops>30&&drops<90);
 const repeated=Array.from({length:8},()=>({intent:options[0],receiver:'you'}));
 for(let seed=0;seed<100;seed++)assert.notEqual(localDecision(snapshot,undefined,{seed,recent:repeated}),0,'breaks an entrenched identical-shot pattern');
});

test('variation retains forced shots and clear tactical finish opportunities',()=>{
 const m=new Match(),base=m.availableIntents[0];
 const snapshot=tacticalSnapshot(m.state,[{...base,type:'overhead'},{...base,type:'dink'}],m.memory,'Banger',.8);snapshot.ball.position.y=2.2;
 for(let seed=0;seed<100;seed++)assert.equal(localDecision(snapshot,undefined,{seed,recent:[]}),0);
 const only={...snapshot,options:[base]};assert.equal(localDecision(only,undefined,{seed:99,recent:Array.from({length:8},()=>({intent:base,receiver:'partner'}))}),0);
});

test('automatic lobs favor space behind defenders on either side and remain available when forced',()=>{
 for(const actor of ['you','opponent-left'] as const){
  const m=new Match(),hitter=m.state.players.find(p=>p.id===actor)!;
  const side=hitter.team==='home'?1:-1;
  const base={...m.availableIntents[0],actor,target:{kind:'point' as const,x:0,z:-side*5.6}};
  const s=tacticalSnapshot(m.state,[{...base,type:'lob'},{...base,type:'drive'}],m.memory,'Chess Player',.8);
  s.ball.position={x:0,y:1,z:side*4};
  const count=(depth:number)=>{
   s.players.filter(p=>p.team!==hitter.team).forEach((p,i)=>p.position={x:i?1.4:-1.4,y:0,z:-side*depth});
   return Array.from({length:500},(_,seed)=>localDecision(s,undefined,{seed,recent:[]})).filter(i=>i===0).length;
  };
  const open=count(2.3),covered=count(5.5);
  assert.ok(open>100,'lobs remain a useful option over an advanced defense');
  assert.ok(covered<open/4,`${actor}: covered ${covered}, open ${open}`);
  assert.equal(localDecision({...s,options:[s.options[0]]},undefined,{seed:12,recent:[]}),0);
 }
});
