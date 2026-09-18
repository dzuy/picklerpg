import type {HistoryMatch} from './player-history';
import type {PublicMatch} from './multiplayer/protocol';
export interface ActivityEvent {id:string;at:string;won:boolean;opponent?:string}
export interface ActivityStats {games:number;days:number;opponents:number;dayStreak:number;bestDayStreak:number;weekStreak:number;bestWeekStreak:number;winStreak:number;bestWinStreak:number}
export const MILESTONES=[
 {id:'first-rally',title:'First Rally',icon:'✦',metric:'games',target:1,description:'Complete your first game.'},
 {id:'court-regular',title:'Court Regular',icon:'●',metric:'games',target:10,description:'Complete 10 games.'},
 {id:'rally-regular',title:'Rally Regular',icon:'◆',metric:'games',target:25,description:'Complete 25 games.'},
 {id:'court-mainstay',title:'Court Mainstay',icon:'⬡',metric:'games',target:50,description:'Complete 50 games.'},
 {id:'century-club',title:'Century Club',icon:'✹',metric:'games',target:100,description:'Complete 100 games.'},
 {id:'always-game',title:'Always Game',icon:'★',metric:'games',target:250,description:'Complete 250 games.'},
 {id:'showing-up',title:'Showing Up',icon:'☀',metric:'days',target:10,description:'Play on 10 different days.'},
 {id:'familiar-face',title:'Familiar Face',icon:'☀',metric:'days',target:30,description:'Play on 30 different days.'},
 {id:'court-crew',title:'Court Crew',icon:'✿',metric:'opponents',target:5,description:'Complete games with 5 different opponents.'},
 {id:'three-day',title:'Three-Day Spark',icon:'ϟ',metric:'bestDayStreak',target:3,description:'Play on 3 consecutive days.'},
 {id:'seven-day',title:'Seven-Day Groove',icon:'ϟ',metric:'bestDayStreak',target:7,description:'Play on 7 consecutive days.'},
 {id:'making-time',title:'Making Time',icon:'◷',metric:'bestWeekStreak',target:4,description:'Play during 4 consecutive weeks.'},
 {id:'court-routine',title:'Court Routine',icon:'◷',metric:'bestWeekStreak',target:12,description:'Play during 12 consecutive weeks.'},
 {id:'on-a-roll',title:'On a Roll',icon:'↗',metric:'bestWinStreak',target:3,description:'Win 3 completed games in a row.'},
 {id:'good-run',title:'Good Run',icon:'↗',metric:'bestWinStreak',target:5,description:'Win 5 completed games in a row.'},
] as const;
export type Milestone=typeof MILESTONES[number];
export interface ActivityRewards {stats:ActivityStats;earned:string[];title:string|null}
const DAY=86400000;
function streak(values:number[],today:number){const days=[...new Set(values)].sort((a,b)=>a-b);let run=0,best=0,previous=-Infinity;for(const day of days){run=day===previous+1?run+1:1;best=Math.max(best,run);previous=day;}return {best,current:previous>=today-1?run:0};}
export function activityRewards(events:ActivityEvent[],selected?:string,now=Date.now()):ActivityRewards{
 const unique=new Map<string,ActivityEvent>();for(const event of events)if(Number.isFinite(Date.parse(event.at))&&Date.parse(event.at)<=now)unique.set(event.id,event);
 const ordered=[...unique.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.id.localeCompare(b.id));
 const days=ordered.map(e=>Math.floor(Date.parse(e.at)/DAY)),today=Math.floor(now/DAY);
 // UTC days and Monday-start UTC weeks are shared across devices.
 const daily=streak(days,today),weekly=streak(days.map(d=>Math.floor((d+3)/7)),Math.floor((today+3)/7));
 let wins=0,bestWins=0;for(const e of ordered){wins=e.won?wins+1:0;bestWins=Math.max(bestWins,wins);}
 const stats:ActivityStats={games:ordered.length,days:new Set(days).size,opponents:new Set(ordered.flatMap(e=>e.opponent?[e.opponent]:[])).size,dayStreak:daily.current,bestDayStreak:daily.best,weekStreak:weekly.current,bestWeekStreak:weekly.best,winStreak:wins,bestWinStreak:bestWins};
 const earned=MILESTONES.filter(m=>stats[m.metric]>=m.target).map(m=>m.id);
 const title=selected&&earned.includes(selected as typeof earned[number])?selected:[...MILESTONES].reverse().find(m=>m.metric==='games'&&earned.includes(m.id))?.id??null;
 return {stats,earned,title};
}
export function activityEvents(history:HistoryMatch[],remote:PublicMatch[]):ActivityEvent[]{
 return [...history.filter(g=>!g.ended_early&&g.home_score!==g.away_score).map(g=>({id:g.id,at:g.completed_at,won:g.home_score>g.away_score})),...remote.filter(g=>g.status==='completed'&&!g.endedEarly&&g.completedAt).map(g=>({id:g.id,at:g.completedAt!,won:g.score[g.viewerTeam]>g.score[g.viewerTeam==='home'?'away':'home'],opponent:g.accountIds?.[g.viewerTeam==='home'?'away':'home']??undefined}))];
}
