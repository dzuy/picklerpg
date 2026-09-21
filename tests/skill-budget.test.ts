import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer} from '../src/player-design';
import {SKILLS} from '../src/engine/model';
import {SUMMARY_SKILLS} from '../src/player-skill-summary';
import {allocateArea,allocateDetail,usedSkillPoints,normalizeSkillBudget,randomBudgetSkills,fitsSkillBudget} from '../src/skill-budget';
test('equal 70 skills consume 35 points; summary and detailed changes cannot exceed the budget',()=>{
 const base=newPlayer('test').skills;assert.equal(usedSkillPoints(base),35);
 assert.equal(allocateArea(base,'Power',9).drive,70);
 const lower=allocateArea(base,'Speed',5);const power=allocateArea(lower,'Power',9);
 assert.equal(power.drive,90);assert.equal(usedSkillPoints(power),35);
 assert.equal(allocateDetail(power,'return',100).return,70);
 assert.ok(fitsSkillBudget(allocateDetail(power,'return',0)));
});
test('random builds use the entire account budget and never exceed tier limits',()=>{
 for(let budget=35;budget<=45;budget++)for(let i=0;i<100;i++){
 const skills=randomBudgetSkills(budget);assert.equal(usedSkillPoints(skills),budget);assert.ok(fitsSkillBudget(skills,budget));
 }
});
test('normalizing preserves valid builds and only reduces invalid skills',()=>{
 for(let i=0;i<100;i++){
 const skills=Object.fromEntries(SKILLS.map(k=>[k,Math.floor(Math.random()*101)])) as ReturnType<typeof newPlayer>['skills'];
 const fixed=normalizeSkillBudget(skills);assert.ok(fitsSkillBudget(fixed));for(const k of SKILLS)assert.ok(fixed[k]<=skills[k]);assert.deepEqual(normalizeSkillBudget(fixed),fixed);
 }
 assert.equal(Object.keys(SUMMARY_SKILLS).length,5);
});
