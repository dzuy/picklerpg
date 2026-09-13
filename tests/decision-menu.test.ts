import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {PreparedShotFixture,preparedContact} from './helpers/prepared-shot';
import {generateTrajectory} from '../src/engine/trajectory';
test('contact menus filter opening, height, bounce and tactical situation',()=>{
 const players=new PreparedShotFixture().state.players;
 for(const [type,expected] of [['serve',['serve']],['return',['return']],['drive',['drive','drop','lob']],['counter',['counter','block','volley','lob']],['dink',['dink','reset','lob']]] as const){
  const c=preparedContact(type).context,options=buildDecisionMenu('you',c,players);
  assert.deepEqual([...new Set(options.map(o=>o.intent.type))],expected);for(const o of options)assert.doesNotThrow(()=>generateTrajectory(o.intent,c,players));
 }
 const high=buildDecisionMenu('you',preparedContact('overhead').context,players);assert.ok(high.some(o=>o.intent.type==='overhead'));assert.ok(!high.some(o=>o.intent.type==='drive'));
});
test('illegal volley contacts offer nothing and inputs remain unchanged',()=>{
 const players=new PreparedShotFixture().state.players,c=preparedContact('counter').context,before=structuredClone({players,c});
 assert.equal(buildDecisionMenu('you',{...c,twoBounceSatisfied:false},players).length,0);
 assert.equal(buildDecisionMenu('you',{...c,feet:{x:0,y:0,z:1}},players).length,0);
 buildDecisionMenu('you',c,players);assert.deepEqual({players,c},before);
});
test('choosing an alternative preserves contact and rejects unavailable or stale intent',()=>{
 const lab=new PreparedShotFixture();lab.decisionSituation='drive';lab.reset();const contact={...lab.shot.contact};
 const drop=lab.decisionOptions.find(o=>o.intent.type==='drop')!.intent;lab.chooseIntent({...drop,source:'voice'});assert.equal(lab.shot.intent.type,'drop');assert.deepEqual(lab.shot.contact,contact);
 assert.throws(()=>lab.chooseIntent({...drop,type:'overhead'}));lab.play();assert.throws(()=>lab.chooseIntent(drop));lab.update(10);assert.equal(lab.state.phase,'complete');
 lab.decisionSituation='serve';lab.reset();assert.throws(()=>lab.chooseIntent(drop));assert.equal(lab.shot.intent.type,'serve');
});
test('context menu takes priority over opponent mode and clears when disabled',()=>{
 const lab=new PreparedShotFixture();lab.opponentSituation='pressure';lab.decisionSituation='drive';lab.reset();assert.equal(lab.shot.actor,'you');assert.equal(lab.opponentDecision,null);
 lab.decisionSituation='off';lab.reset();assert.equal(lab.decisionOptions.length,0);assert.equal(lab.shot.actor,'opponent-left');
});
test('return styles have distinct flights and preserve the opening bounce rule',()=>{
 const players=new PreparedShotFixture().state.players,c=preparedContact('return').context;
 const options=buildDecisionMenu('you',c,players);
 assert.deepEqual(options.map(o=>o.label),['Drive','Topspin','Slice','Lob']);assert.equal(options.length,4);assert.ok(options.every(o=>o.intent.type==='return'));
 assert.ok(options.some(o=>o.intent.spin?.vertical==='topspin'));
 assert.ok(options.some(o=>o.intent.spin?.vertical==='slice'));
 const lob=options.find(o=>o.label==='Lob')!,drive=options.find(o=>o.label==='Drive')!;
 assert.ok(generateTrajectory(lob.intent,c,players).apex>generateTrajectory(drive.intent,c,players).apex);
 assert.equal(buildDecisionMenu('you',{...c,bounced:false,twoBounceSatisfied:false},players).length,0);
});
test('lob is offered across legal rally contacts, including low, high and airborne contacts',()=>{
 const players=new PreparedShotFixture().state.players;
 for(const type of ['drive','counter','dink','overhead','reset'] as const){
  const c=preparedContact(type).context,options=buildDecisionMenu('you',c,players);
  const lob=options.find(o=>o.intent.type==='lob');assert.ok(lob,type);assert.doesNotThrow(()=>generateTrajectory(lob.intent,c,players));
 }
});
test('return labels describe technique regardless of target depth',async()=>{
 const {choiceCopy}=await import('../src/shot-choice');
 const players=new PreparedShotFixture().state.players,c=preparedContact('return').context;
 for(const choice of buildDecisionMenu('you',c,players)){
  for(const z of [-1,-3,-6]){
   const intent={...choice.intent,target:{kind:'point' as const,x:.5,z}};
   assert.equal(choiceCopy(intent).name,choice.label);
   assert.deepEqual(generateTrajectory(intent,c,players).aimPoint,{x:.5,y:.037,z});
  }
 }
});
