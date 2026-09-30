import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';import {A,B,C,testers,creation} from './helpers/remote';import {MatchService} from '../server/multiplayer/service';import {newPlayer} from '../src/player-design';
test('blocking prevents chat and new games; deletion removes only requested account and shared identity data',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
 const service=new MatchService(new PgRepository(db.pool),testers),match=await service.create(A,creation());
 const p=newPlayer('safety-test');await db.pool.query('insert into players(owner_id,id,name,appearance,skills,handedness,is_public) values($1,$2,$3,$4,$5,$6,true)',[A,p.id,p.name,p.appearance,p.skills,p.handedness]);
 const other=newPlayer('survivor');const otherRow=await db.pool.query('insert into players(owner_id,id,name,appearance,skills,handedness,is_public) values($1,$2,$3,$4,$5,$6,true) returning public_id',[B,other.id,other.name,other.appearance,other.skills,other.handedness]);
 await db.pool.query('insert into community_player_moderation(public_id,hidden_by) values($1,$2)',[otherRow.rows[0].public_id,A]);
 await db.pool.query("insert into pack_ownership(owner_id,source,pack_id,active,observed_at) values($1,'complimentary','fun',true,now())",[B]);
 await db.pool.query("insert into published_player_cards(owner_id,path) values($1,'v2/disposable.png')",[A]);
 assert.equal((await db.pool.query("select clean_player_text('classic shit') as text")).rows[0].text,'classic !@#$%');
 const invitation=randomUUID();await db.pool.query("insert into async_invitations(id,creator_id,recipient_id,team,court,scoring,request_id,request_hash) values($1,$2,$3,$4,'forest','rally-doubles',$5,'test')",[invitation,A,B,JSON.stringify([p,p]),randomUUID()]);
 await db.pool.query('insert into player_blocks(owner_id,blocked_id) values($1,$2)',[A,B]);
 assert.equal((await db.pool.query('select players_blocked($1,$2) as blocked',[B,A])).rows[0].blocked,true);
 await assert.rejects(db.pool.query('select send_match_trash_talk($1,$2,$3,$4)',[match.id,B,randomUUID(),'Hi']),/Contact unavailable/);
 await assert.rejects(service.create(A,{...creation(),creationId:randomUUID()}),/unavailable|Contact/);
 await db.pool.query("update async_invitations set status='cancelled' where id=$1",[invitation]);
 const c=await db.pool.connect();try{await c.query('set role authenticated');await assert.rejects(c.query('insert into player_blocks(owner_id,blocked_id) values($1,$2)',[B,C]),/permission/);await assert.rejects(c.query('select * from player_reports'),/permission/);await assert.rejects(c.query('select cleanup_deleted_account()'),/permission/);}finally{await c.query('reset role');c.release()}
 await db.pool.query('insert into account_deletion_requests(account_id) values($1)',[A]);await db.pool.query('delete from auth.users where id=$1',[A]);
 assert.equal((await db.pool.query('select count(*) from auth.users')).rows[0].count,2);assert.equal((await db.pool.query('select count(*) from async_matches')).rows[0].count,0);assert.equal((await db.pool.query('select count(*) from players where owner_id=$1',[A])).rows[0].count,0);assert.equal((await db.pool.query('select count(*) from players where owner_id=$1',[B])).rows[0].count,1);assert.equal((await db.pool.query('select count(*) from pack_ownership where owner_id=$1',[B])).rows[0].count,1);assert.equal((await db.pool.query('select hidden_by from community_player_moderation')).rows[0].hidden_by,null);assert.equal((await db.pool.query('select count(*) from published_player_cards')).rows[0].count,0);assert.ok((await db.pool.query('select completed_at from account_deletion_requests where account_id=$1',[A])).rows[0].completed_at);
 }finally{await db.close()}
});
