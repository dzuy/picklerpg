import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {EVAL_SLOTS,uniformSkills} from '../src/game-evaluation';
import {contactDifficulty} from '../src/engine/difficulty';
function equalGame(opening:'home'|'away'){
 const m=new Match();m.brainMode='local';m.openingTeam=opening;m.playerAutonomy=true;m.partnerAutonomy=true;
 for(const slot of EVAL_SLOTS){m.lineup[slot]='allCourt';const p=newPlayer(slot);p.skills=uniformSkills(70);m.substitutePlayer(slot,p)}m.reset();return m;
}
test('both opening servers get the same serve choices and automatic policy',()=>{
 const home=equalGame('home'),away=equalGame('away');
 const clean=({actor,source,...intent}:any)=>intent;
 assert.deepEqual(home.availableIntents.map(clean),away.availableIntents.map(clean));
 home.update(0);away.update(0);
 assert.deepEqual(clean(home.state.shotHistory[0]),clean(away.state.shotHistory[0]));
 assert.equal(away.scoring.server,'opponent-left');assert.equal(away.scoring.serverNumber,2);
});
test('automatic rallies use the same reception path without home-only prompts',()=>{
 const m=equalGame('home');let shots=0;
 for(let i=0;i<2000&&!m.scoring.winner;i++){
  m.update(.1);assert.equal(m.receptionDecision,false);assert.equal(m.shot.receptionChoice,undefined);
  if(m.state.phase==='complete'){shots+=m.state.shotHistory.length;if(!m.scoring.winner)m.nextPoint()}
 }
 assert.ok(shots>10);
});
test('contact difficulty mirrors across the court for identical handedness',()=>{
 const m=equalGame('home'),p=m.state.players[0];p.position={x:1,y:0,z:4};p.facing=0;
 const c={contact:{x:.5,y:.4,z:4.5},feet:p.position,bounced:true,opening:'rally' as const,twoBounceSatisfied:true,incomingSpeed:8,movementZ:1};
 const mirror={...p,team:'away' as const,facing:Math.PI,position:{x:-1,y:0,z:-4}};
 assert.deepEqual(contactDifficulty(c,p),contactDifficulty({...c,contact:{x:-.5,y:.4,z:-4.5},feet:mirror.position,movementZ:-1},mirror));
});
test('equivalent rally contacts expose the same shot families and targets to both teams',()=>{
 const m=equalGame('home');
 for(const height of [.4,1,2.3]){
  const players=structuredClone(m.state.players);
  for(const [i,p] of players.entries()){const side=p.team==='home'?1:-1;p.position={x:(i%2? -1.4:1.4)*side,y:0,z:side*4};p.facing=p.team==='home'?0:Math.PI}
  const menu=(actor:'you'|'opponent-left')=>{const side=actor==='you'?1:-1,c={contact:{x:1.4*side,y:height,z:4*side},feet:{x:1.4*side,y:0,z:4*side},bounced:height<1.9,opening:'rally' as const,twoBounceSatisfied:true,incomingSpeed:8};return m['options'](actor,c,players,4).map(s=>{const {actor,source,...intent}=s.intent;return {...intent,target:intent.target.kind==='player'?{...intent.target,playerId:EVAL_SLOTS.indexOf(intent.target.playerId)%2}:intent.target}})};
  assert.deepEqual(menu('you'),menu('opponent-left'));
 }
});
test('live resets draw fresh seeds while deterministic matches keep the supplied seed',t=>{
 let next=100;
 t.mock.method(globalThis.crypto,'getRandomValues',(array:Uint32Array)=>{array[0]=next++;return array});
 const m=equalGame('home');m.seed=42;m.reset();assert.equal(m.seed,42);
 m.randomizeSeedOnReset=true;m.reset();assert.equal(m.seed,100);m.reset();assert.equal(m.seed,101);
});
