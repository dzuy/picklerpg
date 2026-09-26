import {COMMUNITY_CATEGORIES,communityCategorySkills} from '../../src/community-categories';
import {createClient} from '@supabase/supabase-js';
import {createHash,randomBytes} from 'node:crypto';
import {BOT_PERSONAS,botPlayer,botRecord,botActivity} from '../../server/multiplayer/bot-persona';
import {defaultTeam} from '../../src/multiplayer/team-directory';
const args=process.argv.slice(2),option=(name:string)=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const batch=option('--batch'),count=Number(option('--count')??10);
if(!batch||!/^[a-z0-9-]{1,40}$/.test(batch)||!Number.isInteger(count)||count<1||count>200||args.some((a,i)=>i%2===0&&!['--batch','--count','--refresh'].includes(a)))throw Error('Usage: --batch unique-batch-name --count 10 (1–200 accounts)');
const client=createClient(process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const personas=BOT_PERSONAS;
const users=[];
for(let page=1;;page++){const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});if(error)throw error;users.push(...data.users);if(data.users.length<1000)break;}
const dzuy=users.find(u=>u.user_metadata.username==='dzuy');
for(let index=0;index<count;index++){
 const [base,name,partnerName]=personas[index%personas.length];
 let user=users.find(u=>u.app_metadata.community_bot===true&&u.app_metadata.bot_seed_batch===batch&&u.app_metadata.bot_seed_index===index);
 if(!user||option('--refresh')==='true'){
  let username=base;
  if(users.some(u=>u.id!==user?.id&&u.user_metadata.username===username))username=`${base}${parseInt(createHash('sha256').update(`${batch}:${index}`).digest('hex').slice(0,5),16)}`;
  if(users.some(u=>u.id!==user?.id&&u.user_metadata.username===username))throw Error(`Username collision for ${username}; choose another batch name.`);
  const player=botPlayer(name,'starter'),partner=botPlayer(partnerName,'partner');
  player.skills=communityCategorySkills(COMMUNITY_CATEGORIES[(index*2)%COMMUNITY_CATEGORIES.length].id,index);partner.skills=communityCategorySkills(COMMUNITY_CATEGORIES[(index*2+1)%COMMUNITY_CATEGORIES.length].id,index);
  const seedRecord=user?.app_metadata.bot_seed_record??botRecord();
  const metadata={...user?.user_metadata,username,player_name:name,profile_avatar:player.appearance,starter_player:player,open_play_team:[player,partner],open_play_friends:user?.user_metadata.open_play_friends??(dzuy?[dzuy.id]:[])};
  const appMetadata={...user?.app_metadata,multiplayer_playtest:true,community_bot:true,bot_seed_batch:batch,bot_seed_index:index,bot_seed_record:seedRecord,bot_seed_activity:user?.app_metadata.bot_seed_activity??botActivity(seedRecord)};
  const {data,error}=user?await client.auth.admin.updateUserById(user.id,{user_metadata:metadata,app_metadata:appMetadata}):await client.auth.admin.createUser({email:`${username}@community-bots.invalid`,password:randomBytes(48).toString('base64url'),email_confirm:true,user_metadata:metadata,app_metadata:appMetadata});
  if(error||!data.user)throw error??Error('Creation failed');
  const old=users.findIndex(u=>u.id===data.user!.id);user=data.user;if(old>=0)users[old]=user;else users.push(user);
 }
 const team=defaultTeam(user.user_metadata.open_play_team);if(!team)throw Error(`Bot ${user.id} has no valid team`);
 const saved=await client.from('players').upsert(team.map((p,i)=>({...p,owner_id:user!.id,is_active:i===0,is_public:true})),{onConflict:'owner_id,id'});if(saved.error)throw saved.error;
 console.log(`Ready @${user.user_metadata.username} (${team.map(p=>p.name).join(' & ')})`);
}
console.log(`Batch ${batch}: ${count} bot accounts ready.`);
