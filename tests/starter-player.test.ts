import test from 'node:test';
import assert from 'node:assert/strict';
import {starterPlayer} from '../src/starter-player';
import {APPEARANCE_OPTIONS,validatePlayer} from '../src/player-design';
import {fitsSkillBudget,usedSkillPoints,STARTING_SKILL_POINTS} from '../src/skill-budget';
import {summarizeSkills} from '../src/player-skill-summary';
import {missingAppearancePacks} from '../src/premium-appearance';
import {PREMIUM_APPEARANCE_OPTIONS} from '../src/player-customization-tiers';

test('account starter randomizes every free appearance choice and color within the skill budget',()=>{
 const first=starterPlayer(' New Player ','starter',()=>0);
 const last=starterPlayer('New Player','starter',()=>0.999);
 for(const player of [first,last]){
  assert.deepEqual(validatePlayer(player),player);
  assert.deepEqual(missingAppearancePacks(undefined,player.appearance),[]);
  assert.ok(fitsSkillBudget(player.skills,STARTING_SKILL_POINTS));
  assert.equal(usedSkillPoints(player.skills),STARTING_SKILL_POINTS);
  assert.equal(player.name,'New Player');assert.equal(player.id,'starter');
 }
 for(const key of Object.keys(APPEARANCE_OPTIONS) as Array<keyof typeof APPEARANCE_OPTIONS>){
  const premium:readonly string[]=PREMIUM_APPEARANCE_OPTIONS[key]??[];
  if(APPEARANCE_OPTIONS[key].filter(value=>!premium.includes(value)).length>1)assert.notEqual(first.appearance[key],last.appearance[key],`${key} should vary independently`);
 }
 for(const key of ['skin','hair','facialHairColor','jersey','bottomColor','hatColor','accent','shoes','paddle','glassesColor','outfitColor','lensColor','lensTranslucency'] as const)assert.notEqual(first.appearance[key],last.appearance[key],`${key} should vary`);
});

test('new account skills vary by player, individual shot, and estimated rating',()=>{
 let seed=12345;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const players=Array.from({length:100},()=>starterPlayer('Player','starter',random));
 for(const player of players){assert.ok(fitsSkillBudget(player.skills,STARTING_SKILL_POINTS));assert.equal(usedSkillPoints(player.skills),STARTING_SKILL_POINTS);validatePlayer(player);}
 assert.ok(new Set(players.map(player=>JSON.stringify(player.skills))).size>90);
 assert.ok(players.some(({skills})=>skills.serve!==skills.drive&&skills.drop!==skills.dink));
 assert.ok(new Set(players.map(player=>summarizeSkills(player.skills).estimatedDupr.toFixed(2))).size>20);
});
