import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {A,B,C,creation,testers} from './helpers/remote';
import {newPlayer} from '../src/player-design';
import {SKILLS} from '../src/engine/model';
import {normalizeSkillBudget,usedSkillPoints,allocateArea} from '../src/skill-budget';
import {MatchService} from '../server/multiplayer/service';

test('database enforces account/public budgets, protects rewards, and freezes editable community copies',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
 async function as(actor:string,sql:string,args:unknown[]=[]){const c=await db.pool.connect();try{await c.query('begin');await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);const r=await c.query(sql,args);await c.query('commit');return r;}catch(e){await c.query('rollback');throw e;}finally{c.release();}}
 assert.equal((await as(A,'select my_skill_budget() as budget')).rows[0].budget,35);
 await assert.rejects(as(A,'select account_skill_budget($1)',[B]),/permission denied/);
 await db.pool.query('update auth.users set raw_user_meta_data=$2 where id=$1',[A,{skill_points:45}]);
 assert.equal((await as(A,'select my_skill_budget() as budget')).rows[0].budget,35);
 const player=newPlayer('budget-test'),maxed=Object.fromEntries(SKILLS.map(k=>[k,100]));
 const insert=(owner:string,skills:unknown)=>as(owner,'insert into players(owner_id,id,name,appearance,skills,handedness,is_public) values($1,$2,$3,$4,$5,$6,true) returning public_id',[owner,player.id,player.name,player.appearance,skills,player.handedness]);
 await assert.rejects(insert(A,maxed),/budget/);
 const {rows:[row]}=await insert(A,player.skills),id=row.public_id;
 await assert.rejects(as(A,'update players set published_skills=$1 where id=$2',[maxed,player.id]),/Community builds/);
 await as(B,'insert into community_player_selections(owner_id,public_id) values($1,$2)',[B,id]);
 const changed=allocateArea(allocateArea(player.skills,'Speed',5),'Power',9);
 await as(B,'select save_community_skills($1,$2)',[id,changed]);
 assert.equal((await as(B,'select * from community_player_catalog()')).rows[0].player.skills.drive,90);
 assert.equal((await as(C,'select * from community_player_catalog()')).rows[0].player.skills.drive,70);
 await assert.rejects(as(B,'select save_community_skills($1,$2)',[id,maxed]),/budget/);
 await assert.rejects(as(C,'select save_community_skills($1,$2)',[id,changed]),/roster first/);
 await as(A,"update players set name='Edited source',skills=$1 where id=$2",[changed,player.id]);
 assert.equal((await as(B,'select * from community_player_catalog()')).rows[0].player.name,player.name);
 const service=new MatchService(new PgRepository(db.pool),testers);
 for(let i=0;i<10;i++)await service.create(A,creation());
 assert.equal((await as(A,'select my_skill_budget() as budget')).rows[0].budget,35,'active games earn nothing');
 await db.pool.query("update async_matches set status='completed',current_action_user_id=null,completed_at=now(),winner_user_id=home_user_id");
 assert.equal((await as(A,'select my_skill_budget() as budget')).rows[0].budget,36);
 assert.equal((await as(B,'select my_skill_budget() as budget')).rows[0].budget,36,'losses also count');
 const progress=(await as(A,'select my_skill_progress() as progress')).rows[0].progress;assert.equal(progress.nextAt,20);assert.equal(progress.games,10);
 await db.pool.query('update async_matches set ended_by=$1',[A]);
 assert.equal((await as(A,'select my_skill_progress() as progress')).rows[0].progress.games,0,'early exits earn nothing');
 await db.pool.query('update async_matches set ended_by=null');
 const higher=allocateArea(changed,'Speed',6,36);assert.equal(usedSkillPoints(higher),36);
 await as(B,'select save_community_skills($1,$2)',[id,higher]);
 await as(A,'delete from players where id=$1',[player.id]);
 assert.equal((await as(B,'select * from community_player_catalog()')).rows[0].player.skills.movement,60,'copy survives source deletion');
 for(let i=0;i<95;i++)await service.create(A,creation());
 await db.pool.query("update async_matches set status='completed',current_action_user_id=null,completed_at=now(),winner_user_id=home_user_id");
 const capped=(await as(A,'select my_skill_progress() as progress')).rows[0].progress;
 assert.equal(capped.budget,45);assert.equal(capped.nextAt,null);assert.equal(capped.games,105);
 for(let i=0;i<30;i++){const skills=Object.fromEntries(SKILLS.map(k=>[k,Math.floor(Math.random()*101)])) as typeof player.skills;const sql=(await db.pool.query('select normalize_skill_budget($1,35) as skills',[skills])).rows[0].skills;assert.deepEqual(sql,normalizeSkillBudget(skills));}
 }finally{await db.close();}
});
