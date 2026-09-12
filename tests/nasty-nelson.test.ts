import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {canParseInstantly,parseLocalCommand} from '../src/engine/custom-command';
import {resolveBodyServe} from '../src/engine/serve-body';
import {sampleLeg} from '../src/engine/rally-engine';
test('Nasty Nelson phrase routes locally to a fast body serve',()=>{
 const text='nasty nelson the left side player';assert.ok(canParseInstantly(text));assert.deepEqual(parseLocalCommand(text),{shot:'serve',target:'left',aim:'body',pace:'fast',spin:'none',spinDirection:'none',spinStrength:'medium'});
});
test('body serve executes against specified opponent; mid-rally it is rejected',async()=>{
 const m=new Match();const left=m.state.players.filter(p=>p.team==='away').sort((a,b)=>a.position.x-b.position.x)[0];
 await m.submitCommand('nasty nelson the left side player');assert.equal(m.state.phase,'flight',m.customStatus);assert.deepEqual(m.shot.intent.target,{kind:'player',playerId:left.id,aim:'body'});assert.equal(m.shot.intent.type,'serve');
 const rally=new Match();rally.startPractice('wide');await rally.submitCommand('nasty nelson the left side player');assert.equal(rally.state.phase,'decision');assert.match(rally.customStatus,/serve only/);
});
test('body contact and dodges are deterministic and misses continue the original flight',()=>{
 const p=new Match().state.players.find(p=>p.team==='away')!;
 const leg={from:{x:1,y:.65,z:6},to:{...p.position,y:1.05},duration:1,arc:.6,bounceAtEnd:false};
 const samples=Array.from({length:100},(_,i)=>resolveBodyServe(leg,p,i*104729));
 assert.ok(samples.some(s=>s.hit));assert.ok(samples.some(s=>s.dodge));
 const miss=samples.find(s=>!s.hit)!;assert.equal(miss.leg.bounceAtEnd,true);assert.equal(miss.leg.to.y,.037);
 const at=sampleLeg(miss.leg,leg.duration/miss.leg.duration);assert.ok(Math.hypot(at.x-leg.to.x,at.y-leg.to.y,at.z-leg.to.z)<1e-8);
 assert.deepEqual(resolveBodyServe(leg,p,42),resolveBodyServe(leg,p,42));
});
test('missed same-side body serve faults, while body contact awards serving team',async()=>{
 const results=new Set<string>();
 for(let i=0;i<40;i++){
  const m=new Match();m.seed=i*104729;
  const server=m.state.players.find(p=>p.id===m.state.currentHitter)!;
  const p=m.state.players.find(p=>p.team==='away'&&p.position.x*server.position.x>0)!;
  await m.submitCommand(`nasty nelson ${p.id==='opponent-left'?'jules':'rio'}`);
  assert.equal(m.state.phase,'flight',m.customStatus);
  const r=m.shot.resolution?.result;assert.ok(r);assert.ok(['body-hit','out','net'].includes(r.reason));
  assert.equal(r.winner,r.reason==='body-hit'?'home':'away');results.add(r.reason);
 }
 assert.ok(results.has('body-hit'));assert.ok(results.has('out'));
});
