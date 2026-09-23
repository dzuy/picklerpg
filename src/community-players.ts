import {accountSkillBudget} from './account-skill-budget';
import {normalizeSkillBudget} from './skill-budget';
import {authClient} from './auth-session';
import {validatePlayer,type DesignedPlayer} from './player-design';
export interface CommunityPlayer {public_id:string;player:DesignedPlayer;creator_name:string;added:boolean}
export const isCommunityPlayer=(p:DesignedPlayer)=>p.id.startsWith('community-');
export async function communityPlayers(ids?:string[]):Promise<CommunityPlayer[]>{
 const client=authClient();if(!client)throw Error('Connect to browse Community Players.');
 const {data,error}=await client.rpc('community_player_catalog',ids?{p_ids:ids}:{});if(error)throw Error('Community Players are unavailable. Please try again.');
 return (data??[]).map((row:CommunityPlayer)=>({...row,player:validatePlayer(row.player)}));
}
export async function setCommunityAdded(id:string,added:boolean){
 const client=authClient();if(!client)throw Error('Sign in to add Community Players.');
 const {data:{session}}=await client.auth.getSession();if(!session||(added&&session.user.is_anonymous))throw Error('Sign in to add Community Players.');
 const query=client.from('community_player_selections');
 const {error}=added?await query.insert({owner_id:session.user.id,public_id:id}):await query.delete().eq('owner_id',session.user.id).eq('public_id',id);
 if(error&&error.code!=='23505')throw Error('Could not update your Community Players. Please try again.');
}
/** Load personal roster snapshots before a new game; existing checkpoints never call this. */
export async function refreshCommunityDesigns(players:DesignedPlayer[]):Promise<DesignedPlayer[]>{
 const budget=await accountSkillBudget();players=players.map(p=>({...p,skills:normalizeSkillBudget(p.skills,budget)}));
 const shared=players.filter(isCommunityPlayer);if(!shared.length)return structuredClone(players);
 const rows=await communityPlayers(shared.map(p=>p.id.slice('community-'.length))),latest=new Map(rows.map(r=>[r.player.id,r.player]));
 return players.map(p=>{if(!isCommunityPlayer(p))return structuredClone(p);const current=latest.get(p.id);if(!current)throw Error(`${p.name} is no longer in your roster. Choose another player.`);return structuredClone(current)});
}

export async function canModerateCommunity():Promise<boolean>{
 const client=authClient();if(!client)return false;
 const {data,error}=await client.rpc('is_community_admin');return !error&&data===true;
}
export async function removeFromCommunity(publicId:string){
 const client=authClient();if(!client)throw Error('Sign in as an admin to remove Community Players.');
 const {error}=await client.rpc('remove_player_from_community',{p_public_id:publicId});
 if(error)throw Error('Could not remove this player from Community. Admin access is required.');
}

export async function saveCommunitySkills(id:string,skills:DesignedPlayer['skills']){const client=authClient();if(!client)throw Error('Sign in to save your build.');const {error}=await client.rpc('save_community_skills',{p_public_id:id,p_skills:skills});if(error)throw Error(error.message);}
