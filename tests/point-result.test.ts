import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {describePointResult} from '../src/point-result';
const names={you:'You',partner:'Finn','opponent-left':'Jules','opponent-right':'Rio'};
test('result copy attributes a fault to the hitter and a missed return to the receiver',()=>{
 const match=new Match(),shot={...match.shot,actor:'opponent-right' as const};
 assert.equal(describePointResult({winner:'home',reason:'out'}, {...shot,intent:{...shot.intent,type:'drive'}},id=>names[id]).title,'Rio hit it out!');
 assert.equal(describePointResult({winner:'away',reason:'failed-return'}, {...shot,resolution:{receiver:'partner',bounced:true}},id=>names[id]).title,'Finn missed the ball!');
 assert.equal(describePointResult({winner:'home',reason:'net',playerId:'opponent-right'},shot,()=> 'Riley').title,'Riley hit the net!');
});
test('actual serve fault records the server for the result popup',()=>{
 const match=new Match();
 match.playTargetShot('serve',{x:Math.sign(match.shot.contact.x),z:-4});
 assert.equal(match.shot.resolution?.result?.playerId,'you');
 const copy=describePointResult(match.shot.resolution!.result!,match.shot,id=>names[id]);
 assert.equal(copy.title,'You served outside the service box!');
 assert.equal(copy.detail,'Opponents win the rally.');
});
