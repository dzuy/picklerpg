import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseShotIntent,sameShotIntent,SHOT_INTENT_SCHEMA} from '../src/engine/shot-intent';
import {Simulation,RALLY,INPUT_SOURCES,TARGET_ZONES,PLAYER_AIMS} from '../src/simulation';
import {pressureMiddle} from '../src/scenarios/pressure-middle';
import type {ShotIntent} from '../src/engine/model';
const serve=()=>structuredClone(RALLY[0].intent);

test('all authored shots conform and serialize without execution coordinates',()=>{
 for(const shot of RALLY){const parsed=parseShotIntent(JSON.parse(JSON.stringify(shot.intent)));assert.deepEqual(parsed,shot.intent);assert.equal('x' in parsed.target,false);assert.equal('aimPoint' in parsed,false)}
 assert.equal(SHOT_INTENT_SCHEMA.additionalProperties,false);assert.equal(SHOT_INTENT_SCHEMA.properties.schemaVersion.const,1);
});

test('zone and opponent targets normalize independently from pace and aggression',()=>{
 for(const zone of TARGET_ZONES)assert.deepEqual(parseShotIntent({...serve(),target:{kind:'zone',zone,depth:'deep'}}).target,{kind:'zone',zone,depth:'deep'});
 for(const aim of PLAYER_AIMS)assert.deepEqual(parseShotIntent({...serve(),target:{kind:'player',playerId:'opponent-right',aim}}).target,{kind:'player',playerId:'opponent-right',aim});
 const softAttack=parseShotIntent({...serve(),pace:'soft',aggression:1});assert.equal(softAttack.aggression,1);assert.equal(softAttack.pace,'soft');
 assert.equal(parseShotIntent({...serve(),aggression:0}).aggression,0);
});

test('all input sources produce identical execution and retain their provenance',()=>{
 let firstBall:unknown;
 for(const source of INPUT_SOURCES){const sim=new Simulation();sim.submitIntent({...serve(),source});sim.update(.4);assert.equal(sim.state.shotHistory[0].source,source);if(!firstBall)firstBall=sim.state.ball;else assert.deepEqual(sim.state.ball,firstBall)}
 const reordered={...serve(),target:{depth:'deep',zone:'crosscourt',kind:'zone'},source:'voice'};
 assert.ok(sameShotIntent(parseShotIntent(reordered),serve()));
});

test('malformed payloads fail without altering game state',()=>{
 const sim=new Simulation(),before=sim.snapshot();
 const invalid:unknown[]=[null,[],JSON.stringify(serve()),{}, {...serve(),schemaVersion:2},{...serve(),aggression:NaN},{...serve(),aggression:1.01},{...serve(),aggression:-.1},{...serve(),aggression:'0.5'}, {...serve(),pace:'turbo'}, {...serve(),shape:'teleport'},{...serve(),type:'smash'},{...serve(),actor:'stranger'},{...serve(),source:'unknown'}, {...serve(),intendedNetClearance:Infinity},{...serve(),intendedNetClearance:-1},{...serve(),tacticalIntent:'win somehow'}, {...serve(),target:{x:0,y:0,z:-4}},{...serve(),target:{kind:'zone',zone:'middle'}},{...serve(),target:{kind:'zone',zone:'middle',depth:'deep',playerId:'opponent-left'}},{...serve(),target:{kind:'player',playerId:'ghost',aim:'feet'}},{...serve(),target:{kind:'player',playerId:'opponent-right',aim:'head'}},{...serve(),execution:{winner:true}}];
 for(const input of invalid){assert.throws(()=>sim.submitIntent(input));assert.deepEqual(sim.snapshot(),before)}
});

test('well-formed but unavailable choices do not bypass the contextual gate',()=>{
 const sim=new Simulation(),before=sim.snapshot();
 for(const input of [{...serve(),aggression:.99},{...serve(),tacticalIntent:'finish'},{...serve(),target:{kind:'player',playerId:'opponent-right',aim:'feet'}},{...serve(),type:'overhead'}]){
  assert.doesNotThrow(()=>parseShotIntent(input));assert.throws(()=>sim.submitIntent(input),/available/);assert.deepEqual(sim.snapshot(),before);
 }
});

test('offered player-target intents run, but own-team targets are rejected before reset',()=>{
 let target:ShotIntent['target']={kind:'player',playerId:'opponent-right',aim:'feet'};
 const provider={...pressureMiddle,setup(){const setup=pressureMiddle.setup();setup.contact.options[0].intent.target=target;return setup}};
 const sim=new Simulation(provider);sim.submitIntent(sim.availableIntents[0]);assert.deepEqual(sim.state.shotHistory[0].target,target);
 const before=sim.snapshot();for(const playerId of ['you','partner'] as const){target={kind:'player',playerId,aim:'body'};assert.throws(()=>sim.reset(),/opponent/);assert.deepEqual(sim.snapshot(),before)}
});

test('provider intents receive the same structural validation as user input',()=>{
 const setup=pressureMiddle.setup();setup.contact.options[0].intent.aggression=Infinity;
 assert.throws(()=>new Simulation({...pressureMiddle,setup:()=>setup}),/aggression/);
 const original=serve(),parsed=parseShotIntent(original);parsed.target={kind:'player',playerId:'opponent-left',aim:'body'};assert.notDeepEqual(parsed.target,original.target);
});
