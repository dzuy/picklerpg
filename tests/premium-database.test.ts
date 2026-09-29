import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {A,B,creation,testers} from './helpers/remote';
import {PREMIUM_APPEARANCE_OPTIONS} from '../src/player-customization-tiers';
import {newPlayer} from '../src/player-design';
import {premiumAppearance} from '../src/premium-appearance';
import {MatchService} from '../server/multiplayer/service';
import {InvitationService} from '../server/multiplayer/invitations';
import {pgInvitations} from './helpers/invitations';
import {randomUUID} from 'node:crypto';
test('membership sources are independent, ordered, time bounded, audited and service-only',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);const repo=new PgRepository(db.pool);
  const active=async()=> (await repo.query("select pack_owned($1,'court') as active",[A])).rows[0].active;
  const provider=(active:boolean,date:string)=>repo.query("select update_pack_provider($1,'revenuecat',$2,$3)",[A,active?['court']:[],date]);
  assert.equal(await active(),false);await provider(true,'2026-09-29');await provider(false,'2026-09-28');assert.equal(await active(),true);
  await repo.query("select grant_pack($1,$2,'court',true,'promotion')",[A,B]);await provider(false,'2026-09-30');assert.equal(await active(),true);
  await repo.query("select grant_pack($1,$2,'court',false,'revoked')",[A,B]);assert.equal(await active(),false);
  assert.equal((await repo.query('select pack_analysis_access($1) as active',[A])).rows[0].active,false);
  assert.equal((await repo.query('select count(*)::int as n from pack_grant_audit')).rows[0].n,2);
  const c=await db.pool.connect();try{await c.query('set role authenticated');for(const query of ['select * from pack_ownership',"select grant_pack($1,$2,'everything',true,'forged')",'update premium_configuration set enforcement_enabled=true'])await assert.rejects(c.query(query,query.includes('$1')?[A,B]:[]),/permission denied/);}finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
test('server enforces host court access, lets free players join, preserves saved cosmetics and matches classification',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);const repo=new PgRepository(db.pool),matches=new MatchService(repo,testers),invites=new InvitationService(pgInvitations(repo),matches,testers);
  assert.deepEqual((await repo.query('select premium_cosmetic_options() as options')).rows[0].options,PREMIUM_APPEARANCE_OPTIONS);
  const p=newPlayer('saved');p.appearance.hat='crown';
  await db.pool.query('insert into players(owner_id,id,name,appearance,skills,handedness) values($1,$2,$3,$4,$5,$6)',[A,p.id,p.name,p.appearance,p.skills,p.handedness]);
  await db.pool.query('update premium_configuration set enforcement_enabled=true');
  await db.pool.query("update players set name='Still saved' where owner_id=$1",[A]);
  assert.equal((await db.pool.query('select appearance from players where owner_id=$1',[A])).rows[0].appearance.hat,'crown');
  assert.deepEqual((await repo.query('select premium_free_appearance($1) as appearance',[p.appearance])).rows[0].appearance,premiumAppearance(p.appearance,false));
  await assert.rejects(db.pool.query("update players set appearance=jsonb_set(appearance,'{hat}','\"tiara\"') where owner_id=$1",[A]),/pack/i);
  const input={requestId:randomUUID(),opponentId:B,team:[creation().roster.you,creation().roster.partner],court:'city',scoring:'rally-doubles',target:3};
  await assert.rejects(invites.create(A,input),/pack/i);
  await repo.query("select grant_pack($1,$1,'court',true,'host')",[A]);
  const invitation=await invites.create(A,input);
  const match=await invites.accept(invitation.id,B,{team:input.team});assert.equal(match.court,'city');
  assert.equal((await repo.query("select pack_owned($1,'court') as active",[B])).rows[0].active,false);
  // Future playtest signups receive no automatic complimentary grant.
  const future=randomUUID();await db.pool.query("insert into auth.users(id,raw_app_meta_data) values($1,'{\"multiplayer_playtest\":true}')",[future]);
  assert.equal((await repo.query("select pack_owned($1,'court') as active",[future])).rows[0].active,false);
 }finally{await db.close();}
});

