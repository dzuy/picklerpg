import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cyclePlayer,setupLineup,shufflePlayers,validLineup} from '../src/match-setup-state';
import {newPlayer} from '../src/player-design';

test('setup preserves saved user identity, latest skills and current teammates',()=>{
 const user=newPlayer('custom');user.name='My player';user.skills.drive=91;
 const partner=newPlayer('partner'),opponent=newPlayer('opponent');
 const {players,selected}=setupLineup([user],[{...user,skills:{...user.skills,drive:20}},partner,opponent,null],()=>.5);
 assert.deepEqual(selected.slice(0,3),['custom','partner','opponent']);
 assert.equal(players.find(p=>p.id==='custom')?.skills.drive,91);
 assert.ok(validLineup(players.map(p=>p.id),selected));
});
test('setup repairs duplicates and fills all four slots without replacing the user',()=>{
 const user=newPlayer('custom');
 const {players,selected}=setupLineup([user],[user,user,null,null],()=>0);
 assert.equal(selected[0],user.id);assert.ok(validLineup(players.map(p=>p.id),selected));
 const shuffled=[selected[0],...shufflePlayers(players.map(p=>p.id).filter(id=>id!==selected[0]),()=>0).slice(0,3)];
 assert.equal(shuffled[0],user.id);assert.ok(validLineup(players.map(p=>p.id),shuffled));
});
test('arrows skip occupied players in either direction and never change the fixed user',()=>{
 const roster=['a','b','c','d','e','f'],selected=['a','b','c','d'];
 assert.deepEqual(cyclePlayer(roster,selected,1,1),['a','e','c','d']);
 assert.deepEqual(cyclePlayer(roster,selected,1,-1),['a','f','c','d']);
 assert.deepEqual(cyclePlayer(roster,selected,0,1),selected);
 let lineup=selected;
 for(let i=0;i<100;i++){lineup=cyclePlayer(roster,lineup,1+i%3,i%2?1:-1);assert.equal(lineup[0],'a');assert.ok(validLineup(roster,lineup))}
});
test('four-player roster swaps movable players without duplicates or an endless loop',()=>{
 const roster=['a','b','c','d'];
 assert.deepEqual(cyclePlayer(roster,roster,1,1),['a','c','b','d']);
 assert.deepEqual(cyclePlayer(roster,roster,1,-1),['a','d','c','b']);
 assert.equal(validLineup(roster,['a','b','b','d']),false);
 assert.equal(validLineup(roster,['a','b','c','missing']),false);
});
