export interface MatchParticipant {player_id:string;name:string;team:'home'|'away'}
export interface HistoryMatch {id:string;home_names:string;away_names:string;home_score:number;away_score:number;ended_early?:boolean;completed_at:string;participants?:MatchParticipant[]|null}
export function playerHistory(matches:HistoryMatch[],id:string){
 const entries=matches.flatMap(match=>{const player=match.participants?.find(p=>p.player_id===id);if(!player)return [];
  const score=player.team==='home'?match.home_score:match.away_score,against=player.team==='home'?match.away_score:match.home_score;
  return [{...match,score,against,result:match.ended_early?'Ended early':score>against?'Win':'Loss'}];});
 const completed=entries.filter(e=>!e.ended_early),wins=completed.filter(e=>e.result==='Win').length;
 return {entries,games:completed.length,wins,losses:completed.length-wins};
}
