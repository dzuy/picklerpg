import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateTrajectory,interceptFlight} from '../src/engine/trajectory';
import {Simulation,COURT} from '../src/simulation';
import {ShotLab,labSetup} from '../src/shot-lab';
import {sampleLeg} from '../src/engine/rally-engine';
function input(){const lab=new ShotLab();return {intent:lab.shot.intent,context:labSetup('drive').context,players:lab.state.players}}
test('pace, shape, clearance, tactical purpose and aggression influence deterministic flight',()=>{
 const {intent,context,players}=input();const gen=(patch:object)=>generateTrajectory({...intent,...patch},context,players);
 assert.ok(gen({pace:'fast'}).leg.duration<gen({pace:'soft'}).leg.duration);
 assert.ok(gen({shape:'arc'}).apex>gen({shape:'flat'}).apex);
 assert.ok(gen({intendedNetClearance:1.5}).netClearance>=1.5-1e-9);
 assert.ok(gen({tacticalIntent:'finish'}).leg.duration<gen({tacticalIntent:'neutralize'}).leg.duration);
 assert.ok(gen({aggression:1}).leg.duration<gen({aggression:0}).leg.duration);
 assert.deepEqual(gen({source:'voice'}).leg,gen({source:'menu'}).leg);assert.deepEqual(gen({}),gen({}));
});
test('generator preserves resolved target and reports geometric apex and clearance',()=>{
 const {intent,context,players}=input();const g=generateTrajectory({...intent,target:{kind:'zone',zone:'wide',depth:'deep'},shape:'arc'},context,players);
 assert.deepEqual(g.leg.to,g.aimPoint);assert.ok(g.leg.to.x<0);let sampledMax=0;for(let i=0;i<=10000;i++)sampledMax=Math.max(sampledMax,sampleLeg(g.leg,i/10000).y);assert.ok(Math.abs(sampledMax-g.apex)<1e-6);
 assert.equal(g.leg.bounceAtEnd,true);assert.ok(g.netClearance>=intent.intendedNetClearance-1e-8);
});
test('impossible descending request is rejected without silently changing shape',()=>{
 const {intent,context,players}=input();assert.throws(()=>generateTrajectory({...intent,shape:'descending',intendedNetClearance:2},context,players),/descending/);
 const lab=new ShotLab();lab.shape='descending';lab.clearance=2;lab.reset();assert.match(lab.issue!,/descending/);assert.throws(()=>lab.play());
});
test('interception is an exact slice of the generated parabola, not a new path',()=>{
 const {intent,context,players}=input();const original=generateTrajectory(intent,context,players).leg;const t=.7,cut=interceptFlight(original,t);
 for(const u of [0,.2,.5,1]){const a=sampleLeg(original,u*t),b=sampleLeg(cut,u);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-8)}assert.equal(cut.duration,original.duration*t);assert.equal(cut.bounceAtEnd,false);
});
test('default guided rally runs generated serve, return, drive, block and overhead',()=>{
 const sim=new Simulation();const snapshots=[];
 for(let i=0;i<1000&&sim.state.phase!=='complete';i++){
  if(sim.state.phase==='decision'){snapshots.push(sim.snapshot());sim.submitIntent(sim.availableIntents[0])}
  sim.update(.05);
 }
 assert.equal(sim.state.phase,'complete');assert.deepEqual(sim.state.shotHistory.map(s=>s.type),['serve','return','drive','block','overhead']);assert.deepEqual(snapshots.map(s=>s.shotIndex),[0,2,4]);
 assert.equal(snapshots[1].bounces,2);assert.equal(snapshots[2].bounces,2);assert.ok(snapshots[2].ball.position.y>=1.9);assert.ok(snapshots[2].players[0].position.z>COURT.kitchen);assert.equal(sim.state.score.home,1);
 const before=sim.snapshot();sim.update(100);assert.deepEqual(sim.snapshot(),before);sim.reset();assert.equal(sim.state.shotHistory.length,0);
});
