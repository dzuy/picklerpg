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
 if(!session)throw new Error('Sign in to Open Play, then reopen this match.');
 return {owner:session.user.id,token:session.access_token};
}

/** Obtain fresh password tokens without replacing the current player until identity is checked. */
export async function playerPasswordSession(credentials:{email:string;password:string}){
 const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Cloud accounts are not configured.');
 const exchange=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'pickle-player-password-exchange'}});
 const {data,error}=await exchange.auth.signInWithPassword(credentials);if(error)throw error;if(!data.session)throw new Error('Could not reconnect to your player.');
 return data.session;
}
