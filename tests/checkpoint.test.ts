import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {parseCheckpoint,type MatchCheckpoint} from '../src/engine/checkpoint';

const json=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function savedMatch(seed=1741){const m=new Match();m.seed=seed;m.reset();let saved=m.exportCheckpoint();m.onCheckpoint=c=>{saved=json(c)};return {m,saved:()=>saved};}
function finish(m:Match,dt=.1){for(let i=0;i<10000&&m.state.phase==='flight'&&!m.receptionDecision;i++)m.update(dt);}
function same(a:Match,b:Match){assert.deepEqual(json(a.exportCheckpoint()),json(b.exportCheckpoint()));}

test('serve checkpoint is detached, restores without reset and excludes presentation clocks',()=>{
 const {m}=savedMatch();m.state.paused=true;m.replayIndex=9;m.customDraft='draft';
 const c=json(m.exportCheckpoint());const r=Match.fromCheckpoint(c);same(m,r);assert.equal(r.state.paused,false);assert.equal(r.replayIndex,null);assert.equal(r.customDraft,'');
 for(const key of ['elapsed','legIndex','simulationTime','paused'])assert.ok(!(key in c.rally.state));
 c.rally.state.players[0].skills.serve=0;assert.notEqual(m.state.players[0].skills.serve,0);
});

test('shot commits return/contact or result before animation and resumes without reroll',()=>{
 const {m,saved}=savedMatch();m.submitIntent(m.availableIntents[0]);assert.equal(m.state.phase,'flight');
 const r=Match.fromCheckpoint(saved());assert.notEqual(r.state.phase,'flight');assert.equal(r.state.shotHistory.length,1);
 // Drive only the presentation engine: an away CPU decision is a separate action.
 m.engine.update(100);m.update(0); // may submit the CPU response, itself saved before playback
 same(m,Match.fromCheckpoint(saved()));
 assert.equal(r.seed,1741);
});

test('each boundary round trips through a full game, including service rotation and terminal score',()=>{
 const {m,saved}=savedMatch(9);const seen=new Set<string>();
 for(let i=0;i<15000&&!m.scoring.winner;i++){
  if(m.state.phase==='flight'&&!m.receptionDecision){m.update(.2);continue}
  const c=m.exportCheckpoint();seen.add(c.rally.kind);seen.add(c.rally.state.stage);same(m,Match.fromCheckpoint(json(c)));
  if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');
  else if(m.state.phase==='decision')m.submitIntent(m.availableIntents[i%m.availableIntents.length]);
  else m.nextPoint();
 }
 assert.ok(m.scoring.winner);const end=Match.fromCheckpoint(saved());assert.ok(end.scoring.winner);const score={...end.scoring.score};end.update(100);assert.deepEqual(end.scoring.score,score);
 assert.ok(seen.has('serve'));assert.ok(seen.has('point-end'));assert.ok(m.point>10);
});

test('reception timing branches survive reload and choose the identical next contact',()=>{
 let source:MatchCheckpoint|undefined;
 for(let seed=1;seed<=12&&!source;seed++){
  const {m}=savedMatch(seed);
  for(let i=0;i<1000&&!source;i++){
   if(m.receptionDecision){source=m.exportCheckpoint();break}
   if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);else if(m.state.phase==='complete')m.nextPoint();
   m.update(.2);
  }
 }
 assert.ok(source,'expected a reception fixture');
 for(const timing of ['air','bounce'] as const){
  const a=Match.fromCheckpoint(source),b=Match.fromCheckpoint(json(source));if(timing==='air'?!a.canTakeAir:!a.canLetBounce)continue;
  a.onCheckpoint=()=>{};b.onCheckpoint=()=>{};a.chooseReception(timing);b.chooseReception(timing);same(a,b);
  assert.equal(a.exportCheckpoint().rally.kind,'contact');
 }
});

