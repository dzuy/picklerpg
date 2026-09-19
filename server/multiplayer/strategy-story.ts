import {publicStrategy} from '../../src/multiplayer/strategy';
import {parseStrategyStory,type StrategyStory,type StoryWindow} from '../../src/multiplayer/strategy-story';
import type {ShotMixRow} from './shot-mix';
import type {MatchRepository} from './repository';
const size=4;
const order=(a:ShotMixRow,b:ShotMixRow)=>Date.parse(b.completed_at)-Date.parse(a.completed_at)||b.id.localeCompare(a.id);
const cohort=(r:ShotMixRow)=>JSON.stringify([r.engine_version,r.rules.scoring,r.rules.target,r.rules.winBy,Object.keys(r.athletes).sort()]);
function bounds(k:number,n:number){const z=1.96,d=1+z*z/n,c=(k/n+z*z/(2*n))/d,h=z*Math.sqrt(k/n*(1-k/n)/n+z*z/(4*n*n))/d;return [c-h,c+h];}
function candidate(rows:ShotMixRow[]):StrategyStory|null {
 if(rows.length<8)return null;const sample=rows.slice(0,8);
 if(sample.some(r=>cohort(r)!==cohort(sample[0])||!r.summary?.coverage.complete))return null;
 const stories:StrategyStory[]=[];
 for(const family of ['drop','drive'] as const){
  const metrics=sample.map(r=>publicStrategy(r.summary!).stages.third[family]);
  if(metrics.some(m=>m.selectedWhenEligible>m.eligible))return null;
  const sum=(start:number):StoryWindow=>({matches:sample.slice(start,start+size).map(r=>({id:r.id,completedAt:r.completed_at})),selected:metrics.slice(start,start+size).reduce((s,m)=>s+m.selectedWhenEligible,0),eligible:metrics.slice(start,start+size).reduce((s,m)=>s+m.eligible,0)});
  const recent=sum(0),previous=sum(4);if(recent.eligible<10||previous.eligible<10)continue;
  // Require context across multiple games, and the same direction after removing
  // any single game: one unusual result cannot create the observation.
  if([0,4].some(start=>metrics.slice(start,start+4).filter(m=>m.eligible>0).length<3))continue;
  const delta=100*(recent.selected/recent.eligible-previous.selected/previous.eligible);if(Math.abs(delta)<15)continue;
  if(metrics.some((m,i)=>{const w=i<4?recent:previous,n=w.eligible-m.eligible;if(n<=0)return true;const rate=(w.selected-m.selectedWhenEligible)/n;return Math.sign(i<4?rate-previous.selected/previous.eligible:recent.selected/recent.eligible-rate)!==Math.sign(delta);}))continue;
  const a=bounds(recent.selected,recent.eligible),b=bounds(previous.selected,previous.eligible);
  // Conservative screening, not an inferential or causal claim: opportunities
  // within games are dependent and these are two predeclared descriptive metrics.
  if(!(a[0]>b[1]||b[0]>a[1]))continue;
  stories.push(parseStrategyStory({definitionVersion:'rivalry-story-1',key:`third-${family}`,direction:delta>0?'more':'less',recent,previous,percentagePointChange:delta,relativeChange:previous.selected?delta/(100*previous.selected/previous.eligible):null,language:'observation',coverage:'complete'}));
 }
 return stories.sort((a,b)=>Math.abs(b.percentagePointChange)-Math.abs(a.percentagePointChange)||a.key.localeCompare(b.key))[0]??null;
}
/** Newest first, no gaps skipped to manufacture comparable windows. */
export function selectStrategyStory(history:ShotMixRow[],matchId:string):StrategyStory|null {
 if(new Set(history.map(r=>r.id)).size!==history.length)throw Error('Duplicate story history');
 const rows=[...history].sort(order);if(rows[0]?.id!==matchId)return null;
 const story=candidate(rows);if(!story)return null;
 // Deterministic three-completion cooldown, rebuilt from historical candidates.
 for(let i=1;i<=3;i++){const prior=candidate(rows.slice(i));if(prior?.key===story.key&&prior.direction===story.direction)return null;}
 return story;
}
export async function loadStrategyStory(repo:MatchRepository,actor:string,matchId:string,opponent:string,completedAt:string):Promise<StrategyStory|null>{
 if(!repo.shotMixPage||!repo.strategy)return null;
 const rows:ShotMixRow[]=[];let cursor:ShotMixRow|undefined;const seen=new Set<string>();
 // Bounded work; if older evidence lies beyond this cap, simply omit the story.
 for(let page=0;page<10;page++){
  const batch=await repo.shotMixPage(actor,completedAt,cursor?.completed_at??null,cursor?.id??null);if(!batch.length)break;
  for(const row of batch){if(seen.has(row.id))throw Error('Duplicate story page');seen.add(row.id);
   if(Date.parse(row.completed_at)>Date.parse(completedAt)||row.completed_at===completedAt&&row.id>matchId||row.opponent_id!==opponent)continue;
   rows.push({...row,summary:row.summary?publicStrategy(row.summary):await repo.strategy(row.id,actor)});if(rows.length===11)break;
  }
  if(rows.length===11||batch.length<50)break;cursor=batch.at(-1);
 }
 return selectStrategyStory(rows,matchId);
}
