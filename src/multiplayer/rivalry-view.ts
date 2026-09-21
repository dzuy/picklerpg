import {parseMatchRivalry,type MatchRivalry,type RivalrySummary} from './rivalry';

export function rivalryData(value:unknown):MatchRivalry|undefined{try{return parseMatchRivalry(value);}catch{return undefined;}}
export function seriesLine(s:RivalrySummary){return s.wins===s.losses?`Series tied ${s.wins}–${s.losses}`:s.wins>s.losses?`You lead ${s.wins}–${s.losses}`:`You trail ${s.wins}–${s.losses}`;}
/** A compact, viewer-relative story for friend cards, based only on known history. */
export function rivalryCardStory(data:MatchRivalry|undefined):string{
 if(!data)return '';
 const s=data.current;
 if(!s)return 'Your rivalry starts with the first game.';
 if(s.games>=3&&s.losses===0)return `You’ve dominated this rivalry ${s.wins}–0.`;
 if(s.games>=3&&s.wins===0)return `They lead ${s.losses}–0. Time for a comeback.`;
 if(s.streak.length>=3)return s.streak.owner==='you'?`You’re on a ${s.streak.length}-game win streak against them.`:`They’re on a ${s.streak.length}-game win streak against you.`;
 if(s.wins===s.losses)return `All square at ${s.wins}–${s.losses}. Who takes the lead?`;
 if(s.games===1)return s.wins?'You took the first game. Keep it going.':'They took the first game. Your rematch awaits.';
 return s.wins>s.losses?`You’re ahead ${s.wins}–${s.losses}. Keep the edge.`:`They’re ahead ${s.losses}–${s.wins}. Close the gap.`;
}
/** One deterministic observation; no tactical or causal inference. */
export function rivalryHeadline(s:RivalrySummary,opponent:string):{key:string;text:string}{
 const won=s.recent[0].result==='win',previousWins=s.wins-(won?1:0),previousLosses=s.losses-(won?0:1);
 if(s.previousStreak&&s.previousStreak.owner!==s.streak.owner&&s.previousStreak.length>=3)return {key:'streak_broken',text:won?`You ended ${opponent}’s ${s.previousStreak.length}-game streak.`:`${opponent} ended your ${s.previousStreak.length}-game streak.`};
 if(s.games>1&&previousWins===previousLosses&&s.wins!==s.losses)return {key:'series_lead',text:won?'You take the series lead.':`${opponent} takes the series lead.`};
 if(s.wins===s.losses)return {key:'series_tied',text:'All square. Next game breaks the tie.'};
 if(s.streak.length>=3)return {key:'streak_extended',text:won?`${s.streak.length} straight wins for you.`:`${opponent} makes it ${s.streak.length} straight.`};
 if(s.milestones.includes(s.games))return {key:'milestone',text:`${s.games} games together. A rivalry worth keeping.`};
 const four=s.recent.slice(0,4);if(four.length===4&&four.filter(r=>r.result==='win').length===2)return {key:'recent_split',text:'Two wins each in your last four games.'};
 return {key:'series_record',text:seriesLine(s)+'.'};
}
function node<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text=''){const el=document.createElement(tag);el.className=cls;el.textContent=text;return el;}
export function rivalryStats(s:RivalrySummary){
 const stats=node('dl','rivalry-stats');
 for(const [label,value] of [['Your series',`${s.wins}–${s.losses}`],['Current streak',`${s.streak.owner==='you'?'You':'Opponent'} · ${s.streak.length}`],['Games together',String(s.games)]]){
  const row=node('div','');row.append(node('dt','',label),node('dd','',value));stats.append(row);
 }
 return stats;
}
export function rivalryProfile(data:MatchRivalry|undefined,opponent:string){
 const section=node('section','rivalry-profile');section.setAttribute('aria-label',`Your rivalry with ${opponent}`);section.append(node('h3','','You vs '+opponent));
 if(!data){section.append(node('p','','Your head-to-head record is unavailable right now.'));return section;}
 const s=data.current;
 if(!s){section.append(node('p','','Your rivalry starts with your first completed game.'));return section;}
 section.append(node('p','rivalry-series',seriesLine(s)),rivalryStats(s));
 const recent=node('ol','rivalry-recent');recent.setAttribute('aria-label','Recent head-to-head results, newest first');
 for(const r of s.recent){const item=node('li',r.result,`${r.result==='win'?'W':'L'} ${r.score.you}–${r.score.opponent}`);item.title=`${new Date(r.completedAt).toLocaleDateString()} · First to ${r.rules.target} · ${r.rules.scoring==='rally-doubles'?'Rally':'Side-out'}`;item.setAttribute('aria-label',`${r.result==='win'?'Win':'Loss'}, ${r.score.you} to ${r.score.opponent}. ${item.title}`);recent.append(item);}
 section.append(recent);return section;
}
