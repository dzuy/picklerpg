import test from 'node:test';
import assert from 'node:assert/strict';
import {shotCommentary} from '../src/shot-commentary';
import type {ShotIntent,ShotTarget} from '../src/engine/model';

const shot=(type:ShotIntent['type'],target:ShotTarget={kind:'zone',zone:'middle',depth:'deep'}):ShotIntent=>({schemaVersion:1,actor:'you',type,target,pace:'medium',shape:'flat',intendedNetClearance:.2,tacticalIntent:'sustain',aggression:.5,source:'menu'});

test('calls the selected shot and destination with the player name',()=>{
 assert.equal(shotCommentary(shot('drive'),{you:'Kai'}),'Kai drives it down the middle');
 assert.equal(shotCommentary(shot('dink',{kind:'zone',zone:'wide',depth:'kitchen'}),{you:'Amir'}),'Amir dinks it wide');
 assert.equal(shotCommentary(shot('serve',{kind:'zone',zone:'crosscourt',depth:'deep'})),'You serve it crosscourt');
});

test('describes exact court and player targets without a quality judgment',()=>{
 assert.equal(shotCommentary(shot('drop',{kind:'point',x:2.8,z:-1.2}),{you:'Kai'}),'Kai drops it wide');
 assert.equal(shotCommentary(shot('counter',{kind:'point',x:-1.4,z:-5}),{you:'Kai'}),'Kai counters it to the left');
 assert.equal(shotCommentary(shot('volley',{kind:'player',playerId:'opponent-left',aim:'feet'}),{you:'Kai','opponent-left':'Amir'}),"Kai volleys it at Amir's feet");
 assert.equal(shotCommentary({...shot('drive'),technique:'atp'},{you:'Kai'}),'Kai drives it around the post down the middle');
 assert.equal(shotCommentary({...shot('volley'),technique:'erne'},{you:'Kai'}),'Kai hits an Erne down the middle');
});
