import {authClient} from './auth-session';
import {communityPlayers,setCommunityAdded,type CommunityPlayer} from './community-players';
import {summarizeSkills} from './player-skill-summary';
import {saveStarterIds} from './roster-membership';

/** Recruit distinct players from the stronger half of the available catalog. */
export function chooseCommunityStarters(rows:CommunityPlayer[],random:()=>number=Math.random):CommunityPlayer[]{
 const ranked=[...rows].filter(row=>!['Emma','Leo'].includes(row.player.name)&&!row.player.id.startsWith('preset-')).sort((a,b)=>summarizeSkills(b.player.skills).estimatedDupr-summarizeSkills(a.player.skills).estimatedDupr);
 const pool=ranked.slice(0,Math.max(2,Math.ceil(ranked.length/2))),selected:CommunityPlayer[]=[];
 while(pool.length&&selected.length<2)selected.push(...pool.splice(Math.floor(random()*pool.length),1));
 return selected;
}
export function communityDefaultLineup(primaryId:string|undefined,recruits:string[]){return primaryId?[primaryId,...recruits.filter(id=>id!==primaryId).slice(0,1)]:recruits.slice(0,2)}
export function repairCommunityDefaults(primaryId:string|undefined,preferred:string[],recruits:string[],custom:boolean){
 return primaryId&&!custom&&preferred.length===2&&preferred.every(id=>recruits.includes(id))?communityDefaultLineup(primaryId,preferred):preferred;
}
const initializing=new Map<string,Promise<CommunityPlayer[]>>();
export async function ensureCommunityStartingRoster(rows:CommunityPlayer[]):Promise<CommunityPlayer[]>{
 const client=authClient(),session=client?(await client.auth.getSession()).data.session:null;
 if(!client||!session||session.user.is_anonymous)return rows;
 const metadata=session.user.user_metadata;
 const owned=await client.from('players').select('id,name,appearance,skills,handedness,is_active').eq('owner_id',session.user.id);
 if(owned.error)throw Error('Could not load your player for the starting lineup. Please try again.');
 const primary=owned.data?.find(player=>player.is_active);
 const explicit=(metadata.default_starter_ids??[]) as string[];
 if(metadata.community_roster_initialized===true){
  const recruits=Array.isArray(metadata.community_starter_public_ids)?rows.filter(row=>metadata.community_starter_public_ids.includes(row.public_id)):[];
  const repaired=repairCommunityDefaults(primary?.id,explicit,recruits.map(row=>row.player.id),metadata.default_starters_custom===true);
  if(repaired!==explicit)await saveStarterIds(repaired,true);
  return rows;
 }
 const resuming=Array.isArray(metadata.community_starter_public_ids)&&metadata.community_starter_public_ids.length>0;
 if(!resuming&&(rows.some(row=>row.added)||Array.isArray(explicit)&&explicit.some(id=>id!==primary?.id&&id!=='preset-0'&&id!=='preset-1')))return rows;
 const owner=session.user.id,existing=initializing.get(owner);if(existing)return existing;
 const pending=(async()=>{
  const saved=Array.isArray(metadata.community_starter_public_ids)?metadata.community_starter_public_ids as string[]:[];
  const selected=saved.length?rows.filter(row=>saved.includes(row.public_id)):chooseCommunityStarters(rows);
  if(selected.length<2)return rows;
  const remembered=await client.auth.updateUser({data:{community_starter_public_ids:selected.map(row=>row.public_id)}});if(remembered.error)throw Error('Could not prepare your starting roster. Please try again.');
  for(const row of selected)await setCommunityAdded(row.public_id,true);
  await saveStarterIds(communityDefaultLineup(primary?.id,selected.map(row=>row.player.id)),true);
  const result=await client.auth.updateUser({data:{community_roster_initialized:true,roster_starters:[],open_play_team:primary?[{id:primary.id,name:primary.name,appearance:primary.appearance,skills:primary.skills,handedness:primary.handedness},selected[0].player]:selected.map(row=>row.player)}});if(result.error)throw Error('Could not save your starting roster. Please try again.');
  return communityPlayers();
 })();
 initializing.set(owner,pending);
 try{return await pending;}finally{initializing.delete(owner);}
}
