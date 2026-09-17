import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {profileRecord} from '../src/profile-record';
import type {HistoryMatch} from '../src/player-history';
import type {OpenPlayGame} from '../src/persistence/open-play-store';
import type {PublicMatch} from '../src/multiplayer/protocol';
const history=(id:string,win:boolean,ended_early=false):HistoryMatch=>({id,home_names:'A',away_names:'B',home_score:win?11:5,away_score:win?5:11,ended_early,completed_at:'2026-09-17'});
function local(id:string,winner:'home'|'away'|null,ended=false):OpenPlayGame{const checkpoint=new Match().exportCheckpoint();checkpoint.matchId=id;checkpoint.scoring.winner=winner;return {checkpoint,court:'forest',updatedAt:'2026-09-17',archived:true,ended};}
const remote=(id:string,viewerTeam:'home'|'away',status='completed')=>({id,viewerTeam,status,score:{home:3,away:1}} as PublicMatch);
test('profile counts archived completions and deduplicates synced solo games',()=>{
 assert.deepEqual(profileRecord([history('solo',true),history('cloud',false)],[local('solo','home'),local('browser','away')],[remote('online','away'),remote('home','home')]),{games:5,wins:2,losses:3});
});
test('profile excludes unfinished, ended-early and shared-device games',()=>{
 const shared=local('shared','home');shared.checkpoint.mode='local-human';
 assert.deepEqual(profileRecord([history('ended-cloud',true,true)],[local('active',null),local('ended',null,true),shared],[remote('active-online','home','active')]),{games:0,wins:0,losses:0});
});
test('new players have an empty record',()=>assert.deepEqual(profileRecord([],[],[]),{games:0,wins:0,losses:0}));
