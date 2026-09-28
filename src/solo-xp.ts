import type {PlayerState} from './engine/model';
import {simulatedDupr} from './engine/simulated-dupr';

/** Compare the actual lineup, including custom players and archetypes. */
export function soloXpDifficulty(players:readonly Pick<PlayerState,'team'|'skills'>[]):'normal'|'hard'|'expert'{
 const rating=(team:'home'|'away')=>{
  const members=players.filter(player=>player.team===team);
  if(!members.length)throw new Error('Solo XP requires both teams.');
  // Integer tenths keep exact half-point thresholds stable.
  return members.reduce((sum,player)=>sum+Math.round(simulatedDupr(player.skills)*10),0)/members.length;
 };
 const gap=rating('away')-rating('home');
 return gap>=10?'expert':gap>=5?'hard':'normal';
}
