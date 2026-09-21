import test from 'node:test';
import assert from 'node:assert/strict';
import {COURT} from '../src/engine/model';
import {erneAvailable,erneReceptionFeet,kitchenSafeRoute} from '../src/engine/erne';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {executeShot} from '../src/engine/execution';
import {planPositions} from '../src/engine/positioning';
import {PreparedShotFixture,preparedContact} from './helpers/prepared-shot';

function fixture(x=1,z=1){
 const players=new PreparedShotFixture().state.players;
 const actor=z>0?'you' as const:'opponent-left' as const;
 const context={...preparedContact('volley').context,contact:{x:x*2.95,y:1.3,z:z*1.2},feet:{x:x*(COURT.width/2+.55),y:0,z:z*1.5},incomingSpeed:4};
 players.find(p=>p.id===actor)!.position={...context.feet};
 return {players,actor,context};
}
test('Erne needs a reachable airborne sideline contact outside the kitchen on either team and side',()=>{
 for(const x of [-1,1])for(const z of [-1,1]){
  const {context,players,actor}=fixture(x,z);
  assert.equal(buildDecisionMenu(actor,context,players)[0].intent.technique,'erne');
  for(const change of [{bounced:true},{twoBounceSatisfied:false},{opening:'return' as const},{feet:{x:x*2.8,y:0,z:z*1.5}},{contact:{x:0,y:1.3,z:z*1.2}},{contact:{x:x*2.95,y:.4,z:z*1.2}}]){
   assert.equal(erneAvailable({...context,...change}),false);
   assert.ok(!buildDecisionMenu(actor,{...context,...change},players).some(c=>c.intent.technique==='erne'));
  }
  assert.ok(erneReceptionFeet(context.contact,{x:x*3.15,y:0,z:z*2.8}));
  assert.equal(erneReceptionFeet(context.contact,{x:0,y:0,z:z*2.8}),undefined,'no diagonal shortcut through kitchen');
 }
});
test('Erne uses the chosen target, skill-dependent failures, and a safe recovery path',()=>{
 const {context,players,actor}=fixture();
 const intent={...buildDecisionMenu(actor,context,players)[0].intent,target:{kind:'point' as const,x:-1.2,z:-5}};
 const counts:number[]=[];
 for(const skill of [40,95]){
  const p=players.find(p=>p.id===actor)!;p.skills.volley=p.skills.hands=p.skills.movement=skill;
  let failures=0;
  for(let seed=0;seed<200;seed++){
   const e=executeShot(intent,context,players,{seed,balance:1});
   assert.equal(e.intended.aimPoint.x,-1.2);assert.equal(e.intended.aimPoint.z,-5);
   if(e.outcome!=='in')failures++;
  }
  counts.push(failures);
 }
 assert.ok(counts[0]>counts[1]+30,`skill should matter: ${counts}`);
 assert.ok(counts[1]>10,'even elite players can miss');
 const positions=planPositions({players,intent,endpoint:{x:-1.2,y:.037,z:-5},receiver:null,completedShots:4,duration:1});
 assert.ok(kitchenSafeRoute(context.feet,positions[actor]!),'volley momentum cannot carry player into kitchen');
});


test('a real planned sideline feed offers an Erne at reception and executes the chosen target',async()=>{
 const {Match}=await import('../src/match');
 const {feedErne}=await import('./helpers/erne-feed');
 for(const side of [-1,1]){
  const match=new Match();
  const incoming=feedErne(match,side);
  assert.equal(incoming.resolution?.receiver,'you');
  assert.ok(Math.abs(incoming.positions.you!.x)>COURT.width/2);
  for(let i=0;i<200&&match.state.phase==='flight';i++)match.engine.update(.02);
  const choice=match.targetingMenu.find(o=>o.intent.technique==='erne');
  assert.ok(choice,'real reception should retain the Erne option');
  const preview=match.previewMenuTarget(choice,{x:-side,z:-5});
  assert.equal(preview.intent.technique,'erne');assert.equal(preview.aimPoint.x,-side);assert.equal(preview.aimPoint.z,-5);
 }
});

test('corner Erne starts in lane, pauses before takeoff, clears the kitchen, and lands outside',async()=>{
 const {Match}=await import('../src/match');
 const {feedErne}=await import('./helpers/erne-feed');
 const {samplePlayerJump}=await import('../src/engine/erne');
 const {samplePlayback}=await import('../src/multiplayer/playback');
 for(const side of [-1,1]){
  const match=new Match(),incoming=feedErne(match,side);
  const start=structuredClone(match.state.players),jump=incoming.jump!;
  assert.ok(jump);
  assert.ok(Math.abs(jump.from.x)<COURT.width/2);
  assert.ok(Math.abs(jump.from.z)>COURT.kitchen);
  for(let i=0;i<200&&!match.receptionDecision;i++)match.engine.update(.01);
  assert.deepEqual(match.state.players.find(p=>p.id==='you')!.position,jump.from,'wait in lane until player decides');
  const paused=match.engine.runtime().shotElapsed;
  match.engine.chooseReception('airborne');
  match.engine.update(jump.start+jump.duration/2-paused);
  assert.deepEqual(match.state.players.find(p=>p.id==='you')!.position,samplePlayerJump(jump,jump.start+jump.duration/2));
  const to=structuredClone(start);to.find(p=>p.id==='you')!.position=jump.to;
  const remote=samplePlayback({jump:{...jump,start:jump.start-paused},intent:incoming.intent,actor:incoming.actor,duration:jump.start+jump.duration-paused,path:[incoming.contact,incoming.legs.at(-1)!.to],from:start,to},(jump.start+jump.duration/2-paused)*1000);
  assert.deepEqual(remote.players.find(p=>p.id==='you')!.position,match.state.players.find(p=>p.id==='you')!.position);
  for(let i=1;i<100;i++){
   const p=samplePlayerJump(jump,jump.start+jump.duration*i/100);
   if(Math.abs(p.x)<=COURT.width/2&&Math.abs(p.z)<=COURT.kitchen)assert.ok(p.y>0,'no grounded movement through kitchen');
  }
  const landing=samplePlayerJump(jump,jump.start+jump.duration);
  assert.equal(landing.y,0);assert.ok(Math.abs(landing.x)>COURT.width/2);
 }
});

