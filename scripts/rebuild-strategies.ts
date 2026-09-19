import {createClient} from '@supabase/supabase-js';
import {loadStrategy} from '../server/multiplayer/strategy';
const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
let after:string|undefined,total=0;
for(;;){
 let query=client.from('async_matches').select('id,home_user_id,away_user_id').eq('status','completed').is('ended_by',null).not('away_user_id','is',null).order('id').limit(50);if(after)query=query.gt('id',after);
 const {data,error}=await query;if(error)throw Error(`Strategy scan failed (${error.code}).`);if(!data.length)break;
 for(const row of data){for(const actor of [row.home_user_id,row.away_user_id])await loadStrategy(async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error)throw Error(`Strategy rebuild failed (${error.code}); rerun safely.`);return data;},row.id,actor,true);after=row.id;total++;}
 console.log(`Rebuilt ${total} matches.`);
}
console.log(`Strategy rebuild complete: ${total} matches.`);
