import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {ADMIN_OWNER_ID} from '../server/multiplayer/admin-owner';
import {A,B,testers,creation} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
import {newPlayer} from '../src/player-design';
test('archiving retains data, revokes sessions, hides discovery and blocks stale-token table/RPC access and new contact',async()=>{
 const db=await database(async pool=>{
  await pool.query("alter table auth.users add column updated_at timestamptz not null default now(),add column banned_until timestamptz;create table auth.sessions(id uuid primary key,user_id uuid references auth.users);create table auth.refresh_tokens(id int primary key,session_id uuid references auth.sessions on delete cascade);create role authenticator;create table storage.objects(id uuid);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;create policy test_allow on storage.objects for all to authenticated using(true) with check(true);");
 });try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[ADMIN_OWNER_ID,A,B]);
  const p=newPlayer('archive-player'),row=await db.pool.query('insert into players(owner_id,id,name,appearance,skills,handedness,is_public) values($1,$2,$3,$4,$5,$6,true) returning public_id',[A,p.id,p.name,p.appearance,p.skills,p.handedness]);
  const publicId=row.rows[0].public_id,stamp=(await db.pool.query('select updated_at::text from auth.users where id=$1',[A])).rows[0].updated_at;
  await db.pool.query("insert into published_player_cards(owner_id,path) values($1,'v2/retained.png')",[A]);await db.pool.query("insert into pack_ownership(owner_id,source,pack_id,active,observed_at) values($1,'complimentary','fun',true,now())",[A]);
  await db.pool.query('insert into auth.sessions(id,user_id) values($1,$2)',[A,A]);await db.pool.query('insert into auth.refresh_tokens values(1,$1)',[A]);
  const service=new MatchService(new PgRepository(db.pool),testers);await service.create(A,creation());
  const before=(await db.pool.query('select count(*) from async_matches')).rows[0].count;
  await assert.rejects(db.pool.query('select archive_admin_account($1,$2,$3)',[ADMIN_OWNER_ID,ADMIN_OWNER_ID,stamp]),/protected/);
  await assert.rejects(db.pool.query('select archive_admin_account($1,$2,$3)',[A,B,stamp]),/protected/);
  await assert.rejects(db.pool.query('select archive_admin_account($1,$2,$3)',[A,ADMIN_OWNER_ID,'2000-01-01']),/changed/);
  await db.pool.query('select archive_admin_account($1,$2,$3)',[A,ADMIN_OWNER_ID,stamp]);
  const archived=(await db.pool.query('select * from auth.users where id=$1',[A])).rows[0];assert.ok(archived.raw_app_meta_data.account_archived_at);assert.ok(archived.banned_until);
  assert.equal((await db.pool.query('select count(*) from auth.sessions')).rows[0].count,0);assert.equal((await db.pool.query('select count(*) from auth.refresh_tokens')).rows[0].count,0);
  for(const [table,column] of [['players','owner_id'],['published_player_cards','owner_id'],['pack_ownership','owner_id']])assert.equal((await db.pool.query(`select count(*) from ${table} where ${column}=$1`,[A])).rows[0].count,1);
  assert.equal((await db.pool.query('select count(*) from async_matches')).rows[0].count,before);
  assert.equal((await db.pool.query('select * from community_player_catalog() where public_id=$1',[publicId])).rows.length,0);
  assert.equal((await db.pool.query('select community_player_is_available($1) as available',[publicId])).rows[0].available,false);
  await assert.rejects(service.create(A,{...creation(),creationId:B}),/unavailable|Contact/);
  const client=await db.pool.connect();try{
   await client.query('set role authenticated');await client.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);
   await assert.rejects(client.query('select require_active_account()'),/unavailable/);
   assert.equal((await client.query('select * from players')).rows.length,0);
   await assert.rejects(client.query('insert into storage.objects values($1)',[A]),/row-level security/);
   await assert.rejects(client.query('select archive_admin_account($1,$2,$3)',[B,ADMIN_OWNER_ID,stamp]),/permission/);
   await client.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);await client.query('select require_active_account()');
  }finally{await client.query('reset role');client.release();}
  await db.pool.query('select archive_admin_account($1,$2,$3)',[A,ADMIN_OWNER_ID,stamp]);assert.equal((await db.pool.query('select count(*) from account_archives')).rows[0].count,1);
  assert.match((await db.pool.query("select rolconfig::text from pg_roles where rolname='authenticator'")).rows[0].rolconfig,/require_active_account/);
 }finally{await db.close();}
});
