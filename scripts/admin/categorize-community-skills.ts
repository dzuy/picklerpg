import {skillsAtCommunityRating,communityCategory,CURATED_COMMUNITY_BUDGET} from '../../src/community-categories';
import {createClient} from '@supabase/supabase-js';
import {writeFile,readFile} from 'node:fs/promises';
import {fitsSkillBudget} from '../../src/skill-budget';
import {summarizeSkills} from '../../src/player-skill-summary';
import type {PlayerSkills} from '../../src/engine/model';

const client=createClient(process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const planPath=process.argv[2];
if(!planPath)throw new Error('Provide a private backup/plan file path; add --apply to apply that plan.');
type Change={public_id:string;name:string;before:PlayerSkills;after:PlayerSkills};
if(!process.argv.includes('--apply')){
 const [{data:players,error},{data:hidden,error:moderationError}]=await Promise.all([
  client.from('players').select('public_id,name,published_skills').eq('is_public',true),
  client.from('community_player_moderation').select('public_id')
 ]);
 if(error||moderationError)throw error??moderationError;
 const hiddenIds=new Set(hidden!.map(p=>p.public_id));
 const visible=players!.filter(p=>!hiddenIds.has(p.public_id)).sort((a,b)=>a.name.localeCompare(b.name)||a.public_id.localeCompare(b.public_id));
 const plan:Change[]=visible.map(p=>{
  const category=communityCategory(p.published_skills).id;
  const peers=visible.filter(other=>communityCategory(other.published_skills).id===category);
  const rating=3.5+(peers.length>1?peers.indexOf(p)/(peers.length-1):0)*1.3;
  const after=skillsAtCommunityRating(p.published_skills,rating);
  return {public_id:p.public_id,name:p.name,before:p.published_skills,after};
 });
 await writeFile(planPath,JSON.stringify(plan,null,2),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({planned:plan.length,ratings:plan.map(p=>({name:p.name,category:communityCategory(p.after).title,before:summarizeSkills(p.before).estimatedDupr.toFixed(2),after:summarizeSkills(p.after).estimatedDupr.toFixed(2)}))},null,2));
}else{
 const plan:Change[]=JSON.parse(await readFile(planPath,'utf8'));
 for(const p of plan){
  if(!fitsSkillBudget(p.after,CURATED_COMMUNITY_BUDGET))throw new Error('Invalid planned build');
  const {data,error}=await client.from('players').update({published_skills:p.after}).eq('public_id',p.public_id).eq('is_public',true).eq('published_skills',JSON.stringify(p.before)).select('public_id,published_skills');
  if(error)throw error;
  if(data?.length!==1)throw new Error('Player changed since backup; stopped without overwriting it.');
  if(!fitsSkillBudget(data[0].published_skills,CURATED_COMMUNITY_BUDGET)||Object.entries(p.after).some(([key,value])=>data[0].published_skills[key]!==value))throw new Error('Verification failed');
 }
 console.log('Updated and verified '+plan.length+' community builds. Saved roster copies and designer-owned builds unchanged.');
}
