import type {ShotMixRow} from '../../server/multiplayer/shot-mix';
import {loadStrategy} from '../../server/multiplayer/strategy';
import EmbeddedPostgres from 'embedded-postgres';
import {Pool,types,type PoolClient} from 'pg';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import type {CommitInput,MatchRepository,StoredMatch,StoredReceipt} from '../../server/multiplayer/repository';
// Versions are constrained to JS safe integers by the production schema.
types.setTypeParser(20,value=>Number(value));
export async function database(){
 const probe=createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve)});const port=(probe.address() as {port:number}).port;await new Promise<void>(resolve=>probe.close(()=>resolve()));
 const directory=await mkdtemp(join(tmpdir(),'pickle-remote-pg-'));
 const server=new EmbeddedPostgres({databaseDir:join(directory,'db'),user:'postgres',password:'local-test-only',port,persistent:true,postgresFlags:['-h','127.0.0.1','-k',directory],onLog:()=>{},onError:()=>{}});
 await server.initialise();await server.start();
 const connections=new Set<PoolClient>();
 function makePool(){
  const value=new Pool({host:'127.0.0.1',port,user:'postgres',password:'local-test-only',database:'postgres'});
  value.on('connect',client=>{connections.add(client);client.once('end',()=>connections.delete(client));});
  return value;
 }
 let pool=makePool();
 async function drain(){
  // pg-pool removes clients before their sockets finish closing. Wait for their
  // end events before SIGINT, so restart cannot terminate a still-closing client.
  const closed=[...connections].map(client=>new Promise<void>(resolve=>client.once('end',resolve)));
  await pool.end();await Promise.all(closed);
 }
 await pool.query("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to anon,authenticated,service_role;");
 for(const name of (await readdir(new URL('../../supabase/migrations/',import.meta.url))).sort())await pool.query(await readFile(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'));
 return {get pool(){return pool},async restart(){await drain();await server.stop();await server.start();pool=makePool();},async close(){await drain();await server.stop();await rm(directory,{recursive:true,force:true});}};
}
/** Test adapter exercises the exact production SQL functions using independent connections. */
export class PgRepository implements MatchRepository {
 constructor(private pool:Pool){}
 async shotMixPage(actor:string,before:string,cursorTime:string|null,cursorId:string|null){return (await this.query('select public.get_async_shot_mix_page($1,$2,$3,$4) as value',[actor,before,cursorTime,cursorId])).rows[0].value as ShotMixRow[];}
 async strategy(id:string,actor:string){return loadStrategy(async(name,args)=>{const values=Object.values(args);return (await this.query(`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) as value`,values)).rows[0].value;},id,actor);}
 async rivalries(actor:string,matchIds:string[]){return (await this.query('select public.get_async_rivalries($1,$2) as value',[actor,matchIds])).rows[0].value as Record<string,unknown>;}
 async setArchived(id:string,actor:string,archived:boolean){await this.query('select public.set_async_match_archived($1,$2,$3)',[id,actor,archived]);}
 async query(sql:string,args:unknown[]=[]){const c=await this.pool.connect();try{await c.query('set role service_role');return await c.query(sql,args);}finally{await c.query('reset role');c.release();}}
 async get(id:string,actor:string){const r=await this.query('select * from public.async_matches where id=$1 and $2 in (home_user_id,away_user_id)',[id,actor]);return r.rows[0] as StoredMatch??null;}
 async list(actor:string){return (await this.query('select * from public.async_matches where $1 in (home_user_id,away_user_id)',[actor])).rows as StoredMatch[];}
 async receipt(id:string,actionId:string){return (await this.query('select * from public.async_match_actions where match_id=$1 and action_id=$2',[id,actionId])).rows[0] as StoredReceipt??null;}
 async create(row:StoredMatch){return (await this.query('select public.create_async_test_match($1) as value',[row])).rows[0].value as StoredMatch;}
 async commit(i:CommitInput){return (await this.query('select public.commit_async_match_action($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as value',[i.match.id,i.actor,i.actionId,i.hash,i.expectedVersion,i.match.checkpoint,i.match.current_action_user_id,i.match.status,i.match.last_result,JSON.stringify(i.match.animation),i.action,i.selection??null])).rows[0].value as StoredReceipt;}
}
