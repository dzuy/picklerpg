import test from 'node:test';
import assert from 'node:assert/strict';
import {recentOpponents} from '../src/multiplayer/recent-opponents';
import type {PublicMatch} from '../src/multiplayer/protocol';
import type {LobbyTeam} from '../src/multiplayer/team-directory';
test('recent opponents are newest first, unique, current, and account scoped',()=>{
 const teams=['a','b','c'].map(id=>({id,manager:id})) as LobbyTeam[];
 const game=(id:string,date:string,extra:Partial<PublicMatch>={})=>({viewerTeam:'home',accountIds:{home:'me',away:id},createdAt:date,...extra}) as PublicMatch;
 const games=[game('a','2026-09-01'),game('b','2026-09-03'),game('a','2026-09-04'),game('gone','2026-09-05'),game('c','2026-09-06',{friendState:'pending'}),game('c','2026-09-07',{accountIds:{home:'other',away:'c'}})];
 assert.deepEqual(recentOpponents(games,teams,'me').map(t=>t.id),['a','b']);
 assert.deepEqual(recentOpponents(games,teams,'me',1).map(t=>t.id),['a']);
 assert.deepEqual(recentOpponents(games,teams,'different'),[]);
});
