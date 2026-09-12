import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COURT} from '../src/engine/model';
import {buildFamilyFlight,contactIssue,SHOT_FAMILIES} from '../src/engine/shot-families';
import {sampleLeg} from '../src/engine/rally-engine';
import {LAB_TYPES,labSetup,ShotLab} from '../src/shot-lab';

test('every family creates a finite continuous net-clearing flight to its prepared landing',()=>{
 for(const type of LAB_TYPES){const {context,landing}=labSetup(type);assert.equal(contactIssue(type,context),null,type);const leg=buildFamilyFlight(type,context,landing);assert.deepEqual(sampleLeg(leg,0),context.contact);const end=sampleLeg(leg,1);assert.ok(Math.hypot(end.x-landing.x,end.y-landing.y,end.z-landing.z)<1e-8);const t=context.contact.z/(context.contact.z-landing.z);const crossing=sampleLeg(leg,t);const net=COURT.netCenter+(COURT.netSideline-COURT.netCenter)*(crossing.x/(COURT.width/2))**2;assert.ok(crossing.y-.037>net,type);for(let n=0;n<=100;n++){const p=sampleLeg(leg,n/100);assert.ok([p.x,p.y,p.z].every(Number.isFinite));assert.ok(p.y>=0)}assert.equal(leg.bounceAtEnd,true)}
});
test('families have meaningfully different speed and height profiles',()=>{
 const {context,landing}=labSetup('drive');const drive=buildFamilyFlight('drive',context,landing),drop=buildFamilyFlight('drop',context,landing),lob=buildFamilyFlight('lob',context,landing);
 assert.ok(drive.duration<drop.duration);assert.ok(sampleLeg(lob,.5).y>sampleLeg(drop,.5).y+2);assert.ok(sampleLeg(drop,.5).y>sampleLeg(drive,.5).y+.5);
 assert.ok(SHOT_FAMILIES.counter.speed>SHOT_FAMILIES.block.speed*2);
 const overhead=labSetup('overhead'),smash=buildFamilyFlight('overhead',overhead.context,overhead.landing);assert.ok(sampleLeg(smash,.1).y<smash.from.y);
});
test('contact gates reject low overheads, early volleys, kitchen volleys and weak counters',()=>{
 assert.match(contactIssue('overhead',labSetup('overhead','low').context)!,/higher/);
 for(const type of ['overhead','volley','counter'] as const)assert.match(contactIssue(type,labSetup(type,'kitchen').context)!,/kitchen/);
 const volley=labSetup('volley').context;volley.twoBounceSatisfied=false;assert.match(contactIssue('volley',volley)!,/bounce/);volley.twoBounceSatisfied=true;volley.bounced=true;assert.match(contactIssue('volley',volley)!,/before/);
 const counter=labSetup('counter').context;counter.incomingSpeed=2;assert.match(contactIssue('counter',counter)!,/attack/);
 const dink=labSetup('dink').context;dink.feet.z=6;assert.match(contactIssue('dink',dink)!,/far back/);
});
test('serve and return enforce their opening and bounce prerequisites',()=>{
 const serve=labSetup('serve');serve.context.feet.z=6;assert.match(contactIssue('serve',serve.context)!,/baseline/);
 const valid=labSetup('serve');assert.throws(()=>buildFamilyFlight('serve',valid.context,{x:1,y:.037,z:-5}),/diagonally/);assert.throws(()=>buildFamilyFlight('serve',valid.context,{x:-1,y:.037,z:-1}),/kitchen/);
 const ret=labSetup('return').context;ret.bounced=false;assert.match(contactIssue('return',ret)!,/bounce/);
 assert.match(contactIssue('serve',labSetup('drive').context)!,/starts/);
});
test('bad contact or destination cannot produce invalid geometry',()=>{
 const data=labSetup('drive');data.context.contact.y=NaN;assert.throws(()=>buildFamilyFlight('drive',data.context,data.landing),/Invalid/);
 const good=labSetup('drive');for(const landing of [{x:0,y:.037,z:4},{x:99,y:.037,z:-3},{x:0,y:NaN,z:-3}])assert.throws(()=>buildFamilyFlight('drive',good.context,landing),/landing/);
});
test('shot lab plays every family without scoring and supports replay, pause and rejection',()=>{
 const lab=new ShotLab();for(const type of LAB_TYPES){lab.select(type,'typical');lab.play();lab.update(.1);lab.state.paused=true;const frozen=structuredClone(lab.state);lab.update(1);assert.deepEqual(lab.state,frozen);lab.state.paused=false;lab.update(20);assert.equal(lab.state.phase,'complete');assert.equal(lab.state.bounces,1);assert.deepEqual(lab.state.score,{home:0,away:0});assert.equal(lab.state.result,null);lab.play();assert.equal(lab.state.phase,'flight')}
 lab.select('overhead','low');const before=structuredClone(lab.state);assert.throws(()=>lab.play(),/higher/);assert.deepEqual(lab.state,before);
});
