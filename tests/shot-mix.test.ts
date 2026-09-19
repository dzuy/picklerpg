import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {personalShotMix,shotMixFilter,type ShotMixRow} from '../server/multiplayer/shot-mix';
import {reduceStrategy,type StrategyEvent} from '../server/multiplayer/strategy';
import {selectionOpportunity} from '../server/multiplayer/selection-events';
import {Match} from '../src/match';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,creation,action,testers,MemoryRepository} from './helpers/remote';
function summary(){const m=new Match();m.startLocalHumanMatch(creation().roster);const c=selectionOpportunity(m);const base=m.targetingMenu[0].intent;
 const events:StrategyEvent[]=Array.from({length:4},(_,i)=>{const intent={...base,type:i%2?'drop' as const:'drive' as const};return {action_id:randomUUID(),to_version:i+1,chooser_id:A,team:'home',point_index:0,intent,engine_version:'test',athlete_design_id:i%2?'partner':'you',completeness:'complete',capture:{...c,completedContacts:i,offered:[{intent,timing:null},{intent:{...intent,type:'drive'},timing:null},{intent:{...intent,type:'drive'},timing:'air'}],execution:{selectedShotExecuted:true,contactOrdinal:i+1,terminalContactOrdinal:null,terminalIntent:null,pointResult:null}}};});
 return reduceStrategy({revision:0,expected:4,events},A);
}
test('filters reject actor overrides, duplicates and malformed scope',()=>{for(const q of ['userId='+B,'scope=recent&scope=lifetime','scope=forever','opponent=bad','stage=kitchen'])assert.throws(()=>shotMixFilter(new URLSearchParams(q)));assert.equal(shotMixFilter(new URLSearchParams()).scope,'recent');});
test('athlete summaries preserve opportunity denominators and third-shot contexts',()=>{const s=summary();assert.equal(s.athletes.you.selections,2);assert.equal(s.athletes.partner.selections,2);assert.equal(s.athletes.you.families.drive.eligible,2);assert.equal(s.stages.third.drive.selectedWhenEligible,1);assert.equal(s.stages.third.drive.eligible,1);});
test('recent windows do not overlap; weighted totals, month, opponent and athlete filters match sources',async()=>{
 const now=new Date('2026-09-18T12:00:00Z'),s=summary(),rows:ShotMixRow[]=Array.from({length:55},(_,i)=>({id:String(i),completed_at:new Date(+now-i*86400000).toISOString(),opponent_id:i%2?B:C,engine_version:'test',rules:{target:3,winBy:1,scoring:'rally-doubles'},athletes:{you:'You',partner:'Partner'},summary:s}));
 class Repo extends MemoryRepository {async shotMixPage(actor:string,before:string,time:string|null,id:string|null){assert.equal(actor,A);const start=id===null?0:Number(id)+1;return rows.slice(start,start+50);}async strategy(){throw Error('Should use cached summaries');}}
 const repo=new Repo();
 const recent=await personalShotMix(repo,A,{scope:'recent',stage:'all'},testers,now);assert.equal(recent.totals.matches,10);assert.equal(recent.previous.matches,10);assert.equal(recent.totals.selections,40);assert.equal(recent.totals.families.drive.eligible,40);assert.equal(recent.totals.families.drive.selectedWhenEligible,20);
 const life=await personalShotMix(repo,A,{scope:'lifetime',stage:'third',athlete:'you',opponent:B},testers,now);assert.equal(life.totals.matches,27);assert.equal(life.totals.selections,27);assert.equal(life.totals.families.drive.eligible,27);
 const month=await personalShotMix(repo,A,{scope:'month',stage:'all'},testers,now);assert.equal(month.totals.matches,31);
 rows[0].summary=null;const partial=await personalShotMix(repo,A,{scope:'recent',stage:'all'},testers,now);assert.equal(partial.totals.matches,10);assert.equal(partial.totals.available,9);assert.equal(partial.totals.selections,36);
});
test('private page excludes other users, active games and early exits; owner can rebuild old summaries',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);const repo=new PgRepository(db.pool),service=new MatchService(repo,testers);let game=await service.create(A,creation());
 assert.equal((await repo.shotMixPage(A,new Date().toISOString(),null,null)).length,0);
 for(let n=0;n<600&&game.status!=='completed';n++){const owner=game.currentTeam==='home'?A:B;game=await service.get(game.id,owner);game=(await service.act(game.id,owner,action(game,n))).state;}
 assert.equal(game.status,'completed');
 const own=await service.shotMix(A,new URLSearchParams('scope=lifetime'));assert.equal(own.totals.matches,1);assert.equal(own.totals.selections,(await repo.strategy(game.id,A))!.selections);
 assert.equal((await service.shotMix(C,new URLSearchParams())).totals.matches,0);
 const rows=await repo.shotMixPage(A,new Date().toISOString(),null,null);assert.equal(rows.length,1);for(const key of ['checkpoint','capture','events','resolution_secret'])assert.equal(JSON.stringify(rows).includes('"'+key+'"'),false);
 await db.pool.query("update public.async_match_strategies set definition_version='strategy-1' where match_id=$1",[game.id]);assert.equal((await service.shotMix(A,new URLSearchParams())).totals.available,1);
 const early=await service.create(A,creation());await repo.query('select public.leave_async_match($1,$2)',[early.id,A]);assert.equal((await service.shotMix(A,new URLSearchParams())).totals.matches,1);
 const c=await db.pool.connect();try{await c.query('set role authenticated');await assert.rejects(c.query('select public.get_async_shot_mix_page($1,now())',[A]),/permission denied/);}finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
