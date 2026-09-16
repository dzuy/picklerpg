import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_RULES} from '../src/engine/scoring';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {SLOTS,parseCheckpoint} from '../src/engine/checkpoint';
import {resolveTurn,type TurnAction} from '../src/engine/turn';
import {viewerPoint,isOpposingTarget} from '../src/engine/controllers';
import type {PlayerId} from '../src/engine/model';
const json=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function create(seed=7,team:'home'|'away'='home'){
 const m=new Match();m.seed=seed;
 const roster=Object.fromEntries(SLOTS.map(id=>[id,newPlayer(id)])) as Record<PlayerId,ReturnType<typeof newPlayer>>;
 roster.you.skills.serve=99;roster.partner.handedness='left';
 m.startLocalHumanMatch(roster,team);return {m,roster};
}
function action(m:Match,i=0):TurnAction{const choices=m.targetingMenu;assert.ok(choices.length,`no options at ${m.state.stage}/${m.state.phase}`);const c=choices[i%choices.length];return {decisionId:m.decisionId,playerId:m.currentPlayer!,intent:c.intent,...(c.timing?{timing:c.timing}:{})};}
test('local humans own all four selected athletes and cannot change the active roster',()=>{
 const {m,roster}=create();assert.equal(roster.you.skills.serve,99);assert.equal(roster.partner.handedness,'left');assert.equal(m.getPlayerDesign('you')!.skills.serve,99);assert.equal(Match.fromCheckpoint(m.exportCheckpoint()).getPlayerDesign('partner')!.handedness,'left');
 for(const p of m.state.players){assert.deepEqual(p.skills,roster[p.id].skills);assert.equal(p.handedness,roster[p.id].handedness);assert.equal(m.controllers[p.id].kind,'human');}
 assert.throws(()=>m.substitutePlayer('you',newPlayer()));assert.throws(()=>m.setPlayerDesign(newPlayer()));assert.throws(()=>m.reset());
 roster.you.name='Changed elsewhere';assert.notEqual(m.getPlayerDesign('you')!.name,roster.you.name);
 assert.deepEqual(json(Match.fromCheckpoint(m.exportCheckpoint()).exportCheckpoint()),json(m.exportCheckpoint()));
});
test('wrong owner, stale decision, wrong athlete and invalid timing leave state intact',()=>{
 const {m}=create(),a=action(m),before=json(m.exportCheckpoint());
 for(const bad of [{...a,playerId:'player-b'},{...a,decisionId:'old'},{...a,intent:{...a.intent,actor:'partner'}},{...a,timing:'air'}]){assert.throws(()=>m.submitTurn(bad as TurnAction));assert.deepEqual(json(m.exportCheckpoint()),before);}
 m.submitTurn(a);assert.throws(()=>m.submitTurn(a));m.settleCommittedPlayback();assert.throws(()=>m.submitTurn(a));
 const restored=Match.fromCheckpoint(json(m.exportCheckpoint()));assert.throws(()=>restored.submitTurn(a));
});
test('pure turn resolution commits once and presentation or reload cannot reroll it',()=>{
 const {m}=create(),a=action(m),before=json(m.exportCheckpoint()),copy=json(before);
 const result=resolveTurn(before,a);assert.deepEqual(before,copy);assert.equal(result.toRevision,result.fromRevision+1);
 m.submitTurn(a);assert.deepEqual(json(m.exportCheckpoint()),json(result.state));m.settleCommittedPlayback();
 assert.deepEqual(json(m.exportCheckpoint()),json(result.state));const restored=Match.fromCheckpoint(result.state);restored.update(100);assert.deepEqual(json(restored.exportCheckpoint()),json(result.state));
});
test('storage failure rolls back a human turn including its identity',()=>{
 const {m}=create(),before=json(m.exportCheckpoint()),id=m.decisionId;
 m.onCheckpoint=()=>{throw new Error('quota')};assert.throws(()=>m.submitTurn(action(m)),/quota/);assert.equal(m.decisionId,id);assert.deepEqual(json(m.exportCheckpoint()),before);
 m.onCheckpoint=()=>{};m.submitTurn(action(m));assert.equal(m.revision,before.revision+1);
});
test('full games from either serving end remain human-controlled through every restored boundary',()=>{
 const actors=new Set<string>(),timings=new Set<string>(),serves=new Set<string>();let sameOwner=false,differentReceivers=false;
 for(const opening of ['home','away'] as const){
  const {m}=create(opening==='home'?7:18,opening);m.scoring.rules={...DEFAULT_RULES};m.scoring.serverNumber=2;
  for(let i=0;i<3000&&!m.scoring.winner;i++){
   if(m.state.phase==='complete'){m.nextPoint();continue;}
   const before=json(m.exportCheckpoint());const r=Match.fromCheckpoint(before);
   m.update(100);assert.deepEqual(json(m.exportCheckpoint()),before,'no human decision can auto-play');
   const a=action(m,i);actors.add(a.intent.actor);if(a.intent.type==='serve')serves.add(a.intent.actor);
   if(a.timing){timings.add(`${m.currentPlayer}:${a.timing}`);const c=m.shot.receptionChoice;if(c?.airborne&&c.bounced&&c.airborne.resolution.receiver!==c.bounced.resolution.receiver)differentReceivers=true;assert.throws(()=>r.submitTurn({...a,timing:undefined}));}
   const priorOwner=m.currentPlayer;
   m.submitTurn(a);r.submitTurn(a);assert.deepEqual(json(m.exportCheckpoint()),json(r.exportCheckpoint()));
   m.settleCommittedPlayback();r.settleCommittedPlayback();assert.deepEqual(json(m.exportCheckpoint()),json(r.exportCheckpoint()));
   if(m.state.phase==='complete'&&!m.scoring.winner){m.nextPoint();if(m.currentPlayer===priorOwner)sameOwner=true;}
  }
  assert.ok(m.scoring.winner,'game must finish');const c=json(m.exportCheckpoint());const end=Match.fromCheckpoint(c);end.update(100);assert.deepEqual(json(end.exportCheckpoint()),c);
 }
 assert.deepEqual([...actors].sort(),[...SLOTS].sort());assert.deepEqual([...serves].sort(),[...SLOTS].sort());
 assert.deepEqual([...timings].sort(),['player-a:air','player-a:bounce','player-b:air','player-b:bounce']);assert.ok(sameOwner);assert.ok(differentReceivers,'branch timing can select a different teammate');
});
test('old solo checkpoints migrate; rotated targeting is reversible for either side',()=>{
 const c:any=json(new Match().exportCheckpoint());c.schemaVersion=1;delete c.mode;delete c.revision;
 const restored=Match.fromCheckpoint(c);assert.equal(restored.mode,'solo');assert.equal(restored.exportCheckpoint().schemaVersion,2);
 const point={x:1.25,z:-4};assert.deepEqual(viewerPoint(viewerPoint(point,'away'),'away'),point);assert.ok(isOpposingTarget(point,'home'));assert.ok(isOpposingTarget(viewerPoint(point,'away'),'away'));
 const bad=json(create().m.exportCheckpoint());bad.roster.you.skills.serve=98;assert.throws(()=>parseCheckpoint(bad));
});
test('a deuce game wins by two and animation completes at the committed boundary',()=>{
 const source=create(22).m.exportCheckpoint();source.rules={...DEFAULT_RULES};source.scoring.serverNumber=2;source.scoring.score={home:10,away:10};source.rally.state.score={home:10,away:10};
 const m=Match.fromCheckpoint(source);
 for(let i=0;i<2000&&!m.scoring.winner;i++){
  if(m.state.phase==='complete'){m.nextPoint();continue}
  const a=action(m,i),history=m.state.shotHistory.length;m.submitTurn(a);const saved=json(m.exportCheckpoint());
  assert.ok(saved.rally.state.shotHistory.length-history<=1,'one action cannot emit multiple shots');
  for(let frame=0;frame<1000&&(m.state.phase==='flight'&&!m.receptionDecision||m.exportCheckpoint().revision!==m.revision);frame++)m.update(.1);
  // A reception may be an intermediate playback boundary, so settle with additional frames.
  for(let frame=0;frame<100;frame++)m.update(.1);
  assert.deepEqual(json(m.exportCheckpoint()),saved);m.settleCommittedPlayback();
 }
 assert.ok(m.scoring.winner);assert.ok(Math.abs(m.scoring.score.home-m.scoring.score.away)>=2);
 const end=Match.fromCheckpoint(m.exportCheckpoint());assert.throws(()=>end.nextPoint());
});
test('invalid own-side targets and shot families cannot bypass turn validation',()=>{
 for(const team of ['home','away'] as const){const {m}=create(3,team),a=action(m),c=json(m.exportCheckpoint());
  for(const intent of [{...a.intent,type:'overhead'},{...a.intent,target:{kind:'point',x:1,z:team==='home'?3:-3}},{...a.intent,target:{kind:'player',playerId:a.intent.actor,aim:'body'}}]){assert.throws(()=>m.submitTurn({...a,intent} as TurnAction));assert.deepEqual(json(m.exportCheckpoint()),c);}
 }
});

test('new local playtests end at 3–2 and persist the short rules',()=>{
 const {m}=create();assert.equal(m.scoring.rules.target,3);assert.equal(m.scoring.rules.winBy,1);
 const resumed=Match.fromCheckpoint(m.exportCheckpoint());assert.deepEqual(resumed.scoring.rules,m.scoring.rules);
 resumed.scoring.score={home:2,away:2};resumed.scoring.award('home');assert.equal(resumed.scoring.winner,'home');assert.deepEqual(resumed.scoring.score,{home:3,away:2});
 assert.deepEqual(new Match().scoring.rules,DEFAULT_RULES);
});
