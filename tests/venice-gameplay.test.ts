import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateGame,type EvalScenario} from '../src/game-evaluation';
const lineup=JSON.parse(readFileSync(new URL('./fixtures/venice-balanced-game.json',import.meta.url),'utf8')) as EvalScenario;

test('reference attack/defense lineup completes on either side with legal varied shots',()=>{
 const games=[0,1,2,3].map(rotation=>evaluateGame(lineup,18427,rotation,{trace:true}));
 for(const game of games){
  assert.equal(game.status,'complete');
  assert.ok(game.rallies.every(r=>r.shots>0));
  assert.ok(game.trace!.every(s=>s.intent.power!==undefined&&s.intent.power>=0&&s.intent.power<=1));
  assert.ok(new Set(game.trace!.map(s=>s.intent.type)).size>=5);
 }
 const shots=games.flatMap(g=>g.trace!);
 assert.ok(shots.some(s=>s.intent.type==='reset'||s.intent.type==='block'));
 assert.ok(shots.some(s=>s.intent.target.kind==='player'));
});
