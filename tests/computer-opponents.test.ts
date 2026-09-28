import test from 'node:test';
import assert from 'node:assert/strict';
import {computerOpponent} from '../src/computer-opponents';
import {computerTeam,resolveMatchTeam} from '../server/multiplayer/computer-team';
import {communityCategorySkills} from '../src/community-categories';
import {newPlayer,validatePlayer} from '../src/player-design';
import {summarizeSkills} from '../src/player-skill-summary';
import {normalizeSkillBudget} from '../src/skill-budget';
import {parseSoloLaunch} from '../src/solo-launch';

const source=(name:string)=>({...newPlayer('source'),name,skills:communityCategorySkills('bangers')});
test('computer builds cover beginner through advanced while preserving specialties and public sources',()=>{
 const names=['Mila','Jun','Rafa','Bea','Jade','Finn','Nico','Ivy','Luna','Kai','Theo','Zoe','Poppy','Max','Amir','Elle','Sage','Remy','Ollie','Skye'];
 const ratings=names.map(name=>{
  const player=source(name),before=structuredClone(player),opponent=computerOpponent(player);
  assert.deepEqual(player,before);
  assert.deepEqual(computerOpponent({...player,id:'community-alias'}).skills,opponent.skills);
  assert.deepEqual(validatePlayer(opponent).skills,opponent.skills);
  assert.ok(opponent.skills.drive>opponent.skills.reset,'power specialty survives');
  return summarizeSkills(opponent.skills).estimatedDupr;
 });
 assert.ok(Math.min(...ratings)>=2.45&&Math.min(...ratings)<=2.55);
 assert.ok(Math.max(...ratings)>=5.3&&Math.max(...ratings)<=5.5);
 assert.ok(new Set(ratings.map(r=>Math.round(r*10))).size>=7);
});
test('only trusted bot accounts get computer builds; client supplied skills are ignored',async()=>{
 const saved=[source('Nico'),source('Jade')];
 const user={app_metadata:{community_bot:true,multiplayer_playtest:true},user_metadata:{open_play_team:saved}};
 const expected=computerTeam(user)!;
 const input=[newPlayer('spoof-one'),newPlayer('spoof-two')] as any;
 const client={auth:{admin:{getUserById:async()=>({data:{user},error:null})}},rpc:async()=>{throw Error('Bot should use server-owned saved team')}} as any;
 assert.deepEqual(await resolveMatchTeam(client,input,'bot'),expected);
 assert.deepEqual(await resolveMatchTeam(client,expected,'bot'),expected,'rematches do not compound skill adjustments');
 assert.equal(computerTeam({...user,app_metadata:{},user_metadata:{...user.user_metadata,community_bot:true,multiplayer_playtest:true}}),null);
 assert.equal(computerTeam({...user,app_metadata:{community_bot:true}}),null);
 assert.deepEqual(user.user_metadata.open_play_team,saved);
});
test('human accounts keep account budget enforcement even when submitting computer builds',async()=>{
 const user={app_metadata:{},user_metadata:{community_bot:true}};
 const client={auth:{admin:{getUserById:async()=>({data:{user},error:null})}},rpc:async()=>({data:35,error:null})} as any;
 const team=[computerOpponent(source('Nico')),source('Jade')] as any;
 const resolved=await resolveMatchTeam(client,team,'human');
 assert.deepEqual(resolved[0].skills,normalizeSkillBudget(team[0].skills,35));
 assert.ok(summarizeSkills(resolved[0].skills).estimatedDupr<4);
});

test('solo launch preserves computer skills without changing the human roster',()=>{
 const human=source('Nico'),opponent=computerOpponent(human);
 const launch=parseSoloLaunch({players:{you:human,partner:source('Jade'),'opponent-left':opponent,'opponent-right':computerOpponent(source('Zoe'))},court:'forest',scoring:'rally-doubles',target:11});
 assert.deepEqual(launch.players.you.skills,human.skills);
 assert.deepEqual(launch.players['opponent-left'].skills,opponent.skills);
 assert.ok(summarizeSkills(launch.players['opponent-left'].skills).estimatedDupr>5);
});
