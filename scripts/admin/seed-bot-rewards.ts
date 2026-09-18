import {createClient} from '@supabase/supabase-js';
import {botActivity} from '../../server/multiplayer/bot-persona';
import {activityRewards,MILESTONES} from '../../src/activity-rewards';
const client=createClient(process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
let index=0;
for(let page=1;;page++){
 const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});if(error)throw error;
 for(const user of data.users){
  if(user.app_metadata.community_bot!==true||!user.app_metadata.bot_seed_record)continue;
  const events=user.app_metadata.bot_seed_activity??botActivity(user.app_metadata.bot_seed_record);
  const rewards=activityRewards(events),options=MILESTONES.filter(m=>rewards.earned.includes(m.id));
  const title=user.user_metadata.activity_title??options[index++%options.length]?.id;
  const updated=await client.auth.admin.updateUserById(user.id,{app_metadata:{...user.app_metadata,bot_seed_activity:events},user_metadata:{...user.user_metadata,activity_title:title}});if(updated.error)throw updated.error;
  console.log(`${user.user_metadata.username}: ${title} (${rewards.earned.length} badges)`);
 }if(data.users.length<1000)break;
}
