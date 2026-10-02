import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/postgres';
// @ts-ignore release generator
import {auditReleaseSql} from '../scripts/admin/audit-release-sql.mjs';
test('audited snapshot upgrade is atomic, version tracked and a no-op on repeat',async()=>{
 const db=await database(async pool=>{
  await pool.query("create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations values('202609290006','account_safety',array['fixture']),('20260929182826','remote_schema',array['fixture']),('202609300001','community_creator_usernames',array['fixture']);");
 },'20261001999999');
 try{
  const sql=await auditReleaseSql(),client=await db.pool.connect();
  try{
   assert.equal((await client.query("select to_regclass('public.roster_change_receipts') as value")).rows[0].value,null);
   await client.query(sql);
   const first=(await client.query('select * from supabase_migrations.schema_migrations order by version')).rows;
   assert.equal(first.length,9);
   assert.ok((await client.query("select to_regprocedure('public.apply_roster_change(jsonb)') as value")).rows[0].value);
   await client.query(sql);
   assert.deepEqual((await client.query('select * from supabase_migrations.schema_migrations order by version')).rows,first);
   await client.query("update supabase_migrations.schema_migrations set name='different' where version='202610020001'");
   await assert.rejects(client.query(sql),/checksum\/name differs/);await client.query('rollback');
  }finally{client.release();}
 }finally{await db.close();}
});
