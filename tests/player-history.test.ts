import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playerHistory,type HistoryMatch} from '../src/player-history';
const game:HistoryMatch={id:'one',home_names:'A & B',away_names:'C & D',home_score:11,away_score:7,completed_at:'2026-09-13',participants:[{player_id:'a',name:'Alex',team:'home'},{player_id:'b',name:'Blair',team:'home'},{player_id:'c',name:'Casey',team:'away'},{player_id:'d',name:'Drew',team:'away'}]};
test('credits all four players with their own team outcome',()=>{
 for(const id of ['a','b'])assert.equal(playerHistory([game],id).wins,1);
 for(const id of ['c','d']){const history=playerHistory([game],id);assert.equal(history.losses,1);assert.equal(history.entries[0].score,7);assert.equal(history.entries[0].against,11)}
});
test('identity survives renames, partner changes and playing on the other side',()=>{
 const later:HistoryMatch={...game,id:'two',participants:[{player_id:'a',name:'Renamed',team:'away'}]};
 const result=playerHistory([game,later], 'a');assert.equal(result.games,2);assert.equal(result.wins,1);assert.equal(result.losses,1);
});
test('same names do not merge identities and legacy results remain unassigned',()=>{
 const other={...game,id:'two',participants:[{player_id:'other',name:'Alex',team:'home' as const}]};
 assert.equal(playerHistory([game,other,{...game,participants:null}], 'a').games,1);
});
test('early exits appear without awarding wins or losses',()=>{
 const result=playerHistory([{...game,ended_early:true}], 'c');assert.equal(result.games,0);assert.equal(result.wins,0);assert.equal(result.losses,0);assert.equal(result.entries[0].result,'Ended early');
});

test('repeated characters count a match once and both-team appearances have no single win or loss',()=>{
 const same={...game,participants:[game.participants![0],game.participants![0]]};
 assert.equal(playerHistory([same],'a').wins,1);assert.equal(playerHistory([same],'a').games,1);
 const both={...same,participants:[...same.participants,{...game.participants![0],team:'away' as const}]};
 const history=playerHistory([both],'a');assert.equal(history.games,1);assert.equal(history.wins,0);assert.equal(history.losses,0);assert.equal(history.entries[0].result,'Both teams');
});
