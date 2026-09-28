import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS,type PlayerSkills} from '../src/engine/model';
import {soloXpDifficulty} from '../src/solo-xp';

const player=(team:'home'|'away',skill:number)=>({team,skills:Object.fromEntries(SKILLS.map(key=>[key,skill])) as PlayerSkills});
const matchup=(home:number[],away:number[])=>soloXpDifficulty([...home.map(skill=>player('home',skill)),...away.map(skill=>player('away',skill))]);

test('solo XP rewards relative team strength at rating thresholds',()=>{
 assert.equal(matchup([70,70],[70,70]),'normal');
 assert.equal(matchup([90,90],[70,70]),'normal');
 assert.equal(matchup([70,70],[78,78]),'normal');
 assert.equal(matchup([70,70],[80,80]),'hard');
 assert.equal(matchup([70,70],[88,88]),'hard');
 assert.equal(matchup([70,70],[90,90]),'expert');
 assert.equal(matchup([60,60],[80,80]),'expert');
});

test('solo XP averages both players on each team',()=>{
 assert.equal(matchup([60,80],[80,80]),'hard');
 assert.equal(matchup([70,70],[70,90]),'hard');
 assert.equal(matchup([70,90],[70,90]),'normal');
 assert.throws(()=>matchup([70,70],[]),/both teams/);
});
