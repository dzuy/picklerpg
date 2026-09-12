import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,RALLY,SKILLS} from '../src/simulation';
import {sampleVelocity} from '../src/engine/rally-engine';
import {pressureMiddle} from '../src/scenarios/pressure-middle';
import type {PlayerState,Vec3} from '../src/engine/model';
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const closeVector=(actual:Vec3,expected:Vec3)=>{for(const key of ['x','y','z'] as const)close(actual[key],expected[key])};
function complete(sim:Simulation){for(let i=0;i<10&&sim.state.phase!=='complete';i++){if(sim.state.phase==='decision')sim.submitIntent(sim.availableIntents[0]);sim.update(100)}}

test('snapshot is versioned, JSON serializable, complete and detached',()=>{
 const sim=new Simulation(pressureMiddle);const snapshot=sim.snapshot();
 assert.equal(snapshot.schemaVersion,2);assert.deepEqual(JSON.parse(JSON.stringify(snapshot)),snapshot);
 assert.equal(snapshot.currentHitter,'you');assert.equal(snapshot.possession,'home');assert.equal(snapshot.simulationTime,0);
 assert.deepEqual(snapshot.ball.velocity,{x:0,y:0,z:0});
 for(const player of snapshot.players){assert.equal(Object.keys(player.skills).length,SKILLS.length);assert.ok(Number.isFinite(player.facing));assert.equal(player.tendencies.aggression,.5)}
 snapshot.players[0].skills.drive=1;snapshot.players[0].tendencies.aggression=1;snapshot.ball.position.x=999;snapshot.rallyHistory.length=0;
 assert.equal(sim.state.players[0].skills.drive,70);assert.equal(sim.state.players[0].tendencies.aggression,.5);assert.notEqual(sim.state.ball.position.x,999);assert.equal(sim.state.rallyHistory.length,2);
});

test('velocity matches change in position and flips vertically at a bounce',()=>{
 const sim=new Simulation(pressureMiddle);sim.submitIntent(sim.availableIntents[0]);sim.update(.4);
 const before={...sim.state.ball.position};const velocity={...sim.state.ball.velocity};sim.update(.00001);
 for(const key of ['x','y','z'] as const)assert.ok(Math.abs((sim.state.ball.position[key]-before[key])/.00001-velocity[key])<.001);
 sim.reset();sim.submitIntent(sim.availableIntents[0]);const first=RALLY[0].legs[0];assert.ok(sampleVelocity(first,1).y<0);sim.update(first.duration);
 assert.equal(sim.state.bounces,1);assert.ok(sim.state.ball.velocity.y>0);closeVector(sim.state.ball.velocity,sampleVelocity(RALLY[0].legs[1],0));
});

test('decision pause retains incoming velocity and freezes simulation time and events',()=>{
 const sim=new Simulation(pressureMiddle);sim.submitIntent(sim.availableIntents[0]);sim.update(100);
 assert.equal(sim.state.phase,'decision');closeVector(sim.state.ball.velocity,sampleVelocity(RALLY[1].legs.at(-1)!,1));
 const contact=sim.state.rallyHistory.at(-1)!;assert.equal(contact.type,'contact');if(contact.type==='contact')closeVector(contact.incomingVelocity,sim.state.ball.velocity);
 const frozen=sim.snapshot();sim.update(50);assert.deepEqual(sim.snapshot(),frozen);
 sim.submitIntent(sim.availableIntents[0]);sim.update(.2);sim.state.paused=true;const paused=sim.snapshot();sim.update(50);assert.deepEqual(sim.snapshot(),paused);
});

test('rally events are ordered, shot-correlated, time-based and finalized once',()=>{
 const sim=new Simulation(pressureMiddle);complete(sim);const {rallyHistory,shotHistory}=sim.state;
 assert.deepEqual(rallyHistory.map(e=>e.type),['rally-start','contact','shot','bounce','contact','shot','bounce','contact','shot','contact','shot','contact','shot','bounce','point-end']);
 assert.deepEqual(rallyHistory.filter(e=>e.type==='shot').map(e=>e.intent),shotHistory);
 assert.deepEqual(rallyHistory.filter(e=>e.type==='contact').map(e=>e.hitter),['you','opponent-left','you','opponent-right','you']);
 assert.deepEqual(rallyHistory.filter(e=>e.type==='shot').map(e=>e.shotIndex),[0,1,2,3,4]);
 assert.ok(rallyHistory.every((event,i)=>i===0||event.time>=rallyHistory[i-1].time));
 close(sim.state.simulationTime,RALLY.flatMap(s=>s.legs).reduce((sum,l)=>sum+l.duration,0));
 assert.equal(sim.state.currentHitter,null);assert.equal(sim.state.possession,null);assert.deepEqual(sim.state.ball.velocity,{x:0,y:0,z:0});
 assert.deepEqual(JSON.parse(JSON.stringify(sim.snapshot())),sim.snapshot());const ended=sim.snapshot();sim.update(100);assert.deepEqual(sim.snapshot(),ended);
 sim.reset();assert.equal(sim.state.simulationTime,0);assert.equal(sim.state.shotHistory.length,0);assert.deepEqual(sim.state.rallyHistory.map(e=>e.type),['rally-start','contact']);
});

test('profile data and left handedness survive play and reset without cross-player leakage',()=>{
 const provider={...pressureMiddle,setup(){const setup=pressureMiddle.setup();setup.players[0].handedness='left';setup.players[0].facing=.15;setup.players[0].skills.drop=92;setup.players[1].skills.drop=62;setup.players[2].tendencies.aggression=.9;return setup}};
 const sim=new Simulation(provider);complete(sim);sim.reset();assert.equal(sim.state.players[0].handedness,'left');assert.equal(sim.state.players[0].facing,.15);assert.equal(sim.state.players[0].skills.drop,92);assert.equal(sim.state.players[1].skills.drop,62);assert.equal(sim.state.players[2].tendencies.aggression,.9);
});

test('invalid profile values are rejected before replacing a valid game state',()=>{
 let mutate:(player:PlayerState)=>void=()=>{};
 const sim=new Simulation({...pressureMiddle,setup(){const setup=pressureMiddle.setup();mutate(setup.players[0]);return setup}});
 const before=sim.snapshot();
 for(const change of [(p:PlayerState)=>p.skills.drive=101,(p:PlayerState)=>p.skills.drop=NaN,(p:PlayerState)=>p.tendencies.aggression=-.1,(p:PlayerState)=>p.facing=Infinity]){mutate=change;assert.throws(()=>sim.reset(),/valid players/);assert.deepEqual(sim.snapshot(),before)}
});
