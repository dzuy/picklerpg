import assert from 'node:assert/strict';
import {test} from 'node:test';
import {newPlayer} from '../src/player-design';
import {summarizeSkills} from '../src/player-skill-summary';
import {playerCardDetails,PLAYER_CARD_URL,PLAYER_CARD_SIZE} from '../src/player-trading-card';

test('card uses editor skill definitions and links to the public site without exposing player identifiers',()=>{
 const player=newPlayer('private-roster-id');player.name='Rally Queen';player.skills.drive=93;player.skills.reset=20;
 const before=structuredClone(player),card=playerCardDetails(player),summary=summarizeSkills(player.skills);
 assert.deepEqual(card.meters,summary.meters);assert.equal(card.rating,summary.estimatedDupr.toFixed(2));
 assert.equal(card.filename,'picklebash-rally-queen.png');assert.ok(card.caption.includes(PLAYER_CARD_URL));assert.ok(!card.caption.includes(player.id));assert.deepEqual(player,before);
 assert.deepEqual(PLAYER_CARD_SIZE,{width:1080,height:1350});
});
test('blank drafts and names with unicode or path characters produce safe download names',()=>{
 const player=newPlayer('draft');player.name=' ';assert.equal(playerCardDetails(player).name,'Your player');
 player.name='../../🔥';assert.equal(playerCardDetails(player).filename,'picklebash-player.png');
 player.name='Élodie / Rally';assert.equal(playerCardDetails(player).name,'Élodie / Rally');assert.ok(!playerCardDetails(player).filename.includes('/'));
});
