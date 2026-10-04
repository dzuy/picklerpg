import type {SupabaseClient} from '@supabase/supabase-js';
import {PgRepository} from './postgres';

/** Local-only Supabase-shaped boundary; runs the production RPCs with service-role permissions. */
export function chatPreviewDatabase(repo:PgRepository,names:Map<string,string>):SupabaseClient {
 const run=async(sql:string,args:unknown[]=[])=>{try{return {data:(await repo.query(sql,args)).rows,error:null}}catch(error){return {data:null,error}}};
 const tables=new Set(['async_matches','player_blocks','player_reports']);
 const identifier=(s:string)=>{if(!/^[a-z_]+$/.test(s))throw Error('Invalid preview identifier');return '"'+s+'"'};
 return {
  rpc:async(name:string,args:Record<string,unknown>)=>{const r=await run(`select public.${identifier(name)}(${Object.values(args).map((_,i)=>'$'+(i+1)).join(',')}) as value`,Object.values(args));return {data:r.data?.[0]?.value,error:r.error}},
  auth:{admin:{getUserById:async(id:string)=>({data:{user:names.has(id)?{id,user_metadata:{username:names.get(id)}}:null},error:null})}},
  from:(table:string)=>{
   if(!tables.has(table))throw Error('Unsupported preview table');
   let columns='*',deleting=false;const conditions:Array<[string,unknown]>=[];
   const query=()=>run(`${deleting?'delete from':'select '+columns+' from'} public.${identifier(table)}${conditions.length?' where '+conditions.map(([k],i)=>identifier(k)+'=$'+(i+1)).join(' and '):''}`,conditions.map(([,v])=>v));
   const q={
    select(value:string){columns=value.split(',').map(identifier).join(',');return q},
    eq(key:string,value:unknown){conditions.push([key,value]);return q},
    delete(){deleting=true;return q},
    async maybeSingle(){const r=await query();return {data:r.data?.[0]??null,error:r.error}},
    then(resolve:any,reject:any){return query().then(resolve,reject)},
    insert(row:Record<string,unknown>){return run(`insert into public.${identifier(table)}(${Object.keys(row).map(identifier).join(',')}) values(${Object.keys(row).map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row))},
    upsert(row:Record<string,unknown>){return run(`insert into public.${identifier(table)}(${Object.keys(row).map(identifier).join(',')}) values(${Object.keys(row).map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing`,Object.values(row))},
   };return q;
  },
 } as unknown as SupabaseClient;
}