test('deuce, win-by-two, right court and completion hydrate without a second award',()=>{
 const {m,saved}=savedMatch();m.scoring.score={home:10,away:10};m.state.score={home:10,away:10};
 const r=Match.fromCheckpoint(m.exportCheckpoint());assert.equal(r.scoring.call,'10–10–2');
 r.scoring.award('home');assert.equal(r.scoring.winner,null);r.scoring.award('home');assert.equal(r.scoring.winner,'home');
 const c=m.exportCheckpoint();c.scoring.serverNumber=1;c.scoring.right.home='partner';const restored=Match.fromCheckpoint(c);assert.equal(restored.scoring.right.home,'partner');assert.equal(restored.scoring.serverNumber,1);
});

test('invalid saves are rejected before hydration',()=>{
 const c=new Match().exportCheckpoint();
 for(const edit of [(v:any)=>v.schemaVersion=99,(v:any)=>v.seed=NaN,(v:any)=>v.rally.state.players.pop(),(v:any)=>v.rally.options[0].legs[0].duration=-1,(v:any)=>v.scoring.server='opponent-left',(v:any)=>v.solo.memory=null]){
  const bad=json(c);edit(bad);assert.throws(()=>parseCheckpoint(bad));
 }
});

test('failed persistence rolls the accepted action back before animation',()=>{
 const {m}=savedMatch();const before=m.exportCheckpoint();m.onCheckpoint=()=>{throw new Error('Disk full')};
 assert.throws(()=>m.submitIntent(m.availableIntents[0]),/Disk full/);assert.deepEqual(json(m.exportCheckpoint()),json(before));assert.equal(m.state.phase,'decision');
});

function receptionFixture(){
 for(let seed=1;seed<30;seed++){
  const {m}=savedMatch(seed);
  for(let i=0;i<1500;i++){
   if(m.receptionDecision){if(m.canTakeAir&&m.canLetBounce)return m.exportCheckpoint();m.chooseReception(m.canLetBounce?'bounce':'air')}
   else if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);else if(m.state.phase==='complete')m.nextPoint();
   m.update(.3);
  }
 }
 throw new Error('No dual reception found');
}

test('both reception branches and combined timing/shot commit before their animations',()=>{
 const c=receptionFixture();
 for(const timing of ['air','bounce'] as const){
  const m=Match.fromCheckpoint(c);let saved:MatchCheckpoint|undefined;m.onCheckpoint=v=>{saved=json(v)};
  const choice=m.receptionOptions.find(o=>o.timing===timing)!;assert.ok(choice);
  const count=m.state.shotHistory.length;m.chooseReceptionIntent(choice);
  assert.equal(saved!.rally.state.shotHistory.length,count+1);assert.equal(m.state.phase,'flight');
  const restored=Match.fromCheckpoint(saved);assert.equal(restored.state.shotHistory.at(-1)!.type,choice.intent.type);
  // Presentation must consume committed data, not call the gameplay provider again.
  m.thinking=true; // Hold the CPU's following turn while checking this action's playback.
  (m as any).nextContact=()=>{throw new Error('Presentation re-resolved a shot')};
  for(let i=0;i<1000&&m.state.phase==='flight'&&!m.receptionDecision;i++)m.update(.05);
  same(m,restored);
 }
});

test('frame partition, pause, animation skip and repeated reload give the same committed outcome',()=>{
 const initial=new Match().exportCheckpoint();
 const run=(dt:number,reload:boolean)=>{
  let m=Match.fromCheckpoint(initial);let latest=initial;
  const install=()=>{m.onCheckpoint=c=>{latest=json(c)}};install();
  for(let n=0;n<3000&&m.state.phase!=='complete';n++){
   if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');
   else if(m.state.phase==='decision'&&m.state.possession==='home')m.submitIntent(m.availableIntents[0]);
   m.update(dt);
   if(reload){m=Match.fromCheckpoint(latest);install();}
  }
  assert.equal(latest.rally.kind,'point-end');return latest;
 };
 assert.deepEqual(run(.017,false),run(.4,false));assert.deepEqual(run(.017,false),run(.017,true));
 const {m,saved}=savedMatch();m.submitIntent(m.availableIntents[0]);const committed=saved();m.state.paused=true;m.update(50);assert.deepEqual(saved(),committed);same(m,Match.fromCheckpoint(committed));
});

