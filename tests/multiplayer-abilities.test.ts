import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {SLOTS,parseCheckpoint} from '../src/engine/checkpoint';
import {receptionTiming} from '../src/engine/reception-timing';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,MemoryRepository} from './helpers/remote';
import type {PlayerId,ShotIntent} from '../src/engine/model';
import type {ShotContext} from '../src/engine/shot-families';
function roster(){
 const r=Object.fromEntries(SLOTS.map(id=>[id,newPlayer(id)])) as Record<PlayerId,ReturnType<typeof newPlayer>>;
 r.you.skills.serve=95;r.you.skills.movement=20;r.partner.handedness='left';r.partner.skills.drop=90;
 r['opponent-left'].skills.movement=95;r['opponent-right'].skills.hands=30;return r;
}
test('solo and multiplayer share character attributes and deterministic shot physics',()=>{
 const r=roster(),solo=new Match(),multi=new Match();
 for(const id of SLOTS)solo.substitutePlayer(id,r[id]);solo.reset();multi.startLocalHumanMatch(r);
 assert.deepEqual(multi.state.players,solo.state.players);
 for(const type of ['drop','dink','drive'] as const)for(let seed=0;seed<25;seed++){
  const context:ShotContext={contact:{x:1,y:.65,z:-2.6},feet:{x:1,y:0,z:-2.8},bounced:true,opening:'rally',twoBounceSatisfied:true,incomingSpeed:7};
  const intent:ShotIntent={schemaVersion:1,actor:'opponent-left',type,target:{kind:'point',x:-1,z:1.25},pace:type==='drive'?'fast':'soft',shape:'arc',intendedNetClearance:.25,tacticalIntent:'sustain',aggression:.5,source:'menu'};
  solo.seed=multi.seed=seed;
  assert.deepEqual(multi['plan'](intent,'Parity',context,multi.state.players,4),solo['plan'](intent,'Parity',context,solo.state.players,4));
 }
 const slow=multi.state.players.find(p=>p.id==='you')!,fast=multi.state.players.find(p=>p.id==='opponent-left')!;
 slow.skills.hands=fast.skills.hands=80;
 assert.equal(receptionTiming(slow,4,1.1,7,true).reachable,false);
 assert.equal(receptionTiming(fast,4,1.1,7,true).reachable,true);
});
test('server exposes selected abilities to both viewers and preserves them on reload',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),r=roster();
 const state=await service.create(A,{...creation(),roster:r});
 for(const view of [state,await service.get(state.id,B)])for(const p of view.display.players){assert.deepEqual(p.skills,r[p.id].skills);assert.equal(p.handedness,r[p.id].handedness);}
});
test('legacy games retain their committed rally and adopt selected abilities on the next point',()=>{
 const r=roster(),m=new Match();m.startLocalHumanMatch(r);const c=m.exportCheckpoint();
 for(const id of SLOTS){const a=c.roster[id],p=c.rally.state.players.find(p=>p.id===id)!;
  for(const key of Object.keys(a.skills) as (keyof typeof a.skills)[])a.skills[key]=p.skills[key]=70;
  a.handedness=p.handedness='right';a.tendencies=p.tendencies={aggression:.5,middlePreference:.5,kitchenApproach:.6};
 }
 const restored=Match.fromCheckpoint(parseCheckpoint(c));assert.equal(restored.state.players[0].skills.movement,70);
 // The next-rally initialization is also used after committed remote point advancement.
 restored['startPoint']();
 for(const p of restored.state.players){assert.deepEqual(p.skills,r[p.id].skills);assert.equal(p.handedness,r[p.id].handedness);}
 const saved=restored.exportCheckpoint();assert.deepEqual(Match.fromCheckpoint(saved).exportCheckpoint(),saved);
});
