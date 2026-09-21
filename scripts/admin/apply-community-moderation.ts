import {Client} from 'pg';
import {readFile} from 'node:fs/promises';
const connectionString=process.env.SUPABASE_DB_URL;
if(!connectionString)throw new Error('Set SUPABASE_DB_URL in .env.local first.');
const client=new Client({connectionString});
try{
 await client.connect();
 const match=await client.query("select u.id from auth.users u join public.usernames n on n.user_id=u.id where n.username='dzuy' and lower(u.email)='dzuylinh@gmail.com' and u.raw_app_meta_data->>'community_admin'='true'");
 if(match.rowCount!==1)throw new Error('Could not verify the intended admin account in this database.');
 await client.query('begin');
 await client.query("select pg_advisory_xact_lock(hashtext('picklebash-community-moderation'))");
 const exists=await client.query("select to_regprocedure('public.remove_player_from_community(uuid)') is not null as installed");
 if(!exists.rows[0].installed){
  const sql=await readFile(new URL('../../supabase/migrations/202609210001_community_moderation.sql',import.meta.url),'utf8');
  await client.query(sql);
  const tracking=await client.query("select to_regclass('supabase_migrations.schema_migrations') is not null as installed");
  if(tracking.rows[0].installed)await client.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3) on conflict(version) do nothing',['202609210001','community_moderation',[sql]]);
 }
 await client.query('commit');
 console.log('Community moderation migration installed in the verified account database.');
}catch(error){await client.query('rollback').catch(()=>{});console.error(error instanceof Error?error.message:'Migration failed');process.exitCode=1;}finally{await client.end();}
