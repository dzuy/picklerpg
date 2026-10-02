import type {MatchSummary} from './protocol';
import type {LobbyTeam} from './team-directory';
/** Deduplicate by account, newest game first, using current directory names. */
export function recentOpponents(games:MatchSummary[],teams:LobbyTeam[],owner:string,limit=5){
 const directory=new Map(teams.map(team=>[team.id,team]));const seen=new Set<string>();const result:LobbyTeam[]=[];
 const time=(game:MatchSummary)=>Date.parse(game.completedAt??game.createdAt??'')||0;
 for(const game of [...games].sort((a,b)=>time(b)-time(a))){
  if(game.accountIds?.[game.viewerTeam]!==owner||game.friendState==='pending'||game.friendState==='cancelled')continue;
  const id=game.accountIds?.[game.viewerTeam==='home'?'away':'home'];
  if(!id||id===owner||seen.has(id))continue;
  const team=directory.get(id);if(!team)continue;
  seen.add(id);result.push(team);if(result.length>=limit)break;
 }
 return result;
}
