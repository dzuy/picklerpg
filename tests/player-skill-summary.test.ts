import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS} from '../src/engine/model';
import {newPlayer} from '../src/player-design';
import {LOOKS} from '../src/player-looks';
import {summarizeSkills,SUMMARY_SKILLS} from '../src/player-skill-summary';
test('every skill contributes once to a meter and changes the overall estimate',()=>{
 assert.deepEqual(Object.values(SUMMARY_SKILLS).flat().sort(),[...SKILLS].sort());
 const base=newPlayer('test').skills,before=summarizeSkills(base);
 for(const key of SKILLS){
  const after=summarizeSkills({...base,[key]:base[key]+10});
  assert.ok(after.estimatedDupr>before.estimatedDupr,key);
  assert.ok(Object.keys(before.meters).some(name=>after.meters[name as keyof typeof after.meters]>before.meters[name as keyof typeof before.meters]));
 }
 assert.equal(before.estimatedDupr,3.5);
});
test('starting players reflect their advertised specialties',()=>{
 const meters=(name:string)=>summarizeSkills(LOOKS.find(p=>p.name===name)!.skills).meters;
 assert.ok(meters('Leo').Power>meters('Leo').Control+25);
 assert.ok(meters('Jax').Speed>=90);
 assert.ok(meters('Zoe').Control>meters('Zoe').Power+20);
 assert.ok(meters('Cal').Hands>meters('Cal').Power+15);
 for(const name of ['Emma','Sam'])assert.ok(Math.max(...Object.values(meters(name)))-Math.min(...Object.values(meters(name)))<10);
});
test('estimates respect game benchmark endpoints and reward balanced skills',()=>{
 const uniform=(n:number)=>Object.fromEntries(SKILLS.map(key=>[key,n])) as ReturnType<typeof newPlayer>['skills'];
 assert.equal(summarizeSkills(uniform(0)).estimatedDupr,2);
 assert.equal(summarizeSkills(uniform(100)).estimatedDupr,8);
 const uneven={...uniform(70),drive:100,dink:40};
 assert.ok(summarizeSkills(uneven).estimatedDupr<summarizeSkills(uniform(70)).estimatedDupr);
});

test('ratings follow recreational, advanced and pro tiers without jumps',()=>{
 const uniform=(n:number)=>Object.fromEntries(SKILLS.map(key=>[key,n])) as ReturnType<typeof newPlayer>['skills'];
 for(const [skill,rating] of [[70,3.5],[80,4],[90,5],[95,6],[100,8]])assert.equal(summarizeSkills(uniform(skill)).estimatedDupr,rating);
 let previous=2;
 for(let skill=1;skill<=100;skill++){
  const rating=summarizeSkills(uniform(skill)).estimatedDupr;
  assert.ok(rating>previous&&rating<=8);
  assert.ok(rating-previous<=.400001);previous=rating;
 }

});

test('starting lineup offers a distinct spread from beginners to advanced',()=>{
 const ratings=LOOKS.map(player=>summarizeSkills(player.skills).estimatedDupr).sort((a,b)=>a-b);
 assert.ok(ratings[0]>=2.4&&ratings[0]<=2.6,'Include a 2.5 beginner');
 assert.ok(ratings.at(-1)!>=4.9&&ratings.at(-1)!<=5.2,'Include a roughly 5.0 advanced player');
 for(const [low,high] of [[2.5,3],[3,3.5],[3.5,4],[4,4.5],[4.5,5.2]])assert.ok(ratings.some(rating=>rating>=low&&rating<=high),`Missing rating tier ${low}–${high}`);
 for(let i=1;i<ratings.length;i++)assert.ok(ratings[i]-ratings[i-1]>.15,'Roster ratings should be meaningfully distinct');
 for(const player of LOOKS)for(const skill of SKILLS)assert.ok(Number.isInteger(player.skills[skill])&&player.skills[skill]>=0&&player.skills[skill]<=100);
});
