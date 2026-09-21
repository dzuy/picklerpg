import test from 'node:test';
import assert from 'node:assert/strict';
import {matchCelebrationCopy} from '../src/match-celebration';
test('shutout copy follows the viewer on either side of the court',()=>{
 assert.equal(matchCelebrationCopy({home:0,away:11},'home','mooncrayon'),'You got pickled!');
 assert.equal(matchCelebrationCopy({home:11,away:0},'home','mooncrayon'),'You pickled mooncrayon!');
 assert.equal(matchCelebrationCopy({home:11,away:0},'away','mooncrayon'),'You got pickled!');
 assert.equal(matchCelebrationCopy({home:0,away:11},'away','mooncrayon'),'You pickled mooncrayon!');
 assert.equal(matchCelebrationCopy({home:11,away:9},'home','mooncrayon'),'Good game!');
});

import * as THREE from 'three';
import {MatchCelebration,celebrationSpot} from '../src/match-celebration';
import {PreparedShotFixture} from './helpers/prepared-shot';
import {athletePose} from '../src/athlete-motion';
test('ceremony gates results, preserves simulation positions, and runs once per match',()=>{
 const oldDocument=globalThis.document,oldMedia=globalThis.matchMedia;
 const element=():any=>({hidden:true,textContent:'',style:{},setAttribute(){},append(){},querySelector:()=>element()});
 Object.assign(globalThis,{document:{hidden:false,createElement:element},matchMedia:()=>({matches:false})});
 try{
  const celebration=new MatchCelebration(new THREE.Scene(),element());
  const score={home:11,away:0};
  assert.equal(celebration.ready('match-1',score,'home','mooncrayon'),false);
  for(let frame=0;frame<=40;frame++)celebration.update(frame/10);
  const fixture=new PreparedShotFixture(),player=fixture.state.players.find(p=>p.team==='home')!;
  const original=structuredClone(player),mesh=new THREE.Group(),pose=athletePose(player,fixture.state,fixture.shot);
  celebration.pose(player,fixture.state.players,mesh,pose,false);
  assert.equal(mesh.position.x,celebrationSpot(player,fixture.state.players).x);assert.equal(mesh.position.z,.65);assert.equal(mesh.rotation.y,0);
  assert.deepEqual(player,original);
  assert.equal(celebration.ready('match-1',score,'home','mooncrayon'),false);
  for(let frame=41;frame<=95;frame++)celebration.update(frame/10);
  assert.equal(celebration.active,false);
  assert.equal(celebration.ready('match-1',score,'home','mooncrayon'),true);
  assert.equal(celebration.ready('match-2',score,'home','mooncrayon'),false);
  celebration.cancel();
  assert.equal(celebration.active,false);
  assert.equal(celebration.ready('match-2',score,'home','mooncrayon'),false);
 }finally{Object.assign(globalThis,{document:oldDocument,matchMedia:oldMedia})}
});


test('center gathering preserves current left/right order even when roster slots switch sides',()=>{
 const {players}=new PreparedShotFixture().state;
 for(const team of ['home','away'] as const){
  const teammates=players.filter(p=>p.team===team);
  for(const swapped of [false,true]){
   teammates[0].position.x=swapped?2:-2;
   teammates[1].position.x=swapped?-1.5:1.5;
   const [left,right]=[...teammates].sort((a,b)=>a.position.x-b.position.x);
   const leftSpot=celebrationSpot(left,players),rightSpot=celebrationSpot(right,players);
   assert.equal(leftSpot.x,-.65);assert.equal(rightSpot.x,.65);
   assert.equal(leftSpot.z,team==='home'?.65:-.65);
   for(let step=0;step<=20;step++){
    const t=step/20;
    const xLeft=left.position.x+(leftSpot.x-left.position.x)*t;
    const xRight=right.position.x+(rightSpot.x-right.position.x)*t;
    assert.ok(xRight-xLeft>=1.3-1e-9,'teammates remain separated throughout the approach');
   }
  }
 }
});
