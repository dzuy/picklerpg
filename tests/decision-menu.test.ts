import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {ShotLab,labSetup} from '../src/shot-lab';
import {generateTrajectory} from '../src/engine/trajectory';
test('contact menus filter opening, height, bounce and tactical situation',()=>{
 const players=new ShotLab().state.players;
 for(const [type,expected] of [['serve',['serve']],['return',['return']],['drive',['drive','drop','lob']],['counter',['counter','block','volley']],['dink',['dink','reset']]] as const){
  const c=labSetup(type).context,options=buildDecisionMenu('you',c,players);
  assert.deepEqual(options.map(o=>o.intent.type),expected);for(const o of options)assert.doesNotThrow(()=>generateTrajectory(o.intent,c,players));
 }
 const high=buildDecisionMenu('you',labSetup('overhead').context,players);assert.ok(high.some(o=>o.intent.type==='overhead'));assert.ok(!high.some(o=>o.intent.type==='drive'));
});
test('illegal volley contacts offer nothing and inputs remain unchanged',()=>{
 const players=new ShotLab().state.players,c=labSetup('counter').context,before=structuredClone({players,c});
 assert.equal(buildDecisionMenu('you',{...c,twoBounceSatisfied:false},players).length,0);
 assert.equal(buildDecisionMenu('you',{...c,feet:{x:0,y:0,z:1}},players).length,0);
 buildDecisionMenu('you',c,players);assert.deepEqual({players,c},before);
});
test('choosing an alternative preserves contact and rejects unavailable or stale intent',()=>{
 const lab=new ShotLab();lab.decisionSituation='drive';lab.reset();const contact={...lab.shot.contact};
 const drop=lab.decisionOptions.find(o=>o.intent.type==='drop')!.intent;lab.chooseIntent({...drop,source:'voice'});assert.equal(lab.shot.intent.type,'drop');assert.deepEqual(lab.shot.contact,contact);
 assert.throws(()=>lab.chooseIntent({...drop,type:'overhead'}));lab.play();assert.throws(()=>lab.chooseIntent(drop));lab.update(10);assert.equal(lab.state.phase,'complete');
 lab.decisionSituation='serve';lab.reset();assert.throws(()=>lab.chooseIntent(drop));assert.equal(lab.shot.intent.type,'serve');
});
test('context menu takes priority over opponent mode and clears when disabled',()=>{
 const lab=new ShotLab();lab.opponentSituation='pressure';lab.decisionSituation='drive';lab.reset();assert.equal(lab.shot.actor,'you');assert.equal(lab.opponentDecision,null);
 lab.decisionSituation='off';lab.reset();assert.equal(lab.decisionOptions.length,0);assert.equal(lab.shot.actor,'opponent-left');
});
