import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUNITY_CATEGORIES,communityCategory,communityCategorySkills,communityRatedSkills,CURATED_COMMUNITY_BUDGET} from '../src/community-categories';
import {summarizeSkills} from '../src/player-skill-summary';
import {fitsSkillBudget,usedSkillPoints} from '../src/skill-budget';
import {SKILLS} from '../src/engine/model';
test('category builds retain 35 points and classify into their promised strengths',()=>{
 for(const category of COMMUNITY_CATEGORIES)for(let variant=0;variant<20;variant++){
  const skills=communityCategorySkills(category.id,variant);
  assert.equal(usedSkillPoints(skills),35);assert.ok(fitsSkillBudget(skills));assert.equal(communityCategory(skills).id,category.id);
  assert.ok(SKILLS.every(key=>Number.isFinite(skills[key])));
 }
});
test('curated builds cover 3.5–4.8 in each category with real engine skills',()=>{
 for(const category of COMMUNITY_CATEGORIES)for(let variant=0;variant<10;variant++)for(const rating of [3.5,3.7,3.9,4.1,4.3,4.5,4.8]){
  const skills=communityRatedSkills(category.id,rating,variant);
  assert.ok(fitsSkillBudget(skills,CURATED_COMMUNITY_BUDGET));
  assert.equal(communityCategory(skills).id,category.id);
  assert.equal(summarizeSkills(skills).estimatedDupr.toFixed(2),rating.toFixed(2));
 }
 assert.throws(()=>communityRatedSkills('bangers',NaN));
 assert.throws(()=>communityRatedSkills('bangers',5));
});
test('classifying a personal build does not modify its skills',()=>{
 const skills=communityCategorySkills('fast-hands');const before=structuredClone(skills);
 assert.equal(communityCategory(skills).title,'Fast Hands');assert.deepEqual(skills,before);
});
