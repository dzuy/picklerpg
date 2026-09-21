import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePlayback} from '../src/multiplayer/playback';
import {RallyEngine} from '../src/engine/rally-engine';
import {pressureMiddle} from './helpers/pressure-middle';
import type {TurnAnimation} from '../src/multiplayer/protocol';
test('recovery delay is visible in remote live playback and replays',()=>{
 const engine=new RallyEngine(pressureMiddle),from=engine.snapshot().players;
 const to=structuredClone(from);to.forEach(p=>p.position.x+=1);
 const segment:TurnAnimation={intent:engine.availableIntents[0],actor:'you',duration:1,recoveryDelay:.4,path:[{x:0,y:1,z:3},{x:0,y:1,z:-3}],from,to};
 const before=samplePlayback(segment,200);
 assert.deepEqual(before.players.find(p=>p.id==='you')!.position,from.find(p=>p.id==='you')!.position);
 assert.notDeepEqual(before.players.find(p=>p.id==='partner')!.position,from.find(p=>p.id==='partner')!.position);
 assert.deepEqual(samplePlayback(segment,1000).players,to);
 assert.deepEqual(samplePlayback({...segment,recoveryDelay:2,to:from},500).players.find(p=>p.id==='you')!.position,from.find(p=>p.id==='you')!.position);
});
