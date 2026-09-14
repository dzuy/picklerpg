import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {RallyEngine} from '../src/engine/rally-engine';
import {resolveTarget} from '../src/engine/targeting';
import type {ShotContext} from '../src/engine/shot-families';

function contact(m:Match,height=2.8){
 const players=structuredClone(m.state.players);
 players.forEach((p,i)=>{p.position={x:i%2?1.4:-1.4,y:0,z:p.team==='home'?3:-3}});
 const c:ShotContext={contact:{x:1.4,y:height,z:3},feet:players[1].position,bounced:false,opening:'rally',twoBounceSatisfied:true,incomingSpeed:8};
 const options=m['options']('partner',c,players,8);
 m.engine=new RallyEngine({shouldAutoPlay:()=>false,setup:()=>({players,contact:{options}}),next:()=>({kind:'point-end',result:{winner:'home',reason:'net'}})});
 m.state.bounces=2;
 return {players,c};
}

test('autonomous partner varies actual destinations across identical high contacts and points',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const m=new Match();m.partnerAutonomy=true;
 const destinations:number[]=[];
 for(let i=0;i<24;i++){
  if(i%4===0&&i>0){m.point++;m['startPoint']()}
  const {players,c}=contact(m);
  m.update(0);
  assert.equal(m.thinking,false);
  const intent=m.state.shotHistory[0];assert.ok(intent);assert.equal(intent.actor,'partner');assert.equal(intent.type,'overhead');
  destinations.push(resolveTarget(intent.target,{actor:'partner',contact:c.contact,players,shotType:intent.type}).point.x);
 }
 assert.ok(new Set(destinations).size>=3,JSON.stringify(destinations));
 for(let i=0;i<=destinations.length-6;i++)assert.ok(new Set(destinations.slice(i,i+6)).size>1,'no six-shot outside loop');
 assert.equal(m['partnerChoices'].length,8);m.reset();assert.equal(m['partnerChoices'].length,0);
});

test('partner variety honors soft and backhand calls and cancelled decisions',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const m=new Match();m.partnerAutonomy=true;
 m.instructPartner({kind:'soft',target:'jules'});
 for(let i=0;i<8;i++){contact(m,1);m.update(0);t.mock.timers.tick(550);assert.ok(['dink','drop','reset','block'].includes(m.state.shotHistory[0].type))}
 m.instructPartner({kind:'clear'});m.instructPartner({kind:'backhand',target:'jules'});
 for(let i=0;i<8;i++){contact(m);m.update(0);t.mock.timers.tick(550);assert.deepEqual(m.state.shotHistory[0].target,{kind:'player',playerId:'opponent-left',aim:'backhand-side'})}
 contact(m);m.update(0);m.reset();const before=m.snapshot();t.mock.timers.tick(550);assert.deepEqual(m.snapshot(),before);
});

test('every automatic player can finish an overhead at either defender’s feet',()=>{
 const m=new Match(),players=structuredClone(m.state.players);
 players.forEach((p,i)=>{p.position={x:i%2?1.4:-1.4,y:0,z:p.team==='home'?3:-3}});
 for(const player of players){
  const c:ShotContext={contact:{...player.position,y:2.8},feet:player.position,bounced:false,opening:'rally',twoBounceSatisfied:true,incomingSpeed:8};
  const options=m['options'](player.id,c,players,8);
  const feet=options.filter(o=>o.intent.type==='overhead'&&o.intent.target.kind==='player'&&o.intent.target.aim==='feet');
  assert.equal(feet.length,2);
  for(const shot of feet){
   assert.equal(shot.intent.pace,'fast');assert.equal(shot.intent.shape,'descending');
   assert.ok(Math.abs(shot.aimPoint.z)<3,'finish in front of the defender instead of behind them');
   assert.equal(shot.aimPoint.y,.037);
  }
 }
});
