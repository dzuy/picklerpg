import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulatedDupr} from '../src/engine/simulated-dupr';
import {SKILLS,type PlayerSkills} from '../src/engine/model';
import {PLAYER_PROFILES,ARCHETYPES} from '../src/engine/player-profiles';
const all=(value:number)=>Object.fromEntries(SKILLS.map(k=>[k,value])) as PlayerSkills;
test('documented provisional anchors, bounds and validation',()=>{for(const [skill,rating] of [[0,2],[40,3],[60,3.5],[70,4],[80,4.5],[90,5],[100,5.5]])assert.equal(simulatedDupr(all(skill)),rating);assert.throws(()=>simulatedDupr(all(NaN)));assert.throws(()=>simulatedDupr(all(101)));});
test('all skills contribute monotonically without mutating profiles',()=>{const original=structuredClone(PLAYER_PROFILES);for(const key of SKILLS){const a=all(60),b={...a,[key]:90};assert.ok(simulatedDupr(b)>simulatedDupr(a))}assert.equal(simulatedDupr(PLAYER_PROFILES.you.skills),4);assert.notEqual(simulatedDupr(PLAYER_PROFILES.partner.skills),simulatedDupr(ARCHETYPES.defender.skills));assert.deepEqual(PLAYER_PROFILES,original);});
