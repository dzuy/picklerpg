import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './helpers/postgres';

test('release inspection runs read-only and reports ledger, schema and RPC permissions',async()=>{
 const db=await database(async pool=>{
  await pool.query("create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]); insert into supabase_migrations.schema_migrations values('202609280001','gameplay_records',array['fixture only']);");
 });
 try{
  const client=await db.pool.connect();
  try{
   const sql=await readFile(new URL('../scripts/admin/inspect-audit-release.sql',import.meta.url),'utf8');
   const results=await client.query(sql) as unknown as Array<{rows:Record<string,unknown>[]} >;
   assert.equal(results[1].rows[0].read_only,'on');
   assert.equal(results[2].rows[0].name,'gameplay_records');
   assert.equal(results[2].rows[0].statement_count,1);
   const functions=results[5].rows;
   const summary=functions.find(row=>String(row.signature).startsWith('list_match_summaries('))!;
   assert.equal(summary.anon_execute,false);assert.equal(summary.authenticated_execute,false);assert.equal(summary.service_execute,true);
   assert.equal((await client.query('select count(*) from supabase_migrations.schema_migrations')).rows[0].count,1);
   assert.equal((await client.query("select current_setting('transaction_read_only') as value")).rows[0].value,'off');
  }finally{client.release();}
 }finally{await db.close();}
});
