import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {tacticalPlacement} from '../src/engine/tactical-placement';

test('equivalent destinations score equally regardless of the open-court label',()=>{
 const m=new Match(),s=m.snapshot();s.ball.position={x:0,y:1,z:3};
 const base={...m.availableIntents[0],type:'drive' as const};
 const middle={...base,target:{kind:'zone' as const,zone:'middle' as const,depth:'deep' as const}};
 const point={...base,target:{kind:'point' as const,x:0,z:-5.6}};
 s.players.filter(p=>p.team==='away').forEach((p,i)=>p.position={x:i?1.4:-1.4,y:0,z:-5});
 assert.equal(tacticalPlacement(s,middle),tacticalPlacement(s,point));
});

test('placement rewards actual openings and a vulnerable defender, on both sides',()=>{
 for(const actor of ['you','opponent-left'] as const){
  const m=new Match(),s=m.snapshot(),hitter=s.players.find(p=>p.id===actor)!;
  const side=hitter.team==='home'?1:-1;s.ball.position={x:0,y:1.2,z:side*2.5};
  const defenders=s.players.filter(p=>p.team!==hitter.team);
  defenders.forEach((p,i)=>{p.position={x:i?1.4:-1.4,y:0,z:-side*2.5};p.skills.hands=p.skills.volley=p.skills.counter=90;});
  const base={...m.availableIntents[0],actor,type:'drive' as const};
  const left={...base,target:{kind:'player' as const,playerId:defenders[0].id,aim:'body' as const}};
  const right={...base,target:{...left.target,playerId:defenders[1].id}};
  assert.equal(tacticalPlacement(s,left),tacticalPlacement(s,right));
  defenders[0].skills.hands=defenders[0].skills.counter=defenders[0].skills.volley=40;
  assert.ok(tacticalPlacement(s,left)>tacticalPlacement(s,right));
  const open={...base,target:{kind:'point' as const,x:0,z:-side*5.6}};
  const clear=tacticalPlacement(s,open);defenders.forEach(p=>p.position.z=-side*5.6);
  assert.ok(tacticalPlacement(s,open)<clear);
 }
});
