import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Explicit incremental release over the inspected production snapshot. This is
// not a claim that the snapshot's older migrations have individual ledger rows.
export async function auditReleaseSql(){
 const fingerprints={
  'capture_gameplay_early_end()':'28862e90861ddee1b3f90cbe301d6c9f',
  'capture_gameplay_record()':'1f7358e24da21cabe4a1c5daabd99aad',
  'claim_rematch_countdown(uuid,uuid)':'a7762e1b56f30552d1b1f6097fcf2d08',
  'create_async_rematch(uuid,uuid,jsonb)':'5536f18fcfcb4f5ed49dc0967eeb0fdd',
  'enforce_player_skill_budget()':'5b966816902b284e697fd556c9ddbfd8',
  'record_solo_gameplay(jsonb)':'18e47fe0a9ce4c1479971917035dee08',
  'store_gameplay_record(text,uuid,jsonb,bigint)':'049db57c79d2724d75a128853550e5ed',
 };
 const quote=value=>"'"+value.replaceAll("'","''")+"'";
 const checks=Object.entries(fingerprints).map(([signature,hash])=>`if not exists(select 1 from pg_proc where oid=to_regprocedure(${quote('public.'+signature)}) and md5(regexp_replace(prosrc,'[[:space:]]+',' ','g'))=${quote(hash)}) then raise exception 'Installed function differs: ${signature}';end if;`).join('\n');
 const baseline=[['202609280001','gameplay_records'],['20260928000101','rematch_intent'],['202610010001','admin_user_actions'],['20261001000101','curated_community_skills']].map(([version,name])=>`
 if exists(select 1 from supabase_migrations.schema_migrations where version='${version}' and name is distinct from '${name}') then raise exception 'Version ${version} belongs to another migration';end if;
 insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array['-- Existing schema verified October 2, 2026; reconciled without replaying DDL. See docs/AUDIT-RELEASE-2026-10-02.md.']) on conflict(version) do nothing;`).join('\n');
 const migrations=[];
 for(const [version,name] of [['202610020001','roster_changes'],['202610020002','match_summaries']]){
  const source=await readFile(new URL(`../../supabase/migrations/${version}_${name}.sql`,import.meta.url),'utf8');
  if(!/^begin;\s/i.test(source)||! /commit;\s*$/i.test(source))throw Error('Expected explicit migration transaction');
  const body=source.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'');
  migrations.push(`if exists(select 1 from supabase_migrations.schema_migrations where version='${version}') then
 if not exists(select 1 from supabase_migrations.schema_migrations where version='${version}' and name='${name}' and statements=array[${quote(source)}]) then raise exception 'Migration ${version} checksum/name differs';end if;
else
 execute ${quote(body)};
 insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${quote(source)}]);
end if;`);
 }
 return `begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(hashtext('picklebash-audit-release-20261002'));
do $release$
begin
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20260929182826' and name='remote_schema') then raise exception 'Expected production schema snapshot missing';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='202609300001' and name='community_creator_usernames') then raise exception 'Expected username migration missing';end if;
 ${checks}
 if not exists(select 1 from pg_class where oid=to_regclass('public.admin_user_actions') and relrowsecurity)
 or not exists(select 1 from pg_class where oid=to_regclass('public.gameplay_rallies') and relrowsecurity)
 or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='async_invitations' and column_name='rematch_manual')
 or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='async_matches' and column_name='rematch_countdown_seen')
 then raise exception 'Required installed schema missing';end if;
 ${baseline}
 ${migrations.join('\n')}
end $release$;
commit;
select version,name from supabase_migrations.schema_migrations where version in ('202609280001','20260928000101','202610010001','20261001000101','202610020001','202610020002') order by version;
`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)process.stdout.write(await auditReleaseSql());
