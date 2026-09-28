import {createClient} from '@supabase/supabase-js';
import {open} from 'node:fs/promises';

const args=process.argv.slice(2);
if(args.includes('--help')){console.log('Export private gameplay as JSONL: --out FILE [--since ISO_DATE]. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Existing files are never overwritten.');process.exit(0);}
for(let i=0;i<args.length;i+=2)if(!['--out','--since'].includes(args[i])||!args[i+1])throw new Error('Use --out FILE [--since ISO_DATE].');
const option=(key:string)=>{const index=args.indexOf(key);return index<0?undefined:args[index+1]};
const output=option('--out'),since=option('--since');
if(!output)throw new Error('--out is required.');
if(since&&!Number.isFinite(Date.parse(since)))throw new Error('--since must be an ISO date.');
const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),cutoff=new Date().toISOString();
const file=await open(output,'wx');let count=0;
try{
 await file.write(JSON.stringify({kind:'export',schemaVersion:1,cutoff,since:since??null,includes:'completed rallies; incomplete games may be present; account IDs omitted'})+'\n');
 for(let offset=0;;){
  let query=client.from('gameplay_rallies').select('source,game_id,point_index,definition_version,record,first_received_at,updated_at').eq('record->>complete','true').lte('first_received_at',cutoff).order('source').order('owner_id').order('game_id').order('point_index').range(offset,offset+499);
  if(since)query=query.gte('first_received_at',new Date(since).toISOString());
  const {data,error}=await query;if(error)throw new Error(`Gameplay export failed (${error.code}); output is partial.`);
  if(!data?.length)break;
  for(const row of data){await file.write(JSON.stringify({kind:'rally',...row})+'\n');count++;}
  offset+=data.length;
 }
 await file.write(JSON.stringify({kind:'export-complete',rallies:count})+'\n');
 console.log(`Exported ${count} completed rallies to ${output}.`);
}finally{await file.close();}
