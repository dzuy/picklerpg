import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {PLAYER_PROFILES} from '../src/engine/player-profiles';
import {SKILLS} from '../src/engine/model';
test('distinct profiles are valid and applied as isolated match state',()=>{
 const m=new Match();
 for(const p of m.state.players){assert.deepEqual(p.skills,PLAYER_PROFILES[p.id].skills);assert.deepEqual(Object.keys(p.skills).sort(),[...SKILLS].sort());assert.ok(Object.values(p.skills).every(n=>n>=0&&n<=100))}
 assert.ok(m.state.players[2].skills.reset<m.state.players[0].skills.reset);assert.ok(m.state.players[3].skills.movement<70);
 m.state.players[2].skills.reset=0;m.reset();assert.equal(m.state.players[2].skills.reset,45);
});
