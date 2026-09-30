import {createClient} from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Configure server credentials.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const reportId=process.argv.find(x=>x.startsWith('--review='))?.slice(9);
if(reportId){
 if(!/^[1-9][0-9]*$/.test(reportId))throw Error('Use a valid report id.');
 const {data:report,error}=await db.from('player_reports').select('id,public_id').eq('id',reportId).maybeSingle();if(error||!report)throw Error('Report unavailable.');
 if(!process.argv.includes('--execute')){console.log('Report exists. No changes made. Use --execute after reviewing the private evidence.');process.exit(0)}
 if(process.argv.includes('--hide-player')){if(!report.public_id)throw Error('This report has no Community player. Review the account separately.');const {error}=await db.from('community_player_moderation').upsert({public_id:report.public_id,hidden_by:null},{onConflict:'public_id',ignoreDuplicates:true});if(error)throw Error('Could not hide this player.');}
 const {error:updated}=await db.from('player_reports').update({reviewed_at:new Date().toISOString()}).eq('id',reportId);if(updated)throw Error('Could not mark this report reviewed.');console.log('Report reviewed.');
}else{
 const {data,error}=await db.from('player_reports').select('id,created_at,reason,details,evidence,target_id,public_id').is('reviewed_at',null).order('created_at').limit(100);if(error)throw Error('Reports unavailable.');
 // Private operator output: never copy reports or their content into analytics or public docs.
 console.log(JSON.stringify(data,null,2));
}