test('frozen roster and local CPU memory survive future point starts',()=>{
 const {m}=savedMatch(3);m.state.players[1].skills.movement=87;
 for(let i=0;i<1000&&m.state.phase!=='complete';i++){
  if(m.receptionDecision)m.chooseReception(m.canLetBounce?'bounce':'air');else if(m.state.phase==='decision')m.submitIntent(m.availableIntents[0]);m.update(.2);
 }
 const c=m.exportCheckpoint(),restored=Match.fromCheckpoint(c);assert.deepEqual(restored.memory.observations,m.memory.observations);
 restored.nextPoint();assert.equal(restored.state.players.find(p=>p.id==='partner')!.skills.movement,87);assert.equal(restored.point,c.pointIndex+1);
 assert.deepEqual(restored.scoring.right,c.scoring.right);assert.equal(restored.scoring.server,c.scoring.server);
});

test('CPU save retry never changes its choice-history sample',()=>{
 const {m,saved}=savedMatch();m.submitIntent(m.availableIntents[0]);
 const c=saved();if(c.rally.kind!=='contact'||c.rally.state.possession!=='away')throw new Error('Expected serve return');
 const r=Match.fromCheckpoint(c);r.onCheckpoint=()=>{throw new Error('Disk full')};
 for(let attempt=0;attempt<3;attempt++){assert.throws(()=>r.update(0),/Disk full/);same(r,Match.fromCheckpoint(c));}
 let next:MatchCheckpoint|undefined;r.onCheckpoint=v=>{next=v};r.update(0);
 const clean=Match.fromCheckpoint(c);clean.onCheckpoint=()=>{};clean.update(0);assert.deepEqual(json(next),json(clean.exportCheckpoint()));
});

test('a point-ending custom serve commits the deuce and winning score before animation',async()=>{
 for(const homeScore of [10,11]){
  let checked=false;
  for(let i=0;i<40&&!checked;i++){
   const {m,saved}=savedMatch(i*104729);m.scoring.score={home:homeScore,away:10};m.state.score={...m.scoring.score};
   await m.submitCommand('nasty nelson rio');
   const c=saved();if(c.rally.kind!=='point-end'||c.rally.state.result?.winner!=='home')continue;
   assert.equal(m.state.phase,'flight');assert.equal(c.scoring.score.home,homeScore+1);assert.equal(c.scoring.winner,homeScore===11?'home':null);
   assert.equal(c.scoring.right.home,'partner');
   const r=Match.fromCheckpoint(c);const before=r.scoring.call;r.update(100);assert.equal(r.scoring.call,before);same(r,Match.fromCheckpoint(json(c)));checked=true;
  }
  assert.ok(checked,'expected a real body-serve winner');
 }
});

test('restoration cancels an in-flight text interpretation without changing the new decision',async()=>{
 const m=Match.fromCheckpoint(receptionFixture());const before=m.exportCheckpoint();let reply:((r:Response)=>void)|undefined;
 const oldFetch=globalThis.fetch;globalThis.fetch=()=>new Promise<Response>(resolve=>{reply=resolve});
 try{
  const pending=m.queueReceptionCommand('a surprisingly crafty pickleball shot');m.restoreCheckpoint(before);
  reply!(new Response(JSON.stringify({shot:'drive',target:'middle',aim:'space',pace:'fast',spin:'none',spinDirection:'none',spinStrength:'medium'})));
  await assert.rejects(pending,/no longer available/);same(m,Match.fromCheckpoint(before));assert.equal(m.customBusy,false);
 }finally{globalThis.fetch=oldFetch;}
});
