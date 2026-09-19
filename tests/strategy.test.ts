import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Match} from '../src/match';
import {publicStrategy} from '../src/multiplayer/strategy';
import {reduceStrategy,type StrategyEvent} from '../server/multiplayer/strategy';
import {selectionOpportunity} from '../server/multiplayer/selection-events';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,creation,testers,action} from './helpers/remote';
function fixture(){
 const m=new Match();m.startLocalHumanMatch(creation().roster);const before=selectionOpportunity(m),intent=m.targetingMenu[0].intent;
 function event(version:number,owner:string,executed:boolean,terminal=false):StrategyEvent{
  const chosen={...intent,actor:owner===A?'you' as const:'opponent-left' as const,type:version===1?'serve' as const:'return' as const};
  return {action_id:randomUUID(),to_version:version,chooser_id:owner,team:owner===A?'home':'away',point_index:0,intent:chosen,engine_version:'test',completeness:'complete',capture:{...before,completedContacts:version-1,offered:[{intent:chosen,timing:null},{intent:chosen,timing:'bounce'}],execution:{selectedShotExecuted:executed,contactOrdinal:executed?version:null,terminalContactOrdinal:terminal?(executed?version:version-1):null,terminalIntent:terminal?intent:null,pointResult:terminal?{winner:'home',reason:'missed-swing'}:null}}};
 }
 return {event};
}
test('opportunities deduplicate menu variants; missed reply associates the preceding contact, not the selected reply',()=>{
 const {event}=fixture(),events=[event(1,A,true),event(2,B,false,true)];
 const a=reduceStrategy({revision:1,expected:2,events},A),b=reduceStrategy({revision:1,expected:2,events},B);
 assert.equal(a.families.serve.eligible,1);assert.equal(a.families.serve.selectedWhenEligible,1);assert.equal(a.families.serve.terminalPointsWon,1);
 assert.equal(b.selections,1);assert.equal(b.executed,0);assert.equal(b.families.return.terminalPointsLost,0);
 assert.deepEqual(a.rallies,{sample:1,averageContacts:1,longestContacts:1});assert.equal(a.coverage.complete,true);
 assert.deepEqual(reduceStrategy({revision:99,expected:2,events:[...events].reverse()},A),a);
 assert.throws(()=>reduceStrategy({revision:1,expected:2,events:[events[0],events[0]]},A));
});
test('incomplete history keeps selected counts but excludes context metrics and broken point chains',()=>{
 assert.equal(reduceStrategy({revision:0,expected:3,events:[]},A).executed,null);
 const {event}=fixture(),first=event(1,A,true),last=event(2,B,false,true);first.capture=null;first.completeness='selected_only';
 const a=reduceStrategy({revision:1,expected:3,events:[first,last]},A);
 assert.equal(a.selections,1);assert.equal(a.executed,null);assert.equal(a.families.serve.eligible,0);assert.equal(a.stages.unknown.serve.selected,1);assert.equal(a.coverage.complete,false);assert.equal(a.rallies.sample,0);
 const projected=publicStrategy(Object.assign(a,{opponentSecret:'private'}));assert.equal('opponentSecret' in projected,false);
});
test('point boundaries do not combine adjacent rallies',()=>{
 const {event}=fixture(),first=event(1,A,true,true),second=event(2,B,true,true);second.point_index=1;second.capture!.pointIndex=1;second.capture!.completedContacts=0;second.capture!.execution.contactOrdinal=1;second.capture!.execution.terminalContactOrdinal=1;
 const a=reduceStrategy({revision:0,expected:2,events:[first,second]},A);assert.equal(a.rallies.sample,2);assert.equal(a.rallies.longestContacts,1);
});
test('completed summaries persist per chooser, rebuild deterministically, reject stale writes and unauthorized reads',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
 const repo=new PgRepository(db.pool),service=new MatchService(repo,testers);let game=await service.create(A,creation());
 assert.equal(await repo.strategy(game.id,A),null);
 for(let n=0;n<600&&game.status!=='completed';n++){const owner=game.currentTeam==='home'?A:B;game=await service.get(game.id,owner);game=(await service.act(game.id,owner,action(game,n))).state;}
 assert.equal(game.status,'completed');assert.equal(game.strategy,undefined);assert.ok((await service.list(A)).every(m=>m.strategy===undefined));
 const a=(await service.get(game.id,A)).strategy!,b=(await service.get(game.id,B)).strategy!;
 assert.ok(a&&b);assert.equal(a.selections+b.selections,game.version);assert.equal(a.coverage.complete,true);
 const cached=await repo.query('select public.get_async_strategy_source($1,$2,$3) as value',[game.id,A,'strategy-2']);assert.deepEqual(cached.rows[0].value,{summary:a});
 const source=(await repo.query('select public.get_async_strategy_source($1,$2,$3) as value',[game.id,A,'rebuild'])).rows[0].value;
 assert.deepEqual(reduceStrategy(source,A),a);assert.deepEqual(await repo.strategy(game.id,A),a);
 await assert.rejects(repo.strategy(game.id,C));
 await db.pool.query("update public.shot_selection_events set completeness='selected_only',capture=null where match_id=$1 and to_version=1",[game.id]);
 const saved=await repo.query('select public.save_async_strategy($1,$2,$3,$4) as value',[game.id,A,source.revision,a]);assert.equal(saved.rows[0].value,false);
 assert.equal((await repo.strategy(game.id,A))!.coverage.complete,false);
 await db.pool.query('delete from public.shot_selection_events where match_id=$1 and to_version=1',[game.id]);assert.equal((await repo.strategy(game.id,A))!.coverage.recordedSelections,game.version-1);
 const working=repo.strategy.bind(repo);repo.strategy=async()=>{throw Error('offline');};assert.equal((await service.get(game.id,A)).strategy,undefined);repo.strategy=working;
 const c=await db.pool.connect();try{await c.query('set role authenticated');await assert.rejects(c.query('select * from public.async_match_strategies'),/permission denied/);await assert.rejects(c.query('select public.get_async_strategy_source($1,$2,$3)',[game.id,A,'strategy-2']),/permission denied/);}finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
