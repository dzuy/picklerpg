import type {SupabaseClient,User} from '@supabase/supabase-js';
/** Always verify current server-owned archive state; stale JWT metadata is not authority. */
export async function activeAuthenticatedUser(client:SupabaseClient,token:string):Promise<User|null>{
 const {data,error}=await client.auth.getUser(token);if(error||!data.user||data.user.app_metadata?.account_archived_at)return null;
 const archive=await client.rpc('is_account_archived',{p_account:data.user.id});
 if(archive.error||typeof archive.data!=='boolean')throw Error('Account status unavailable');
 return archive.data?null:data.user;
}
