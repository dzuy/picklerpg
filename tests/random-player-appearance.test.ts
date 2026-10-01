import test from 'node:test';
import assert from 'node:assert/strict';
import {randomPlayerAppearance} from '../src/random-player-appearance';
import {missingAppearancePacks} from '../src/premium-appearance';
import {PREMIUM_APPEARANCE_OPTIONS} from '../src/player-customization-tiers';
import {hasPack,type CosmeticAccess} from '../src/pack-catalog';
import {newPlayer,validatePlayer,type Appearance} from '../src/player-design';

test('appearance shuffles honor free, partial-pack, and Everything ownership',()=>{
 let seed=54321;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(const access of [false,[],['court'],['style'],['fun'],['everything']] as CosmeticAccess[]){
  const seen=new Set<string>();
  for(let i=0;i<200;i++){
   const appearance=randomPlayerAppearance(access,random);
   validatePlayer({...newPlayer('test'),appearance});
   assert.deepEqual(missingAppearancePacks(undefined,appearance,access),[]);
   for(const [key,values] of Object.entries(PREMIUM_APPEARANCE_OPTIONS))if((values as readonly unknown[]).includes(appearance[key as keyof Appearance]))seen.add(key==='paddleShape'?'fun':'style');
  }
  for(const pack of ['style','fun'] as const)assert.equal(seen.has(pack),hasPack(access,pack),`${JSON.stringify(access)} should only shuffle owned ${pack} parts`);
 }
});
