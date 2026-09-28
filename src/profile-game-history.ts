import type {HistoryMatch} from './player-history';
import type {PublicMatch} from './multiplayer/protocol';
import type {OpenPlayGame} from './persistence/open-play-store';

export interface ProfileGame {id:string;mode:'solo'|'friends';home:string;away:string;score:number;against:number;completedAt:string}
/** Merge account history with browser saves, including archived completed games. */
export function profileGameHistory(history:HistoryMatch[],local:OpenPlayGame[],remote:PublicMatch[]):ProfileGame[]{
 const games=new Map<string,ProfileGame>();
 for(const game of local){
  const c=game.checkpoint;
  if(c.mode!=='solo'||game.ended||!c.scoring.winner)continue;
  games.set(c.matchId,{id:c.matchId,mode:'solo',home:`${c.roster.you.design?.name??'You'} & ${c.roster.partner.design?.name??'Partner'}`,away:`${c.roster['opponent-left'].design?.name??'Opponent 1'} & ${c.roster['opponent-right'].design?.name??'Opponent 2'}`,score:c.scoring.score.home,against:c.scoring.score.away,completedAt:game.updatedAt});
 }
 for(const game of history)if(!game.ended_early&&game.home_score!==game.away_score)games.set(game.id,{id:game.id,mode:'solo',home:game.home_names,away:game.away_names,score:game.home_score,against:game.away_score,completedAt:game.completed_at});
 for(const game of remote){
  if(game.status!=='completed'||game.endedEarly)continue;
  const names=(team:'home'|'away')=>team==='home'?`${game.roster.you.name} & ${game.roster.partner.name}`:`${game.roster['opponent-left'].name} & ${game.roster['opponent-right'].name}`;
  const other=game.viewerTeam==='home'?'away':'home';
  games.set(game.id,{id:game.id,mode:'friends',home:names(game.viewerTeam),away:names(other),score:game.score[game.viewerTeam],against:game.score[other],completedAt:game.completedAt??game.createdAt??''});
 }
 return [...games.values()].sort((a,b)=>b.completedAt.localeCompare(a.completedAt)||a.id.localeCompare(b.id));
}
