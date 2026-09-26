import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {A,B,C,creation,testers} from './helpers/remote';
import {newPlayer} from '../src/player-design';
import {MatchService} from '../server/multiplayer/service';
const config=JSON.parse(readFileSync(new URL('../src/xp-config.json',import.meta.url),'utf8'));
test('account XP economy, security, transactions, streaks, activation and idempotency',async()=>{
 const db=await database();try{
 const q=(sql:string,args:unknown[]=[])=>db.pool.query(sql,args);
 await q('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
 assert.deepEqual((await q('select config from xp_config')).rows[0].config,config);
 async function as(actor:string,sql:string,args:unknown[]=[]){const c=await db.pool.connect();try{await c.query('begin');await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);const r=await c.query(sql,args);await c.query('commit');return r;}catch(e){await c.query('rollback');throw e;}finally{c.release()}}
 const progress=async(actor=A)=>(await as(actor,'select my_skill_progress() as p')).rows[0].p;
 assert.equal((await progress()).currentSkillBudget,35);
 for(const [xp,budget] of [[0,35],[99,35],[100,36],[199,36],[200,37],[799,42],[800,43],[10000,43]])assert.equal((await q('select xp_budget($1) as budget',[xp])).rows[0].budget,budget);
 await assert.rejects(as(A,"select grant_xp($1,'fake','solo',999)",[A]),/permission denied/);
 await assert.rejects(as(A,'update account_xp set lifetime_xp=999'),/permission denied/);
 for(let i=0;i<5;i++){
 const p=newPlayer('XP player');p.id='xp-'+i;
 await as(A,'insert into players(owner_id,id,name,appearance,skills,handedness) values($1,$2,$3,$4,$5,$6)',[A,p.id,p.name,p.appearance,p.skills,p.handedness]);
 await as(A,'delete from players where id=$1',[p.id]);
 }
 assert.equal((await progress()).lifetimeXp,15);assert.equal((await progress()).lifetimePlayerCreationXpAwards,3);
 const solo=async(id:string,difficulty:string,home=11,away=4,early=false,target=11)=>as(A,'select record_solo_xp($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,'Home','Away',home,away,early,'[]',difficulty,target]);
 for(const [difficulty,[complete,win]] of Object.entries(config.solo) as [string,number[]][]){
 const id=randomUUID();await Promise.all([solo(id,difficulty),solo(id,difficulty)]);
 const e=(await q('select * from xp_events where game_id=$1',[id])).rows[0];assert.equal(e.final_xp,complete+win);assert.equal(e.difficulty,difficulty);
 const loss=randomUUID();await solo(loss,difficulty,4,11);assert.equal((await q('select final_xp from xp_events where game_id=$1',[loss])).rows[0].final_xp,complete);
 }
 const early=randomUUID();await solo(early,'normal',4,2,true);await solo(early,'expert');assert.equal((await q('select * from xp_events where game_id=$1',[early])).rowCount,0);
 await assert.rejects(solo(randomUUID(),'normal',4,2),/Incomplete/);
 await assert.rejects(solo(randomUUID(),'invalid'),/Invalid/);
 await solo(randomUUID(),'normal',5,2,false,5);
 for(const [day,mult] of [[2,1.25],[3,1.5],[4,1.5],[5,1.75],[6,1.75],[7,2],[8,2]]){
 await q("update account_xp set current_play_streak=$2,last_eligible_game_completion_date=(now() at time zone 'UTC')::date-1 where account_id=$1",[A,day-1]);
 const id=randomUUID();await solo(id,'expert');const e=(await q('select * from xp_events where game_id=$1',[id])).rows[0];assert.equal(Number(e.streak_multiplier),mult);assert.equal(e.final_xp,Math.round(24*mult));
 }
 await q("update account_xp set last_eligible_game_completion_date=(now() at time zone 'UTC')::date-3 where account_id=$1",[A]);
 assert.equal((await progress()).currentPlayStreak,0);await solo(randomUUID(),'normal');assert.equal((await progress()).currentPlayStreak,1);
 const service=new MatchService(new PgRepository(db.pool),testers);
 await service.create(A,creation());
 await q("update async_matches set status='completed',current_action_user_id=null,completed_at=now(),winner_user_id=home_user_id,ended_by=home_user_id");
 assert.equal((await q("select * from xp_events where game_type='friends'")).rowCount,0,'early Friends exits earn nothing');
 await service.create(A,creation());
 await q(`update auth.users set raw_app_meta_data='{"community_bot":true}' where id=$1`,[B]);
 await q("update async_matches set status='completed',current_action_user_id=null,completed_at=now(),winner_user_id=home_user_id where status='active'");
 assert.equal((await q("select * from xp_events where game_type='friends'")).rowCount,1,'human earns XP against a community bot');
 await q("update auth.users set raw_app_meta_data='{}' where id=$1",[B]);
 await service.create(A,creation());
 await q("update async_matches set status='completed',current_action_user_id=null,completed_at=now(),winner_user_id=home_user_id");
 assert.equal((await q("select final_xp from xp_events where account_id=$1 and game_type='friends'",[A])).rows[0].final_xp,14);
 assert.equal((await q("select final_xp from xp_events where account_id=$1 and game_type='friends'",[B])).rows[0].final_xp,10);
 await q("update async_matches set completed_at=now()");assert.equal((await q("select * from xp_events where game_type='friends'")).rowCount,3);
 const matchId=(await q("select game_id as id from xp_events where game_type='friends' limit 1")).rows[0].id;
 await q('update auth.users set is_anonymous=true where id=$1',[B]);
 await q("insert into friend_challenges(id,match_id,token,inviter_id,inviter_name,invited_name,request_id,request_hash) values($1,$2,$3,$4,'Inviter','Friend',$5,'hash')",[randomUUID(),matchId,'a'.repeat(43),C,randomUUID()]);
 await q("update friend_challenges set status='accepted',claimed_user_id=$1,recipient_is_guest=true where match_id=$2",[B,matchId]);
 assert.equal((await progress(C)).lifetimeXp,0,'claiming as a guest is not account activation');
 await q('update auth.users set is_anonymous=false where id=$1',[B]);
 await q('select activate_invite_xp($1)',[B]);await q('select activate_invite_xp($1)',[B]);
 assert.equal((await progress(C)).lifetimeXp,50);
 assert.equal((await q("select * from xp_analytics where event='invite_xp_awarded'")).rowCount,2);
 await q("select grant_xp($1,'large','migration',1000)",[A]);assert.equal((await progress()).currentSkillBudget,43);
 assert.ok((await q("select skill_points_earned from xp_events where account_id=$1 and event_key='large'",[A])).rows[0].skill_points_earned>1);
 const lifetime=(await progress()).lifetimeXp;await solo(randomUUID(),'normal');assert.equal((await progress()).lifetimeXp,lifetime+10);assert.equal((await progress()).currentSkillBudget,43);
 assert.equal((await as(B,'select * from xp_events where account_id=$1',[A])).rowCount,0);
 const conn=await db.pool.connect();try{await conn.query('set role service_role');const metrics=await conn.query('select * from xp_account_metrics where account_id=$1',[A]);assert.ok(metrics.rows[0].streak_bonus_xp>0);assert.equal((await conn.query('select * from xp_budget_milestones where account_id=$1',[A])).rowCount,8);}finally{await conn.query('reset role');conn.release();}
 await db.restart();assert.equal((await progress()).currentSkillBudget,43);
 }finally{await db.close()}
});
