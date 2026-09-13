import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {choiceCopy} from '../src/shot-choice';
test('serve dock and wheel offer exactly five distinct styles in requested order',()=>{
 const match=new Match(),choices=match.targetingMenu;
 assert.deepEqual(choices.map(c=>choiceCopy(c.intent).name),['Topspin','Slice','Backspin','Fast','Slow']);
 const point={x:-1,z:-4};
 const shots=choices.map(choice=>match.previewMenuTarget(choice,point));
 assert.equal(shots[0].intent.spin?.vertical,'topspin');
 assert.equal(shots[1].intent.spin?.side,'right');assert.equal(shots[1].intent.spin?.vertical,'none');
 assert.equal(shots[2].intent.spin?.vertical,'slice');assert.equal(shots[2].intent.spin?.side,'none');
 assert.equal(shots[3].intent.pace,'fast');assert.equal(shots[4].intent.pace,'soft');
 for(const shot of shots)assert.deepEqual(shot.intent.target,{kind:'point',...point});
});
