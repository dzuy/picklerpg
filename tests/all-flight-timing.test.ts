import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {generateTrajectory} from '../src/engine/trajectory';
import {SHOT_TYPES,preparedContact} from './helpers/prepared-shot';
import type {ShotIntent,ShotType} from '../src/engine/model';
const players=new Match().state.players;
function shot(type:ShotType){
 const soft=['drop','dink','reset','block'].includes(type);
 const intent:ShotIntent={schemaVersion:1,actor:'you',type,target:{kind:'zone',zone:type==='serve'?'crosscourt':'middle',depth:soft?'kitchen':'deep'},pace:soft?'soft':['drive','counter','overhead','flick'].includes(type)?'fast':'medium',shape:type==='overhead'?'descending':soft||['serve','return','lob'].includes(type)?'arc':'flat',intendedNetClearance:type==='lob'?2.5:soft?.25:.12,tacticalIntent:soft?'neutralize':'pressure',aggression:.5,source:'menu'};
 return {intent,context:preparedContact(type).context};
}
test('every normal shot family has bounded flight time while high lobs keep their hang time',()=>{
 const limits:Record<ShotType,number>={serve:1.5,return:1.5,drive:.7,drop:1.3,dink:1.1,reset:1.3,block:1,volley:.85,counter:.5,flick:.6,overhead:.5,lob:2.5};
 for(const type of SHOT_TYPES){const {intent,context}=shot(type),g=generateTrajectory(intent,context,players);
  assert.ok(g.leg.duration<=limits[type],`${type} should not float: ${g.leg.duration}s`);
  assert.ok(g.leg.duration>=.22);
  if(type==='lob'){assert.ok(g.apex>5);assert.ok(g.leg.duration>1.8,'high lobs must not play like drives');}
 }
});
test('short counters stay crisp and resets stay soft without floating for seconds',()=>{
 const counter=shot('counter'),reset=shot('reset');
 const near=generateTrajectory({...counter.intent,target:{kind:'point',x:1.1,z:-1.25}},counter.context,players);
 const deep=generateTrajectory(counter.intent,counter.context,players);
 const soft=generateTrajectory(reset.intent,reset.context,players);
 assert.ok(near.leg.duration<.27);assert.ok(deep.leg.duration>near.leg.duration);
 assert.ok(soft.leg.duration>deep.leg.duration);assert.ok(soft.leg.duration<1.3);
});
