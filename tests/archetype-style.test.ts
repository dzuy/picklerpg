import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHETYPES,characterArchetype,type ArchetypeId} from '../src/engine/player-profiles';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {SLOTS} from '../src/engine/checkpoint';
import {buildDecisionMenu} from '../src/engine/decision-menu';
import {OpponentMemory,tacticalSnapshot,localDecision} from '../src/engine/opponent-brain';
import type {ShotContext} from '../src/engine/shot-families';
const styles=Object.keys(ARCHETYPES) as ArchetypeId[];
function choices(style:ArchetypeId,situation:'baseline'|'kitchen'|'pressure'|'high'){
 const m=new Match(),profile=ARCHETYPES[style],state=m.snapshot();
 for(const [i,p] of state.players.entries()){p.skills={...profile.skills};p.tendencies={...profile.tendencies};p.position={x:i%2?-1.4:1.4,y:0,z:p.team==='home'?2.8:-2.8};}
 const height=situation==='high'?2.6:situation==='pressure'?1.1:.75,z=situation==='baseline'?5.4:2.6;
 state.currentHitter='you';state.ball.position={x:1,y:height,z};state.players[0].position={x:1,y:0,z:z+.2};state.ball.velocity={x:0,y:0,z:situation==='pressure'?14:4};
 const context:ShotContext={contact:state.ball.position,feet:state.players[0].position,bounced:['baseline','kitchen'].includes(situation),opening:'rally',twoBounceSatisfied:true,incomingSpeed:Math.abs(state.ball.velocity.z)};
 const options=buildDecisionMenu('you',context,state.players).map(o=>o.intent),snapshot=tacticalSnapshot(state,options,new OpponentMemory(),'Chess Player',.8),counts:Record<string,number>={};
 for(let seed=0;seed<200;seed++){const intent=options[localDecision(snapshot,undefined,{seed,recent:[]})];counts[intent.type]=(counts[intent.type]??0)+1;}
 return counts;
}
test('all created archetypes and modest skill edits retain their behavior across slots and saves',()=>{
 for(const style of styles){
  const profile=ARCHETYPES[style],p=newPlayer(style);p.skills={...profile.skills};
  assert.equal(characterArchetype(p.skills),style);assert.equal(characterArchetype({...p.skills,movement:p.skills.movement+3}),style);
  const m=new Match();for(const id of SLOTS)m.substitutePlayer(id,p);m.reset();
  for(const player of m.state.players)assert.deepEqual(player.tendencies,profile.tendencies);
  const restored=Match.fromCheckpoint(m.exportCheckpoint());assert.deepEqual(restored.state.players,m.state.players);
  restored.startLocalHumanMatch(Object.fromEntries(SLOTS.map(id=>[id,p])) as Parameters<Match['startLocalHumanMatch']>[0]);
  for(const player of restored.state.players)assert.deepEqual(player.tendencies,profile.tendencies);
 }
 assert.equal(characterArchetype(Object.fromEntries(Object.keys(ARCHETYPES.allCourt.skills).map(k=>[k,5])) as typeof ARCHETYPES.allCourt.skills),null);
});
test('archetypes express different preferences at identical legal contacts',()=>{
 const banger=choices('banger','baseline'),lobber=choices('lobber','baseline'),attacker=choices('attacker','pressure');
 assert.ok((banger.drive??0)>=160,JSON.stringify(banger));assert.ok((lobber.lob??0)>=140,JSON.stringify(lobber));
 assert.ok((attacker.counter??0)>=100,JSON.stringify(attacker));assert.ok((attacker.counter??0)+(attacker.volley??0)>=180);
 for(const style of ['dinker','grinder'] as const){const c=choices(style,'kitchen');assert.ok((c.dink??0)+(c.reset??0)>=170,`${style}: ${JSON.stringify(c)}`);}
 const setup=choices('setup','baseline');assert.ok((setup.drop??0)>=160,JSON.stringify(setup));
 const defender=choices('defender','pressure');assert.ok((defender.block??0)>=170,JSON.stringify(defender));
 const balanced=choices('allCourt','baseline');assert.ok(Object.values(balanced).filter(n=>n>=10).length>=3,JSON.stringify(balanced));
});
test('every archetype still puts away a genuine high ball',()=>{
 for(const style of styles){const c=choices(style,'high');assert.ok((c.overhead??0)>=160,`${style}: ${JSON.stringify(c)}`);}
});
