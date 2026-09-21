import test from 'node:test';
import assert from 'node:assert/strict';
import {executeShot} from '../src/engine/execution';
import {popUpChance} from '../src/engine/soft-contact';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {incomingShotLabel} from '../src/incoming-shot';
import {PreparedShotFixture,preparedContact} from './helpers/prepared-shot';
import {Match} from '../src/match';
import {setupBaitPractice} from './helpers/bait-practice';

test('low stretched contacts can float up; touch skill and a reset reduce the chance',()=>{
 const players=new PreparedShotFixture().state.players,p=players[0];
 const c={...preparedContact('dink').context,contact:{x:2.8,y:.5,z:1.7},feet:{x:1.9,y:0,z:2.1},timingPressure:.45,incomingSpeed:3};
 p.position=c.feet;p.skills.dink=p.skills.reset=p.skills.hands=55;
 const dink=buildDecisionMenu('you',c,players).find(o=>o.intent.type==='dink')!.intent;
 assert.ok(popUpChance({...dink,type:'reset'},c,p)<popUpChance(dink,c,p));
 assert.ok(popUpChance(dink,{...c,contact:{x:1.9,y:.5,z:1.8},timingPressure:0},p)>0);
 assert.equal(popUpChance({...dink,type:'lob'},c,p),0);
 const counts:number[]=[];
 for(const skill of [55,95]){
  p.skills.dink=p.skills.hands=skill;let count=0;
  for(let seed=0;seed<500;seed++){
   const e=executeShot(dink,c,players,{seed,balance:1});if(e.popUp){count++;assert.ok(e.leg.arc>e.intended.leg.arc);assert.ok(Math.abs(e.actualEndpoint.z)>Math.abs(e.intended.aimPoint.z));}
  }
  counts.push(count);
 }
 assert.ok(counts[0]>counts[1]*1.5,`touch protection: ${counts}`);
 assert.ok(counts[0]>30&&counts[0]<400,`opportunities, not guaranteed pop-ups: ${counts}`);
});

test('wide setup creates a real attackable return; the same middle setup does not',()=>{
 for(const wide of [true,false]){
  const m=new Match();setupBaitPractice(m,15);
  m.playMenuTarget(m.targetingMenu.find(c=>c.intent.type==='dink')!,{x:wide?2.8:.4,z:-1.4});
  m.engine.advanceToBoundary();
  assert.equal(m.state.possession,'away');assert.equal(!!m.shot.feedback?.popUp,wide);
  if(wide)assert.ok(m.shot.feedback?.difficulty.includes('Stretched contact'));
  m.engine.submitIntent(m.availableIntents[0]);m.engine.advanceToBoundary();
  assert.equal(m.state.incomingPopUp,wide);
  const label=incomingShotLabel(m.state.shotHistory.at(-1),false,m.state.incomingPopUp);
  assert.equal(label==='High pop-up incoming',wide);
  if(wide){
   const overhead=m.targetingMenu.find(c=>c.intent.type==='overhead');assert.ok(overhead,'actual high contact unlocks an overhead');
   const attack=m.previewMenuTarget(overhead,{x:-2,z:-5});assert.deepEqual(attack.intent.target,{kind:'point',x:-2,z:-5});
   assert.ok(!attack.feedback?.popUp);
  }
 }
});

test('pop-up is reproducible and describes the committed flight rather than a shot name',()=>{
 const m=new Match();setupBaitPractice(m,1);
 const choice=m.targetingMenu.find(c=>c.intent.type==='dink')!;
 const a=m.previewMenuTarget(choice,{x:2.8,z:-1.4}),b=m.previewMenuTarget(choice,{x:2.8,z:-1.4});assert.deepEqual(a,b);
 assert.equal(incomingShotLabel(choice.intent,false,true),'High pop-up incoming');
 assert.equal(incomingShotLabel(choice.intent,true,true),'Your serve');
 assert.notEqual(incomingShotLabel(choice.intent,false,false),'High pop-up incoming');
});

test('guided comparison seed lets stronger touch neutralize the same wide setup',()=>{
 for(const strong of [false,true]){
  const m=new Match();setupBaitPractice(m,15,strong);
  m.playMenuTarget(m.targetingMenu.find(c=>c.intent.type==='dink')!,{x:2.8,z:-1.4});m.engine.advanceToBoundary();
  assert.equal(m.state.possession,'away');assert.equal(m.shot.feedback?.popUp,!strong);
  m.engine.submitIntent(m.availableIntents[0]);m.engine.advanceToBoundary();
  assert.equal(m.targetingMenu.some(c=>c.intent.type==='overhead'),!strong);
 }
});


test('pop-up tuning separates touch skills and makes lateness and stretching matter',()=>{
 const players=new PreparedShotFixture().state.players,p=players[0];
 const comfortable={...preparedContact('dink').context,contact:{x:2.8,y:.5,z:1.7},feet:{x:2.6,y:0,z:2},incomingSpeed:3};
 const intent=buildDecisionMenu('you',comfortable,players).find(s=>s.intent.type==='dink')!.intent;
 const rates:number[][]=[];
 for(const skill of [40,60,80,95]){
  p.skills.dink=p.skills.hands=skill;
  const row=[];
  for(const context of [comfortable,{...comfortable,timingPressure:.65},{...comfortable,feet:{x:1.9,y:0,z:2.1},timingPressure:.45}]){
   let count=0;for(let seed=0;seed<2000;seed++)if(executeShot(intent,context,players,{seed,balance:1}).popUp)count++;
   row.push(count/2000);
  }
  assert.ok(row[0]<row[1]&&row[1]<row[2]);rates.push(row);
 }
 for(let level=1;level<rates.length;level++)for(let context=0;context<3;context++)assert.ok(rates[level][context]<rates[level-1][context]);
 assert.ok(rates[0][0]>=.05&&rates[0][0]<=.15,'weak comfortable touches sometimes float');
 assert.ok(rates[0][2]>=.45&&rates[0][2]<=.7,'pressure creates frequent but not certain openings');
 assert.ok(rates[3][0]<.02&&rates[3][2]<.15,'strong touch remains protective');
});
