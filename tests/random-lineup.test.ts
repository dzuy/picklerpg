import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomLineup} from '../src/random-lineup';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {ARCHETYPES} from '../src/engine/player-profiles';
import {chooseOpponentShot} from '../src/engine/opponent-policy';
import {labSetup} from '../src/shot-lab';
test('random lineup preserves the saved user and stays stable across points and restarts',()=>{
 const match=new Match(),saved=newPlayer('saved-me');saved.name='My player';saved.skills.drive=91;match.setPlayerDesign(saved);
 const roster=randomLineup(()=>.3);
 assert.equal(new Set(roster.map(p=>p.player.name)).size,3);
 assert.equal(new Set(roster.map(p=>p.archetype)).size,3);
 for(const {slot,archetype,player} of roster){match.lineup[slot]=archetype;match.substitutePlayer(slot,player)}
 match.reset();match.playTargetShot('serve',{x:Math.sign(match.shot.contact.x),z:-1});
 for(let frame=0;frame<500&&match.state.phase!=='complete';frame++)match.update(.05);
 match.nextPoint();
 assert.deepEqual(match.playerDesign,saved);
 for(const {slot,player} of roster)assert.deepEqual(match.state.players.find(p=>p.id===slot)!.skills,player.skills);
});
test('specialists retain strong strengths and weaknesses with bounded random variation',()=>{
 for(const draw of [0,.2,.5,.8,.999]){
  for(const {archetype,player} of randomLineup(()=>draw)){
   assert.ok(Object.values(player.skills).every(n=>n>=15&&n<=98));
   if(archetype==='banger')assert.ok(player.skills.drive-player.skills.dink>40);
   if(archetype==='dinker')assert.ok(player.skills.dink-player.skills.drive>40);
   if(archetype==='lobber')assert.ok(player.skills.drop-player.skills.counter>40);
  }
 }
});
test('lob specialist chooses a playable high lob from a settled deep contact',()=>{
 const setup=labSetup('drive'),match=new Match(),players=match.state.players;
 const player=players[0];player.skills={...ARCHETYPES.lobber.skills};player.tendencies={...ARCHETYPES.lobber.tendencies};
 const choice=chooseOpponentShot(player.id,{...setup.context,incomingSpeed:5},players)!;
 assert.equal(choice.intent.type,'lob');assert.equal(choice.intent.intendedNetClearance,2.5);
});
