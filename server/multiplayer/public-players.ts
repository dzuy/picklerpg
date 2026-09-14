import type {SupabaseClient} from '@supabase/supabase-js';
import {validatePlayer} from '../../src/player-design';
import type {TeamSelection} from '../../src/multiplayer/invitation-protocol';
import {ApiError} from './errors';
/** Pin the latest published design when starting a new invitation or accepting one. */
export async function resolvePublicTeam(client:Pick<SupabaseClient,'rpc'>,team:TeamSelection):Promise<TeamSelection>{
 const shared=team.filter(p=>p.id.startsWith('community-'));if(!shared.length)return team;
 const {data,error}=await client.rpc('community_player_catalog',{p_ids:shared.map(p=>p.id.slice(10))});
 if(error)throw new ApiError(503,'community','Community Players are unavailable. Try again.');
 const latest=new Map<string,ReturnType<typeof validatePlayer>>((data??[]).map((row:{player:unknown})=>{const p=validatePlayer(row.player);return [p.id,p]}));
 return team.map(p=>{if(!p.id.startsWith('community-'))return p;const saved=latest.get(p.id);if(!saved)throw new ApiError(409,'community',`${p.name} is no longer public. Choose another player.`);return saved}) as TeamSelection;
}
