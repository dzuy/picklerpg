import test from 'node:test';
import assert from 'node:assert/strict';
import {randomCourt} from '../src/random-court';
import {COURT_LOCATIONS,isPremiumCourt} from '../src/locations';
import type {PackId} from '../src/pack-catalog';

test('unknown ownership and unrelated packs randomize only free courts, excluding the current court',()=>{
 for(const packs of [[],['style'],['fun']] as PackId[][]){
  for(const current of [undefined,...COURT_LOCATIONS.map(c=>c.id)]){
   for(let i=0;i<100;i++){
    const court=randomCourt(current,packs,()=>i/100);
    assert.equal(isPremiumCourt(court),false);
    assert.notEqual(court,current);
   }
  }
 }
 assert.equal(isPremiumCourt(randomCourt()),false);
});

test('Court and Everything owners can randomize every court and shuffle away from the current court',()=>{
 for(const packs of [['court'],['everything']] as PackId[][]){
  const selected=new Set(Array.from({length:100},(_,i)=>randomCourt(undefined,packs,()=>i/100)));
  assert.deepEqual(selected,new Set(COURT_LOCATIONS.map(c=>c.id)));
  for(const current of COURT_LOCATIONS.map(c=>c.id)){
   for(let i=0;i<100;i++)assert.notEqual(randomCourt(current,packs,()=>i/100),current);
  }
 }
});
