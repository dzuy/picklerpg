import type {HistoryMatch} from './player-history';
import type {PublicMatch} from './multiplayer/protocol';
import type {OpenPlayGame} from './persistence/open-play-store';

/** Completed games only; cloud and browser copies of a solo game count once. */
export function profileRecord(history:HistoryMatch[],local:OpenPlayGame[],remote:PublicMatch[]){
 const results=new Map<string,boolean>();
 for(const game of local){
  const c=game.checkpoint;
  if(c.mode==='solo'&&!game.ended&&c.scoring.winner)results.set(c.matchId,c.scoring.winner==='home');
 }
 for(const game of history)if(!game.ended_early&&game.home_score!==game.away_score)results.set(game.id,game.home_score>game.away_score);
 for(const game of remote)if(game.status==='completed'&&!game.endedEarly)results.set(game.id,game.score[game.viewerTeam]>game.score[game.viewerTeam==='home'?'away':'home']);
 const wins=[...results.values()].filter(Boolean).length;
 return {games:results.size,wins,losses:results.size-wins};
}
