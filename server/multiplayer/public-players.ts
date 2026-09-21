import {normalizeSkillBudget} from '../../src/skill-budget';
import type {SupabaseClient} from '@supabase/supabase-js';
import {validatePlayer} from '../../src/player-design';
import type {TeamSelection} from '../../src/multiplayer/invitation-protocol';
import {ApiError} from './errors';
/** Enforce the account budget and pin personal roster copies for new games. */
export async function resolvePublicTeam(client:Pick<SupabaseClient,'rpc'>,team:TeamSelection,owner?:string):Promise<TeamSelection>{
 let budget=35;if(owner){const {data,error}=await client.rpc('account_skill_budget',{p_owner:owner});if(error)throw new ApiError(503,'budget','Skill budget is unavailable.');budget=Number(data);team=team.map(p=>({...p,skills:normalizeSkillBudget(p.skills,budget)})) as TeamSelection;}
 const shared=team.filter(p=>p.id.startsWith('community-'));if(!shared.length)return team;
 const {data,error}=await client.rpc(owner?'community_roster_for_owner':'community_player_catalog',{p_ids:shared.map(p=>p.id.slice(10)),...(owner?{p_owner:owner}:{})});
 if(error)throw new ApiError(503,'community','Community Players are unavailable. Try again.');
 const latest=new Map<string,ReturnType<typeof validatePlayer>>((data??[]).map((row:{player:unknown})=>{const p=validatePlayer(row.player);return [p.id,p]}));
 return team.map(p=>{if(!p.id.startsWith('community-'))return p;const saved=latest.get(p.id);if(!saved)throw new ApiError(409,'community',`${p.name} is no longer in your roster. Choose another player.`);return saved}) as TeamSelection;
}
