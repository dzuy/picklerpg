import {createClient} from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Configure server credentials.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await db.from('account_deletion_requests').select('account_id,requested_at,completed_at,external_cleanup_completed_at').is('external_cleanup_completed_at',null).order('requested_at').limit(100);if(error)throw Error('Deletion queue unavailable.');
console.log(JSON.stringify(data,null,2));
