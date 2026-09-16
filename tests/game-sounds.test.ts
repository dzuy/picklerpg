import test from 'node:test';
import assert from 'node:assert/strict';
import {RallySounds,PlaybackSounds} from '../src/game-sounds';
import {RallyEngine} from '../src/engine/rally-engine';
import {pressureMiddle} from './helpers/pressure-middle';
import type {SoundCue} from '../src/sound';
import type {TurnAnimation} from '../src/multiplayer/protocol';

test('live shots and bounces play once; restored games and new rallies do not replay history',()=>{
 const engine=new RallyEngine(pressureMiddle),tracker=new RallySounds(),cues:SoundCue[]=[],emit=(cue:SoundCue)=>cues.push(cue);
 tracker.update(engine.state,emit);
 engine.submitIntent(engine.availableIntents[0]);tracker.update(engine.state,emit);tracker.update(engine.state,emit);
 assert.deepEqual(cues,['paddle']);
 engine.update(100);tracker.update(engine.state,emit);
 assert.ok(cues.includes('bounce'));
 const count=cues.length;tracker.update(engine.state,emit);assert.equal(cues.length,count);
 const restored=structuredClone(engine.state);tracker.update(restored,emit);assert.equal(cues.length,count);
 restored.rallyHistory.push({type:'point-end',time:restored.simulationTime,result:{winner:'home',reason:'winner'}});
 tracker.update(restored,emit);assert.equal(cues.at(-1),'point-win');
 tracker.update(new RallyEngine(pressureMiddle).state,emit);assert.equal(cues.length,count+1);
});

test('point feedback respects viewer team and match completion',()=>{
 const engine=new RallyEngine(pressureMiddle),tracker=new RallySounds(),cues:SoundCue[]=[],emit=(cue:SoundCue)=>cues.push(cue);
 tracker.update(engine.state,emit,'away');
 engine.state.rallyHistory.push({type:'point-end',time:1,result:{winner:'home',reason:'net'}});
 tracker.update(engine.state,emit,'away');assert.deepEqual(cues,['net','point-loss']);
 engine.state.rallyHistory.push({type:'point-end',time:2,result:{winner:'away',reason:'winner'}});
 tracker.update(engine.state,emit,'away',true);assert.equal(cues.at(-1),'match-win');
});

test('remote sound follows exact bounce timestamps and never repeats on held frames',()=>{
 const engine=new RallyEngine(pressureMiddle),tracker=new PlaybackSounds(),cues:SoundCue[]=[],emit=(cue:SoundCue)=>cues.push(cue);
 const segment:TurnAnimation={intent:engine.shot.intent,actor:engine.shot.actor,duration:1,pathTimes:[0,.43,1],path:[{x:0,y:1,z:0},{x:1,y:.037,z:1},{x:2,y:.7,z:2}],from:engine.state.players,to:engine.state.players};
 tracker.update(segment,0,emit);tracker.update(segment,.4,emit);assert.deepEqual(cues,['paddle']);
 tracker.update(segment,.44,emit);tracker.update(segment,.44,emit);tracker.update(segment,1,emit);assert.deepEqual(cues,['paddle','bounce']);
 tracker.update({...segment},1,emit);assert.deepEqual(cues,['paddle','bounce','paddle','bounce']);
});


test('a resumed incoming ball does not invent a second paddle contact',()=>{
 const engine=new RallyEngine(pressureMiddle),tracker=new PlaybackSounds(),cues:SoundCue[]=[],emit=(cue:SoundCue)=>cues.push(cue);
 const segment:TurnAnimation={intent:engine.shot.intent,actor:engine.shot.actor,duration:1,path:[{x:0,y:1,z:0},{x:1,y:.2,z:1}],from:engine.state.players,to:engine.state.players};
 tracker.update(segment,1,emit);
 tracker.update({...segment,path:[segment.path[1],{x:2,y:.037,z:2}]},1,emit);
 assert.deepEqual(cues,['paddle','bounce']);
});
