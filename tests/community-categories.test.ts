import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMUNITY_CATEGORIES,communityCategory,communityCategorySkills} from '../src/community-categories';
import {fitsSkillBudget,usedSkillPoints} from '../src/skill-budget';
import {SKILLS} from '../src/engine/model';
test('category builds retain 35 points and classify into their promised strengths',()=>{
 for(const category of COMMUNITY_CATEGORIES)for(let variant=0;variant<20;variant++){
  const skills=communityCategorySkills(category.id,variant);
  assert.equal(usedSkillPoints(skills),35);assert.ok(fitsSkillBudget(skills));assert.equal(communityCategory(skills).id,category.id);
  assert.ok(SKILLS.every(key=>Number.isFinite(skills[key])));
 }
});
test('classifying a personal build does not modify its skills',()=>{
 const skills=communityCategorySkills('fast-hands');const before=structuredClone(skills);
 assert.equal(communityCategory(skills).title,'Fast Hands');assert.deepEqual(skills,before);
});
