import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateTrajectory,interceptFlight,reboundFlight,finishRebound,sampleFlightVelocity} from '../src/engine/trajectory';
import {PreparedShotFixture,preparedContact} from './helpers/prepared-shot';
import {sampleLeg} from '../src/engine/rally-engine';
function input(){const lab=new PreparedShotFixture();return {intent:lab.shot.intent,context:preparedContact('drive').context,players:lab.state.players}}
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
 const lab=new PreparedShotFixture();lab.shape='descending';lab.clearance=2;lab.reset();assert.match(lab.issue!,/descending/);assert.throws(()=>lab.play());
});
test('interception is an exact slice of the generated parabola, not a new path',()=>{
 const {intent,context,players}=input();const original=generateTrajectory(intent,context,players).leg;const t=.7,cut=interceptFlight(original,t);
 for(const u of [0,.2,.5,1]){const a=sampleLeg(original,u*t),b=sampleLeg(cut,u);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-8)}assert.equal(cut.duration,original.duration*t);assert.equal(cut.bounceAtEnd,false);
});
test('side spin curves left or right and strong spin bends farther',()=>{
 const {intent,context,players}=input(),at=.5;
 const plain=generateTrajectory(intent,context,players).leg;
 const make=(side:'left'|'right',strength:'light'|'strong')=>generateTrajectory({...intent,spin:{side,vertical:'none',strength}},context,players).leg;
 const light=make('right','light'),strong=make('right','strong'),left=make('left','strong');
 const baseline=sampleLeg(plain,at).x,lightOffset=sampleLeg(light,at).x-baseline,strongOffset=sampleLeg(strong,at).x-baseline,leftOffset=sampleLeg(left,at).x-baseline;
 assert.ok(lightOffset>0);assert.ok(strongOffset>lightOffset*2);assert.ok(leftOffset<0);const endpoint=sampleLeg(strong,1);assert.ok(Math.hypot(endpoint.x-strong.to.x,endpoint.y-strong.to.y,endpoint.z-strong.to.z)<1e-12);
});
test('topspin pulls the late flight down and preserves exact spin interception',()=>{
 const {intent,context,players}=input(),plain=generateTrajectory({...intent,intendedNetClearance:.5},context,players).leg;
 const top=generateTrajectory({...intent,intendedNetClearance:.5,spin:{side:'left',vertical:'topspin',strength:'strong'}},context,players).leg;
 assert.ok(sampleLeg(top,.82).y<sampleLeg(plain,.82).y);assert.ok(sampleLeg(top,.82).x<sampleLeg(plain,.82).x);
 const t=.68,cut=interceptFlight(top,t);for(const u of [0,.2,.5,.8,1]){const a=sampleLeg(top,u*t),b=sampleLeg(cut,u);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-8)}
});

test('unreturned rebound preserves velocity into its final landing',()=>{
 const rebound=reboundFlight({from:{x:0,y:1,z:4},to:{x:2,y:.037,z:-4},duration:1,arc:1,bounceAtEnd:true});
 const finish=finishRebound(rebound),before=sampleFlightVelocity(rebound,1),after=sampleFlightVelocity(finish,0);
 assert.deepEqual(finish.from,rebound.to);
 for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(before[axis]-after[axis])<1e-9);
 assert.ok(finish.to.x>finish.from.x);assert.ok(finish.to.z<finish.from.z);assert.equal(finish.to.y,.037);assert.equal(finish.bounceAtEnd,true);
});