test('choosing to let the ball bounce cancels the corner jump',async()=>{
 const {Match}=await import('../src/match');const {feedErne}=await import('./helpers/erne-feed');
 const match=new Match();feedErne(match);
 for(let i=0;i<200&&!match.receptionDecision;i++)match.engine.update(.01);
 assert.ok(match.shot.receptionChoice?.bounced);
 match.engine.chooseReception('bounced');assert.equal(match.shot.jump,undefined);
});


test('Erne alert needs both ball and original receiver near the same sideline',async()=>{
 for(const side of [-1,1])for(const half of [-1,1]){
  const contact={x:side*2.7,y:1.3,z:half*1.2},from={x:side*2.65,y:0,z:half*2.65};
  assert.ok(erneReceptionFeet(contact,from));
  assert.equal(erneReceptionFeet(contact,{...from,x:side*1.95}),undefined,'receiver too central');
  assert.equal(erneReceptionFeet({...contact,x:side*2.3},from),undefined,'ball too central');
  assert.equal(erneReceptionFeet(contact,{...from,x:-from.x}),undefined,'opposite sidelines');
  assert.equal(erneReceptionFeet(contact,{...from,z:half*2}),undefined,'takeoff inside kitchen');
  assert.equal(erneReceptionFeet({...contact,x:side*4},from),undefined,'wide out-ball is not an Erne opportunity');
 }
 const {Match}=await import('../src/match');const {feedErne}=await import('./helpers/erne-feed');
 const match=new Match();feedErne(match,1,1.95);
 for(let i=0;i<200&&!match.receptionDecision&&match.state.phase==='flight';i++)match.engine.update(.01);
 assert.ok(match.targetingMenu.length,'ordinary replies remain available');
 assert.ok(!match.targetingMenu.some(c=>c.intent.technique==='erne'),'planned reception retains original positioning gate');
 const {context,players,actor}=fixture();
 assert.ok(!buildDecisionMenu(actor,{...context,erneEligible:false},players).some(c=>c.intent.technique==='erne'));
});

test('Erne contact failures follow the attempted line instead of being redirected to a sideline',()=>{
 const {context,players,actor}=fixture();
 const player=players.find(p=>p.id===actor)!;player.skills.volley=player.skills.hands=player.skills.movement=40;
 const base=buildDecisionMenu(actor,context,players)[0].intent;
 for(const x of [-2,0,2]){
  const intent={...base,target:{kind:'point' as const,x,z:-5}};
  const crossing=context.contact.z/(context.contact.z+5),netX=context.contact.x+(x-context.contact.x)*crossing;
  let failedContacts=0;
  for(let seed=0;seed<100;seed++){
   const shot=executeShot(intent,context,players,{seed,balance:1});
   assert.equal(shot.intended.aimPoint.x,x);
   if(shot.actualEndpoint.z===0&&shot.actualEndpoint.y===.25){
    failedContacts++;assert.ok(Math.abs(shot.actualEndpoint.x-netX)<1e-8);
   }
  }
  assert.ok(failedContacts>30,'exercise repeated failed attempts');
 }
});

test('Erne landing and grounded recovery leave room for the animated feet',async()=>{
 const {Match}=await import('../src/match');const {feedErne}=await import('./helpers/erne-feed');
 const {ERNE_LANDING_CLEARANCE,ERNE_FOOT_CLEARANCE}=await import('../src/engine/erne');
 for(const side of [-1,1]){
  const match=new Match(),incoming=feedErne(match,side),jump=incoming.jump!;
  assert.ok(Math.abs(jump.to.x)>=COURT.width/2+ERNE_LANDING_CLEARANCE-1e-8);
  for(let i=0;i<200&&!match.receptionDecision;i++)match.engine.update(.01);
  const choice=match.targetingMenu.find(c=>c.intent.technique==='erne')!;
  const shot=match.previewMenuTarget(choice,{x:-side,z:-5});
  const end=shot.positions.you;
  for(let i=0;i<=100;i++){
   const x=jump.to.x+(end.x-jump.to.x)*i/100,z=jump.to.z+(end.z-jump.to.z)*i/100;
   if(Math.abs(z)<COURT.kitchen+.3)assert.ok(Math.abs(x)>=COURT.width/2+ERNE_FOOT_CLEARANCE);
  }
  match.playMenuTarget(choice,{x:-side,z:-5});
  for(let i=0;i<200&&match.shot.actor!=='you';i++)match.update(.01);
  assert.equal(match.shot.intent.technique,'erne');
  assert.deepEqual(match.shot.intent.target,{kind:'point',x:-side,z:-5});
 }
});
