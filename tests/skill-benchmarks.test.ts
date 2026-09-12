import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ShotLab,labSetup} from '../src/shot-lab';
import {executeShot} from '../src/engine/execution';
import {SKILLS,type ShotType} from '../src/engine/model';
import {skillBenchmark} from '../src/engine/skill-benchmarks';
function sample(type:ShotType,skill:number){const lab=new ShotLab();lab.select(type,'typical');for(const k of SKILLS)lab.state.players[0].skills[k]=skill;const c=labSetup(type).context;c.incomingSpeed=type==='serve'?0:5;let net=0,deep=0,error=0;for(let seed=0;seed<2000;seed++){const e=executeShot(lab.shot.intent,c,lab.state.players,{seed,balance:1});if(e.outcome==='net')net++;if(e.outcome==='in'&&Math.abs(e.actualEndpoint.z)>=4.8)deep++;error+=e.endpointError}return {net:net/2000,deep:deep/2000,error:error/2000}}
test('5.0 benchmark serves deep more reliably than 3.0 and keeps routine shots out of net',()=>{const novice=sample('serve',40),advanced=sample('serve',90);assert.ok(advanced.deep>novice.deep+.08);for(const type of ['serve','drive','drop','dink'] as ShotType[]){const low=sample(type,40),high=sample(type,90);assert.ok(high.net<.03,`${type}: ${high.net}`);assert.ok(high.error<low.error*.5)}});
test('benchmarks interpolate smoothly and higher skill reduces each error source',()=>{const a=skillBenchmark(40),b=skillBenchmark(90);assert.ok(b.spread<a.spread);assert.ok(b.lift<a.lift);assert.ok(b.mishit<a.mishit);assert.ok(b.pressure<a.pressure);assert.equal(skillBenchmark(70).level,4);assert.throws(()=>skillBenchmark(NaN))});
