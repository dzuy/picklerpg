import {createClient} from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
let afterLow:string|null=null,afterHigh:string|null=null,total=0;
for(;;){
 const {data,error}=await client.rpc('rebuild_async_rivalries',{p_after_low:afterLow,p_after_high:afterHigh,p_limit:25});
 if(error)throw new Error(`Rivalry rebuild failed (${error.code}); rerun to resume safely.`);
 if(!data||!Number.isSafeInteger(data.processed)||data.processed<0||data.processed>25)throw new Error('Invalid rivalry rebuild response.');
 if(data.processed===0)break;
 if(typeof data.afterLow!=='string'||typeof data.afterHigh!=='string'||(data.afterLow===afterLow&&data.afterHigh===afterHigh))throw new Error('Invalid rivalry rebuild cursor.');
 afterLow=data.afterLow;afterHigh=data.afterHigh;total+=data.processed;
 console.log(`Rebuilt ${total} account pairs.`);
}
console.log(`Rivalry rebuild complete: ${total} account pairs.`);
