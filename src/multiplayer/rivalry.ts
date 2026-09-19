/** Public account-pair facts only. No roster, checkpoint, shot history, or other rivals. */
export interface RivalryResult {
 matchId:string;completedAt:string;result:'win'|'loss';
 score:{you:number;opponent:number};
 rules:{target:number;winBy:number;scoring:'rally-doubles'|'side-out-doubles'};
}
export interface RivalryStreak {owner:'you'|'opponent';length:number}
export interface RivalrySummary {
 definitionVersion:1;games:number;wins:number;losses:number;
 streak:RivalryStreak;previousStreak:RivalryStreak|null;
 bestStreak:{you:number;opponent:number};
 /** Most recent first. Stable order: completion timestamp, then match ID. */
 recent:RivalryResult[];closest:RivalryResult;milestones:number[];
}
export interface MatchRivalry {current:RivalrySummary|null;atCompletion:RivalrySummary|null}
export const RIVALRY_MILESTONES=[2,3,5,10,25,100] as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function bad():never{throw new Error('Invalid rivalry response.');}
function object(v:unknown,keys:string[]):Record<string,any>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))bad();
 return v as Record<string,any>;
}
function count(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)bad();return v;}
function streak(v:unknown,total:number):RivalryStreak{
 const r=object(v,['owner','length']);if(r.owner!=='you'&&r.owner!=='opponent')bad();
 return {owner:r.owner,length:count(r.length,1,total)};
}
function result(v:unknown):RivalryResult{
 const r=object(v,['matchId','completedAt','result','score','rules']);
 if(typeof r.matchId!=='string'||!UUID.test(r.matchId)||typeof r.completedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(r.completedAt)||!Number.isFinite(Date.parse(r.completedAt))||(r.result!=='win'&&r.result!=='loss'))bad();
 const score=object(r.score,['you','opponent']),rules=object(r.rules,['target','winBy','scoring']);
 if(rules.scoring!=='rally-doubles'&&rules.scoring!=='side-out-doubles')bad();
 const you=count(score.you),opponent=count(score.opponent);
 if(you===opponent||(r.result==='win')!==(you>opponent))bad();
 return {matchId:r.matchId,completedAt:r.completedAt,result:r.result,score:{you,opponent},rules:{target:count(rules.target,1,99),winBy:count(rules.winBy,1,99),scoring:rules.scoring}};
}
export function parseRivalrySummary(value:unknown):RivalrySummary{
 const r=object(value,['definitionVersion','games','wins','losses','streak','previousStreak','bestStreak','recent','closest','milestones']);
 if(r.definitionVersion!==1)bad();
 const games=count(r.games,1),wins=count(r.wins,0,games),losses=count(r.losses,0,games);if(wins+losses!==games)bad();
 const current=streak(r.streak,games),previous=r.previousStreak===null?null:streak(r.previousStreak,games-1);
 if((games===1)!==(previous===null))bad();
 const best=object(r.bestStreak,['you','opponent']);const bestStreak={you:count(best.you,0,wins),opponent:count(best.opponent,0,losses)};
 if(bestStreak[current.owner]<current.length)bad();
 if(!Array.isArray(r.recent)||r.recent.length!==Math.min(games,10))bad();
 const recent=r.recent.map(result);if(new Set(recent.map(x=>x.matchId)).size!==recent.length)bad();
 if((recent[0].result==='win'?'you':'opponent')!==current.owner)bad();
 const milestones=RIVALRY_MILESTONES.filter(n=>n<=games);
 if(!Array.isArray(r.milestones)||JSON.stringify(milestones)!==JSON.stringify(r.milestones))bad();
 return {definitionVersion:1,games,wins,losses,streak:current,previousStreak:previous,bestStreak,recent,closest:result(r.closest),milestones};
}
export function parseMatchRivalry(value:unknown):MatchRivalry{
 const r=object(value,['current','atCompletion']);
 const current=r.current===null?null:parseRivalrySummary(r.current),atCompletion=r.atCompletion===null?null:parseRivalrySummary(r.atCompletion);
 if(atCompletion&&(!current||atCompletion.games>current.games))bad();
 return {current,atCompletion};
}
