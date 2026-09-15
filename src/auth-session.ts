import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {browserStorage} from './browser-storage';
let client:SupabaseClient|null=null;
/** One persistent Supabase session for both player-library and remote-match clients. */
export function authClient(){
 const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return null;
 return client??=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:browserStorage}});
}
export async function matchCredentials(){
 const client=authClient();if(!client)throw new Error('Cloud accounts are not configured.');
 const {data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(!session)throw new Error('Use Solo & settings to sign in to your tester account, then reopen this match.');
 return {owner:session.user.id,token:session.access_token};
}
