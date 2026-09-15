import {PreparedShotFixture} from './helpers/prepared-shot';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {isSpeedUp} from '../src/engine/speed-up';
import {COURT} from '../src/engine/model';
import type {ShotContext} from '../src/engine/shot-families';
import {choiceCopy} from '../src/shot-choice';
const players=new PreparedShotFixture().state.players;
const base:ShotContext={contact:{x:0,y:.9,z:2.6},feet:{x:0,y:0,z:2.6},bounced:true,opening:'rally',twoBounceSatisfied:true,incomingSpeed:3};
test('attackable dinks offer a faster topspin choice before and after bounce',()=>{
 for(const bounced of [true,false]){
  const options=buildDecisionMenu('you',{...base,bounced},players),attack=options.find(o=>isSpeedUp(o.intent));
  assert.ok(attack);assert.equal(attack.intent.type,bounced?'drive':'flick');assert.equal(choiceCopy(attack.intent).name,'Speed Up');
  assert.ok(options.some(o=>['dink','reset','volley'].includes(o.intent.type)));
 }
});
test('speed up is absent for low balls, deep contacts, incoming attacks and illegal kitchen volleys',()=>{
 for(const c of [{...base,contact:{...base.contact,y:.3}},{...base,contact:{...base.contact,z:6}},{...base,incomingSpeed:12},{...base,twoBounceSatisfied:false},{...base,bounced:false,feet:{...base.feet,z:COURT.kitchen-.1}}])assert.ok(!buildDecisionMenu('you',c,players).some(o=>isSpeedUp(o.intent)));
});
