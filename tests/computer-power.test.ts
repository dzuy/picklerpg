import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {computerPower} from '../src/engine/computer-power';
import {isFireballShot} from '../src/ball-fire';
import type {ShotContext} from '../src/engine/shot-families';

test('computer power varies reproducibly with attack opportunities and pressure',()=>{
 const match=new Match(),player=match.state.players[0];
 const intent={...match.availableIntents[0],type:'drive' as const,pace:'fast' as const};
 const context:ShotContext={contact:{x:0,y:1.2,z:3},feet:{x:0,y:0,z:3},incomingSpeed:8,bounced:true,opening:'rally',twoBounceSatisfied:true};
 let fireballs=0;
 for(let seed=0;seed<500;seed++){
  const power=computerPower(intent,context,player,seed);
  assert.equal(power,computerPower(intent,context,player,seed));
  assert.ok(power>=0&&power<=1);
  if(isFireballShot({phase:'flight'},{intent:{...intent,power}}))fireballs++;
  assert.ok(computerPower(intent,{...context,timingPressure:.8},player,seed)<.9);
  assert.ok(computerPower({...intent,type:'reset',pace:'soft'},context,player,seed)<.5);
 }
 assert.ok(fireballs>0&&fireballs<250,`occasional fireballs: ${fireballs}`);
});

test('automatic lineups carry power into executed shots while human menus stay neutral',()=>{
 const match=new Match();
 assert.ok(match.availableIntents.every(intent=>intent.power===undefined));
 match.playerAutonomy=true;match.partnerAutonomy=true;match.reset();
 assert.ok(match.availableIntents.every(intent=>typeof intent.power==='number'));
 const before=structuredClone(match.availableIntents);
 match.update(.01);
 assert.equal(match.state.phase,'flight');
 assert.ok(before.some(intent=>intent.power===match.shot.intent.power));
 assert.notEqual(match.shot.intent.power,undefined);
});

test('pressure reduces soft-shot effort and reaching prevents full-power attacks',()=>{
 const m=new Match(),p=m.state.players[0],base={...m.availableIntents[0],type:'drive' as const,pace:'fast' as const};
 const c:ShotContext={contact:{x:0,y:1.2,z:3},feet:{x:0,y:0,z:3},incomingSpeed:6,bounced:false,opening:'rally',twoBounceSatisfied:true};
 for(let seed=0;seed<200;seed++){
  const reset={...base,type:'reset' as const,pace:'soft' as const};
  assert.ok(computerPower(reset,{...c,incomingSpeed:30,timingPressure:.9},p,seed)<computerPower(reset,c,p,seed));
  assert.ok(computerPower(base,{...c,feet:{x:1.5,y:0,z:3}},p,seed)<.8);
 }
});
