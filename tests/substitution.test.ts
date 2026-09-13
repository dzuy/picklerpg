import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {PLAYER_PROFILES} from '../src/engine/player-profiles';
import type {PlayerId} from '../src/engine/model';

test('all four slots substitute instantly without changing rally, positions or score',()=>{
 const match=new Match();const engine=match.engine,point=match.point,score=JSON.stringify(match.scoring),phase=match.state.phase,shot=match.shot;
 const positions=match.state.players.map(p=>({...p.position}));
 for(const id of ['you','partner','opponent-left','opponent-right'] as PlayerId[]){
  const player=newPlayer(`custom-${id}`);player.name=`New ${id}`;player.skills.drive=91;player.handedness='left';
  match.substitutePlayer(id,player);player.skills.drive=1;
  assert.equal(match.state.players.find(p=>p.id===id)!.skills.drive,91);assert.equal(match.state.players.find(p=>p.id===id)!.handedness,'left');assert.equal(match.getPlayerDesign(id)!.skills.drive,91);
 }
 assert.equal(match.engine,engine);assert.equal(match.shot,shot);assert.equal(match.point,point);assert.equal(match.state.phase,phase);assert.equal(JSON.stringify(match.scoring),score);assert.deepEqual(match.state.players.map(p=>p.position),positions);
 match.reset();for(const player of match.state.players){assert.equal(player.skills.drive,91);assert.equal(player.handedness,'left')}
 match.substitutePlayer('partner',null);assert.equal(match.getPlayerDesign('partner'),null);assert.deepEqual(match.state.players.find(p=>p.id==='partner')!.skills,PLAYER_PROFILES.partner.skills);
 assert.equal(match.state.players.find(p=>p.id==='you')!.skills.drive,91);
});
test('invalid substitute leaves the existing occupant untouched',()=>{
 const match=new Match(),player=newPlayer('invalid');player.skills.drive=101;const before=structuredClone(match.state.players);
 assert.throws(()=>match.substitutePlayer('partner',player));assert.equal(match.getPlayerDesign('partner'),null);assert.deepEqual(match.state.players,before);
});
