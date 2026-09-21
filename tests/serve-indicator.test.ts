import test from 'node:test';
import assert from 'node:assert/strict';
import {serveDotCount} from '../src/serve-indicator';
import {DoublesScore} from '../src/engine/scoring';
test('service dots follow second server and side-out without confusing viewer team',()=>{
 const score=new DoublesScore();
 assert.equal(serveDotCount('home',score.server,score.serverNumber),2);
 assert.equal(serveDotCount('away',score.server,score.serverNumber),0);
 score.award('away');
 assert.equal(serveDotCount('away',score.server,score.serverNumber),1);
 assert.equal(serveDotCount('home',score.server,score.serverNumber),0);
 score.award('home');assert.equal(serveDotCount('away',score.server,score.serverNumber),2);
 assert.equal(serveDotCount('away',score.server,score.serverNumber,true),0);
});
test('rally scoring shows one dot when service changes teams',()=>{
 const score=new DoublesScore({scoring:'rally-doubles',target:7,winBy:1});
 score.award('away');assert.equal(serveDotCount('away',score.server,score.serverNumber),1);
});
