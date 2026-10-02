import type {User} from '@supabase/supabase-js';
import {defaultTeam} from '../../src/multiplayer/team-directory';
type OpponentAccount=Pick<User,'app_metadata'|'user_metadata'>&Partial<Pick<User,'email'|'is_anonymous'>>;

/** Generated accounts must have trusted automation and a valid saved team. */
export function canChallengeAccount(user:OpponentAccount,communityBotsEnabled=true):boolean{
 if(user.app_metadata?.account_archived_at||user.is_anonymous||user.app_metadata?.multiplayer_playtest!==true)return false;
 const generated=user.app_metadata.community_bot===true||user.app_metadata.bot_seed_batch!==undefined||user.email?.toLowerCase().endsWith('.invalid');
 if(!generated)return true;
 return communityBotsEnabled&&user.app_metadata.community_bot===true&&defaultTeam(user.user_metadata?.open_play_team)!==null;
}