test('migration captures existing human testers once and preserves analysis-only legacy access',async()=>{
 const human=randomUUID(),bot=randomUUID(),later=randomUUID(),legacy=randomUUID();
 const db=await database(async pool=>{
  for(const [id,metadata,date] of [[human,{multiplayer_playtest:true},'2026-09-29T05:00:00Z'],[bot,{multiplayer_playtest:true,community_bot:true},'2026-09-28'],[later,{multiplayer_playtest:true},'2026-09-30'],[legacy,{full_game_analysis:true},'2026-09-28']])await pool.query('insert into auth.users(id,raw_app_meta_data,created_at) values($1,$2,$3)',[id,metadata,date]);
 });try{
  const rows=(await db.pool.query('select owner_id,source,expires_at from premium_memberships order by source')).rows;
  assert.deepEqual(rows,[{owner_id:human,source:'complimentary',expires_at:null},{owner_id:legacy,source:'legacy_analysis',expires_at:null}]);
  assert.equal((await db.pool.query('select premium_active($1) as full,premium_active($1,true) as analysis',[legacy])).rows[0].full,false);
  assert.equal((await db.pool.query('select pack_analysis_access($1) as analysis',[legacy])).rows[0].analysis,true);
  assert.equal((await db.pool.query("select pack_owned($1,'everything') as owned,pack_analysis_access($1) as analysis",[human])).rows[0].owned,true);
  assert.equal((await db.pool.query("select pack_owned($1,'everything') as owned",[bot])).rows[0].owned,false);
 }finally{await db.close();}
});

test('old clients can register a new free starter without a Premium choice breaking signup',async()=>{
 const db=await database();try{
  await db.pool.query('update premium_configuration set enforcement_enabled=true');
  const player=newPlayer('starter');player.appearance.hat='crown';
  await db.pool.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[A,{username:'newtester',starter_player:player}]);
  const saved=(await db.pool.query('select appearance from players where owner_id=$1',[A])).rows[0].appearance;
  assert.deepEqual(saved,premiumAppearance(player.appearance,false));
 }finally{await db.close();}
});

test('pack sources union independently, bundle scope is fixed, and partial ownership controls snapshots',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const owned=async(pack:string)=>(await db.pool.query('select pack_owned($1,$2) as owned',[A,pack])).rows[0].owned;
  await db.pool.query("select update_pack_provider($1,'revenuecat',array['style'],'2026-09-29')",[A]);
  await db.pool.query("select update_pack_provider($1,'stripe',array['fun'],'2026-09-29')",[A]);
  const p=newPlayer('partial');p.appearance.hat='crown';p.appearance.paddleShape='circular';
  assert.deepEqual((await db.pool.query('select pack_appearance($1,$2) as appearance',[p.appearance,A])).rows[0].appearance,premiumAppearance(p.appearance,['style','fun']));
  await db.pool.query("select update_pack_provider($1,'stripe',array[]::text[],'2026-09-30')",[A]);assert.equal(await owned('style'),true);assert.equal(await owned('fun'),false);
  assert.deepEqual((await db.pool.query('select pack_appearance($1,$2) as appearance',[p.appearance,A])).rows[0].appearance,premiumAppearance(p.appearance,['style']));
  await db.pool.query("select grant_pack($1,$2,'everything',true,'test bundle')",[A,B]);for(const pack of ['style','court','fun','everything'])assert.equal(await owned(pack),true);
  await db.pool.query("insert into pack_catalog values('future')");assert.equal(await owned('future'),false);
  await db.pool.query("select grant_pack($1,$2,'everything',false,'remove gift')",[A,B]);assert.equal(await owned('style'),true);assert.equal(await owned('court'),false);
  assert.equal((await db.pool.query('select pack_analysis_access($1) as access',[A])).rows[0].access,false);
 }finally{await db.close();}
});
