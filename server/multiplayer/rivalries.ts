import {parseMatchRivalry,type MatchRivalry} from '../../src/multiplayer/rivalry';

/** Whitelist and orient a private pair summary. The public parser validates every value. */
export function publicRivalry(value:unknown):MatchRivalry {
 if(!value||typeof value!=='object'||typeof (value as any).viewerIsLow!=='boolean')throw new Error('Invalid rivalry projection.');
 const row=value as any,low=row.viewerIsLow;
 const owner=(v:unknown)=>v==='low'?(low?'you':'opponent'):v==='high'?(low?'opponent':'you'):undefined;
 const result=(r:any)=>({matchId:r?.matchId,completedAt:r?.completedAt,result:owner(r?.winner)==='you'?'win':owner(r?.winner)==='opponent'?'loss':undefined,
  score:{you:low?r?.scoreLow:r?.scoreHigh,opponent:low?r?.scoreHigh:r?.scoreLow},
  rules:{target:r?.rules?.target,winBy:r?.rules?.winBy,scoring:r?.rules?.scoring}});
 const streak=(s:any)=>s===null?null:{owner:owner(s?.owner),length:s?.length};
 const summary=(s:any)=>s===null?null:{definitionVersion:s?.definitionVersion,games:s?.games,wins:low?s?.winsLow:s?.winsHigh,losses:low?s?.winsHigh:s?.winsLow,
  streak:streak(s?.streak),previousStreak:streak(s?.previousStreak),bestStreak:{you:low?s?.bestLow:s?.bestHigh,opponent:low?s?.bestHigh:s?.bestLow},
  recent:Array.isArray(s?.recent)?s.recent.map(result):undefined,closest:result(s?.closest),milestones:s?.milestones};
 return parseMatchRivalry({current:summary(row.current),atCompletion:summary(row.atCompletion)});
}
