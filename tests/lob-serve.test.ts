import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {choiceCopy} from '../src/shot-choice';
import {MatchService} from '../server/multiplayer/service';
import {A,creation,testers,MemoryRepository,action} from './helpers/remote';
test('saved lower Lob serves upgrade to the higher arc',()=>{
 const checkpoint=new Match().exportCheckpoint();
 const old=checkpoint.rally.options.find(option=>choiceCopy(option.intent).name==='Lob')!;
 old.intent.intendedNetClearance=2.5;
 const restored=Match.fromCheckpoint(checkpoint);
 const lobs=restored.targetingMenu.filter(choice=>choiceCopy(choice.intent).name==='Lob');
 assert.equal(lobs.length,1);assert.equal(lobs[0].intent.intendedNetClearance,5);
 restored.playMenuTarget(lobs[0],{x:-1.5,z:-5.5});assert.equal(restored.state.phase,'flight');
});
test('older saved serve decisions gain a playable Lob without duplicates',()=>{
 const checkpoint=new Match().exportCheckpoint();
 checkpoint.rally.options=checkpoint.rally.options.filter(option=>choiceCopy(option.intent).name!=='Lob');
 const restored=Match.fromCheckpoint(checkpoint);
 const lob=restored.targetingMenu.find(choice=>choiceCopy(choice.intent).name==='Lob');assert.ok(lob);
 const again=Match.fromCheckpoint(restored.exportCheckpoint());
 assert.equal(again.targetingMenu.filter(choice=>choiceCopy(choice.intent).name==='Lob').length,1);
 restored.playMenuTarget(lob,{x:-1.5,z:-5.5});assert.equal(restored.state.phase,'flight');
});
test('lob serve remains a serve, targets the same box and flies higher than slow serve',()=>{
 const m=new Match(),choices=m.targetingMenu;
 const lob=choices.find(c=>choiceCopy(c.intent).name==='Lob')!,slow=choices.find(c=>choiceCopy(c.intent).name==='Slow')!;
 assert.ok(lob);assert.ok(slow);assert.equal(lob.intent.type,'serve');
 assert.deepEqual(lob.intent.target,slow.intent.target);
 const point={x:-1.5,z:-5.5};
 const high=m.previewMenuTarget(lob,point),low=m.previewMenuTarget(slow,point);
 assert.deepEqual(high.aimPoint,low.aimPoint);assert.ok(high.legs[0].arc>low.legs[0].arc+1);
 m.playMenuTarget(lob,point);assert.equal(m.state.phase,'flight');assert.equal(m.shot.intent.type,'serve');
});
test('multiplayer advertises and accepts the lob serve',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),game=await service.create(A,creation());
 const index=game.choices.findIndex(c=>choiceCopy(c.intent).name==='Lob');assert.ok(index>=0);
 const result=await service.act(game.id,A,action(game,index));assert.equal(result.toVersion,1);assert.equal(result.state.animation[0].intent.type,'serve');assert.equal(choiceCopy(result.state.animation[0].intent).name,'Lob');
});
