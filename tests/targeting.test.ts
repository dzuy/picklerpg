import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveTarget,type TargetContext} from '../src/engine/targeting';
import {Simulation,COURT,type ShotTarget} from '../src/simulation';
import {ShotLab} from '../src/shot-lab';
function context():TargetContext{const players=new Simulation().state.players;players[2].position={x:-1.4,y:0,z:-2.7};players[3].position={x:1.4,y:0,z:-2.7};return {actor:'you',contact:{x:1.1,y:.8,z:5},players,shotType:'drive'}}
const zone=(name:'middle'|'crosscourt'|'line'|'wide'|'open-court',depth:'deep'|'kitchen'|'transition'='deep'):ShotTarget=>({kind:'zone',zone:name,depth});
test('zones distinguish seam, same-side line, crosscourt, width and depth',()=>{
 const c=context();assert.equal(resolveTarget(zone('middle'),c).point.x,0);assert.equal(resolveTarget(zone('line'),c).point.x,1.1);assert.ok(resolveTarget(zone('crosscourt'),c).point.x<0);assert.ok(resolveTarget(zone('wide'),c).point.x<resolveTarget(zone('crosscourt'),c).point.x);
 assert.equal(resolveTarget(zone('line','kitchen'),c).point.z,-1.25);assert.equal(resolveTarget(zone('line','transition'),c).point.z,-3.5);
 c.players[2].position.x=-2.4;c.players[3].position.x=-1.1;assert.equal(resolveTarget(zone('middle'),c).point.x,-1.75);
});
test('open court tracks both defenders and picks the opposite gap deterministically',()=>{
 const c=context();c.players[2].position.x=1.1;c.players[3].position.x=2.4;
 const left=resolveTarget(zone('open-court'),c);assert.ok(left.point.x<0);assert.deepEqual(resolveTarget(zone('open-court'),c),left);
 c.players[2].position.x=-2.4;c.players[3].position.x=-1.1;assert.ok(resolveTarget(zone('open-court'),c).point.x>0);
});
test('player aims distinguish body height and feet landing and follow movement',()=>{
 const c=context(),body:ShotTarget={kind:'player',playerId:'opponent-right',aim:'body'},feet:ShotTarget={...body,aim:'feet'};
 const b=resolveTarget(body,c),f=resolveTarget(feet,c);assert.equal(b.kind,'intercept');assert.equal(b.point.y,1.05);assert.equal(f.kind,'landing');assert.equal(f.point.y,.037);assert.ok(f.point.z>c.players[3].position.z);
 c.players[3].position.x=.3;assert.equal(resolveTarget(body,c).point.x,.3);
});
test('backhand respects handedness and facing rather than fixed screen-left',()=>{
 const c=context(),target:ShotTarget={kind:'player',playerId:'opponent-right',aim:'backhand-side'},p=c.players[3];
 assert.ok(resolveTarget(target,c).point.x>p.position.x);p.handedness='left';assert.ok(resolveTarget(target,c).point.x<p.position.x);
 p.facing=0;assert.ok(resolveTarget(target,c).point.x>p.position.x);p.facing=Math.PI/2;assert.ok(resolveTarget(target,c).point.z<p.position.z);
});
test('targets work from either court end, stay inset and never mutate input',()=>{
 const c=context(),before=structuredClone(c);for(const name of ['middle','crosscourt','line','wide','open-court'] as const){const p=resolveTarget(zone(name),c).point;assert.ok(Math.abs(p.x)<COURT.width/2);assert.ok(p.z<0&&p.z>-COURT.length/2)}assert.deepEqual(c,before);
 c.actor='opponent-right';c.contact={x:-1,y:.8,z:-5};assert.ok(resolveTarget(zone('crosscourt'),c).point.x>0);assert.ok(resolveTarget(zone('crosscourt'),c).point.z>0);
});
test('invalid serve, teammate, same-side player and nonfinite geometry are rejected',()=>{
 const c=context();assert.throws(()=>resolveTarget({kind:'player',playerId:'partner',aim:'body'},c),/opponent/);
 c.shotType='serve';assert.throws(()=>resolveTarget(zone('line'),c),/diagonally/);assert.throws(()=>resolveTarget(zone('crosscourt','kitchen'),c),/kitchen/);assert.throws(()=>resolveTarget({kind:'player',playerId:'opponent-right',aim:'feet'},c),/service-box/);assert.ok(resolveTarget(zone('crosscourt'),c).point.z<-COURT.kitchen);
 c.shotType='drive';c.players[3].position.z=2;assert.throws(()=>resolveTarget({kind:'player',playerId:'opponent-right',aim:'feet'},c),/across/);c.contact.x=NaN;assert.throws(()=>resolveTarget(zone('middle'),c),/Contact/);
});
test('lab routes target intent to actual endpoints; body ends without a bounce',()=>{
 const lab=new ShotLab();lab.target={kind:'player',playerId:'opponent-right',aim:'body'};lab.reset();assert.equal(lab.issue,null);assert.equal(lab.shot.legs[0].to.y,1.05);lab.play();lab.update(20);assert.equal(lab.state.bounces,0);assert.equal(lab.state.ball.position.y,1.05);assert.deepEqual(lab.state.score,{home:0,away:0});
 lab.target=zone('open-court');lab.opponentLayout='right';lab.reset();const x=lab.shot.aimPoint.x;lab.opponentLayout='left';lab.reset();assert.ok(x<0&&lab.shot.aimPoint.x>0);
 lab.target={kind:'player',playerId:'opponent-left',aim:'feet'};lab.select('serve','typical');assert.match(lab.issue!,/service-box/);assert.throws(()=>lab.play());
});
