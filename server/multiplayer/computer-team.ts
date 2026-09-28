import type {SupabaseClient,User} from '@supabase/supabase-js';
import {computerOpponent} from '../../src/computer-opponents';
import {defaultTeam} from '../../src/multiplayer/team-directory';
import type {TeamSelection} from '../../src/multiplayer/invitation-protocol';
import {resolvePublicTeam} from './public-players';
import {ApiError} from './errors';

/** Only admin-owned flags permit a computer build, never user metadata/input. */
export function computerTeam(user:Pick<User,'app_metadata'|'user_metadata'>):TeamSelection|null{
 if(user.app_metadata?.community_bot!==true||user.app_metadata?.multiplayer_playtest!==true)return null;
 const saved=defaultTeam(user.user_metadata.open_play_team);
 if(!saved)return null;
 return saved.map(computerOpponent) as TeamSelection;
}
export async function resolveMatchTeam(client:SupabaseClient,team:TeamSelection,owner:string):Promise<TeamSelection>{
 const {data,error}=await client.auth.admin.getUserById(owner);
 if(error||!data.user)throw new ApiError(503,'team','Team could not be loaded.');
 const bot=computerTeam(data.user);
 if(bot)return bot;
 if(data.user.app_metadata?.community_bot===true&&data.user.app_metadata?.multiplayer_playtest===true)throw new ApiError(503,'team','Computer team is unavailable.');
 return resolvePublicTeam(client,team,owner);
}
