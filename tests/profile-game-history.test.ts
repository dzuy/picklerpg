import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {profileGameHistory} from '../src/profile-game-history';
import type {HistoryMatch} from '../src/player-history';
import type {OpenPlayGame} from '../src/persistence/open-play-store';
import type {PublicMatch} from '../src/multiplayer/protocol';

const saved:HistoryMatch={id:'solo',home_names:'You & Partner',away_names:'A & B',home_score:11,away_score:4,completed_at:'2026-09-20'};
function local():OpenPlayGame{const checkpoint=new Match().exportCheckpoint();checkpoint.matchId='solo';checkpoint.scoring.winner='home';checkpoint.scoring.score={home:11,away:4};return {checkpoint,court:'forest',updatedAt:'2026-09-19',archived:true,ended:false};}
const remote={id:'friends',status:'completed',viewerTeam:'away',score:{home:4,away:11},completedAt:'2026-09-21',archived:true,roster:{you:{name:'A'},partner:{name:'B'},'opponent-left':{name:'C'},'opponent-right':{name:'D'}}} as PublicMatch;

test('history deduplicates solo copies, includes archived games, and sorts newest first',()=>{
 const games=profileGameHistory([saved],[local()],[remote]);
 assert.deepEqual(games.map(g=>[g.id,g.mode]),[['friends','friends'],['solo','solo']]);
 assert.equal(games[1].completedAt,saved.completed_at);
 assert.deepEqual([games[0].home,games[0].score,games[0].against],['C & D',11,4]);
});
test('history excludes unfinished, ended early, and shared-device games',()=>{
 const active=local();active.checkpoint.scoring.winner=null;
 const shared=local();shared.checkpoint.mode='local-human';
 assert.deepEqual(profileGameHistory([{...saved,ended_early:true}],[active,shared,{...local(),ended:true}],[{...remote,status:'active'},{...remote,endedEarly:true}]),[]);
});
test('local-only completed games preserve scores with fallback player names',()=>{
 const [game]=profileGameHistory([],[local()],[]);
 assert.equal(game.id,'solo');assert.equal(game.mode,'solo');assert.equal(game.score,11);assert.equal(game.against,4);assert.ok(game.home.length);
});
