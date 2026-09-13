import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPositions,type PositioningContext} from '../src/engine/positioning';
import {COURT} from '../src/engine/model';
import {RallyEngine} from '../src/engine/rally-engine';
import {pressureMiddle} from './helpers/pressure-middle';
function setup():PositioningContext{const sim=new RallyEngine(pressureMiddle);return {players:sim.snapshot().players,intent:sim.availableIntents[0],endpoint:{x:-2,y:.75,z:-6},receiver:'opponent-left',completedShots:0,duration:1}}
test('serve holds serving team deep and receiver prepares at the ball',()=>{
 const c=setup(),before=structuredClone(c),p=planPositions(c);
 assert.ok(p.you.z>=COURT.length/2);assert.ok(p.partner.z>=COURT.length/2);
 assert.equal(p['opponent-left'].z,c.endpoint.z-.35);assert.equal(p['opponent-left'].x,c.endpoint.x+.4);
 assert.deepEqual(c,before);
});
test('coverage shifts with endpoint and drive advances team',()=>{
 const c=setup();c.intent={...c.intent,type:'drive'};c.completedShots=2;c.receiver=null;c.duration=4;
 const left=planPositions(c),right=planPositions({...c,endpoint:{...c.endpoint,x:2}});
 assert.ok(left.you.x<right.you.x);assert.ok(left.partner.x<right.partner.x);assert.ok(left.you.z<c.players[0].position.z);
 assert.ok(left.you.x!==left.partner.x);assert.ok(left.you.z>COURT.kitchen);
});
test('recovery distance uses movement skill and flight time',()=>{
 const c=setup();c.intent.type='drive';c.completedShots=2;c.receiver=null;c.duration=.1;
 c.players[0].skills.movement=0;const low=planPositions(c).you;c.players[0].skills.movement=100;const high=planPositions(c).you;
 const distance=(p:typeof low)=>Math.hypot(p.x-c.players[0].position.x,p.z-c.players[0].position.z);
 assert.ok(distance(high)>distance(low));assert.ok(distance(high)<=.38+1e-9);
});
test('volley receiver stays behind kitchen on either side',()=>{
 const c=setup();c.endpoint={x:1,y:1.3,z:-2};const away=planPositions(c);assert.ok(away['opponent-left'].z<=-COURT.kitchen-.2);
 c.intent.actor='opponent-left';c.receiver='you';c.endpoint.z=2;assert.ok(planPositions(c).you.z>=COURT.kitchen+.2);
 assert.throws(()=>planPositions({...c,receiver:'opponent-right'}));
});
