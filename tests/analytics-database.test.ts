import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {A,B,creation,testers,action} from './helpers/remote';
import {pgInvitations} from './helpers/invitations';
import {MatchService} from '../server/multiplayer/service';
import {InvitationService} from '../server/multiplayer/invitations';
import {validProductEvent} from '../src/analytics/events';
import {productProperties} from '../src/analytics/privacy';
import {newPlayer} from '../src/player-design';
test('analytics reads committed transitions, retries once, preserves XP, and denies clients',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const repo=new PgRepository(db.pool),matches=new MatchService(repo,testers),invites=new InvitationService(pgInvitations(repo),matches,testers);
  let m=await matches.create(A,creation());const original=m.id;
  for(let n=0;n<600&&m.status!=='completed';n++){const actor=m.currentTeam==='home'?A:B;m=await matches.get(m.id,actor);const request=action(m,n);m=(await matches.act(m.id,actor,request)).state;if(n===0)await matches.act(m.id,actor,request);}
  assert.equal(m.status,'completed');
  const count=async(event:string)=>Number((await db.pool.query('select count(*) from product_analytics_events where event=$1',[event])).rows[0].count);
  assert.equal(await count('match_completed'),2,'one completion per human, not per reload or retry');
  assert.equal(await count('account_created'),2);assert.equal(await count('xp_earned'),2);
  const turns=Number((await db.pool.query('select count(*) from async_match_actions')).rows[0].count);assert.equal(await count('shot_selected'),turns);assert.equal(await count('turn_completed'),turns);
  const pending=await invites.rematch(original,A,'automatic');await invites.rematch(original,A,'automatic');assert.equal(await count('rematch_auto_requested'),1);assert.equal(await count('rematch_started'),0);
  await invites.rematch(original,A,'manual');assert.equal(await count('rematch_auto_requested'),1);assert.equal(await count('rematch_manual_requested'),0);
  await invites.rematch(original,B,'accept');await invites.rematch(original,B,'accept');assert.equal(await count('rematch_accepted'),2);assert.equal(await count('rematch_started'),2);
  const rematch=(await db.pool.query("select properties from product_analytics_events where event='rematch_started' limit 1")).rows[0].properties;assert.equal(rematch.original_match_id,original);assert.equal(rematch.rematch_match_id,pending.invitationId);assert.equal(rematch.manual_vs_auto,'automatic');
  const player=newPlayer('Analytics fixture');
  await db.pool.query('insert into players(owner_id,id,name,appearance,skills,handedness) values($1,$2,$3,$4,$5,$6)',[A,player.id,player.name,player.appearance,player.skills,player.handedness]);
  assert.equal(await count('player_created'),1);
  const reduced={...player.skills,movement:player.skills.movement-10};
  await db.pool.query('update players set skills=$1 where owner_id=$2 and id=$3',[reduced,A,player.id]);
  await db.pool.query('update players set skills=$1 where owner_id=$2 and id=$3',[player.skills,A,player.id]);
  assert.equal(await count('skill_points_reallocated'),1);assert.equal(await count('skill_point_allocated'),1);
  await db.pool.query(`update auth.users set raw_app_meta_data='{"full_game_analysis":true}' where id=$1`,[A]);
  await db.pool.query(`update auth.users set raw_app_meta_data='{"full_game_analysis":true}' where id=$1`,[A]);
  await db.pool.query(`update auth.users set raw_app_meta_data='{}' where id=$1`,[A]);
  assert.equal(await count('plus_entitlement_changed'),2,'only actual trusted entitlement changes are recorded');
  const all=(await db.pool.query('select * from product_analytics_events order by occurred_at,event_id')).rows;
  assert.equal(new Set(all.map(r=>r.event_id)).size,all.length);
  for(const r of all){assert.ok(r.actor_id);assert.ok(validProductEvent(r.event,r.properties),r.event);assert.deepEqual(productProperties(r.properties),r.properties,'only allowlisted scalar facts leave the database');}
  // Timestamps tied by one transaction must not be dropped by pagination.
  const page=(await repo.query('select *,occurred_at::text as cursor_time from product_analytics_page($1,$2,$3,$4,$5)',['2000-01-01','2100-01-01',null,null,1])).rows;
  const next=(await repo.query('select *,occurred_at::text as cursor_time from product_analytics_page($1,$2,$3,$4,$5)',['2000-01-01','2100-01-01',page[0].cursor_time,page[0].event_id,1000])).rows;assert.equal(page.length+next.length,all.length);
  const connection=await db.pool.connect();try{await connection.query('set role authenticated');await assert.rejects(connection.query('select * from product_analytics_events'),/permission denied/);await assert.rejects(connection.query('select * from product_analytics_page(now(),now(),null,null)'),/permission denied/);}finally{await connection.query('reset role');connection.release();}
 }finally{await db.close();}
});
