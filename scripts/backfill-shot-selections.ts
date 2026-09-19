import {createClient} from '@supabase/supabase-js';

// Run only against the intended server database; never use a browser credential.
const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
let total=0;
for(;;){
 const {data,error}=await client.rpc('backfill_shot_selections',{p_limit:1000});
 if(error)throw new Error(`Shot-event backfill failed (${error.code}); rerun to resume.`);
 if(!Number.isSafeInteger(data)||data<0)throw new Error('Invalid backfill response.');
 total+=data;
 console.log(`Backfilled ${total} selection events.`);
 if(data===0)break;
}
