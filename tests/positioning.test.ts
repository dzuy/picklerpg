import {receptionTiming} from '../src/engine/reception-timing';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPositions,hitterRecoveryDelay,playerMovementProgress,type PositioningContext} from '../src/engine/positioning';
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

test('wide stretched hitters recover later at low skill; slower replies buy recovery time',()=>{
 const c=setup();c.intent={...c.intent,type:'dink'};c.completedShots=5;c.receiver=null;
 const hitter=c.players.find(p=>p.id===c.intent.actor)!;hitter.position={x:3.7,y:0,z:2.8};
 const contact={x:4.4,y:.4,z:2.2};
 hitter.skills.movement=30;const lowDelay=hitterRecoveryDelay(hitter,contact,.6);
 const low=planPositions({...c,duration:.5,recoveryDelay:lowDelay});
 assert.deepEqual(low.you,hitter.position,'weak mover is still recovering during quick reply');
 const slow=planPositions({...c,duration:1.5,recoveryDelay:lowDelay});
 assert.ok(slow.you.x<low.you.x,'slower shot buys time to recover');
 hitter.skills.movement=95;const highDelay=hitterRecoveryDelay(hitter,contact,.6);
 assert.ok(highDelay<lowDelay);
 const high=planPositions({...c,duration:.5,recoveryDelay:highDelay});assert.ok(high.you.x<low.you.x);
 assert.deepEqual(high.partner,low.partner,'delay only affects the hitter');
 const comfortable={...hitter,position:{x:1,y:0,z:2.8}};
 assert.ok(hitterRecoveryDelay(comfortable,{x:1.2,y:1,z:2.5})<highDelay);
});

test('equal-skilled teammates approach at different repeatable speeds',()=>{
 const c=setup();c.intent={...c.intent,type:'dink'};c.completedShots=6;c.receiver=null;c.duration=.25;
 for(const p of c.players){p.skills.movement=70;p.position={x:p.position.x,y:0,z:p.team==='home'?6:-6};}
 const positions=planPositions(c),distance=(id:'you'|'partner')=>{const from=c.players.find(p=>p.id===id)!.position,to=positions[id];return Math.hypot(to.x-from.x,to.z-from.z)};
 assert.ok(Math.abs(distance('you')-distance('partner'))>.005);
 assert.deepEqual(planPositions(c),positions);
 assert.notDeepEqual(planPositions({...c,completedShots:7}),positions);
});

test('kitchen stagger changes short-ball reach and gives the deeper player more rear coverage',()=>{
 const c=setup();c.intent={...c.intent,type:'dink'};c.completedShots=6;c.receiver=null;c.duration=4;
 for(const p of c.players){p.skills.movement=70;p.skills.hands=70;p.tendencies.kitchenApproach=.5;}
 const positions=planPositions(c),home=c.players.filter(p=>p.team==='home').map(p=>({...p,position:positions[p.id]})).sort((a,b)=>a.position.z-b.position.z);
 const [front,back]=home;
 assert.ok(front.position.z>COURT.kitchen);assert.ok(back.position.z-front.position.z>.5);
 const short=COURT.kitchen+.08;
 assert.equal(receptionTiming(front,front.position.z-short,.3,12,false).reachable,true);
 assert.equal(receptionTiming(back,back.position.z-short,.3,12,false).reachable,false);
 assert.equal(receptionTiming(front,4-front.position.z,.4,12,false).reachable,false);
 assert.equal(receptionTiming(back,4-back.position.z,.4,12,false).reachable,true);
});

test('individual movement rhythms preserve endpoints, recovery holds and monotonic travel',()=>{
 const ids=['you','partner','opponent-left','opponent-right'] as const;
 assert.equal(new Set(ids.map(id=>playerMovementProgress(id,.5,1))).size,4);
 for(const id of ids){
  assert.equal(playerMovementProgress(id,0,1),0);assert.equal(playerMovementProgress(id,1,1),1);
  assert.equal(playerMovementProgress(id,.2,1,.3),0);
  let previous=0;for(let i=0;i<=100;i++){const value=playerMovementProgress(id,i/100,1,.3);assert.ok(value>=previous&&value<=1);previous=value;}
 }
});
