import type {SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
type PasswordExchange=(credentials:{email:string;password:string})=>Promise<{access_token:string;refresh_token:string}|null>;
const invalid=()=>new ApiError(401,'sign_in','Check your username or email and password and try again.');
export async function signInAccount(admin:SupabaseClient,exchange:PasswordExchange,input:unknown){
 const value=input as {identifier?:unknown;password?:unknown};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['identifier','password'].includes(k))||typeof value.identifier!=='string'||typeof value.password!=='string'||!value.password||value.password.length>128)throw invalid();
 const identifier=value.identifier.trim().toLowerCase();if(!identifier||identifier.length>254)throw invalid();
 let email=identifier;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)){
  const username=identifier.replace(/^@/,'');if(!/^[a-z0-9_]{3,24}$/.test(username))throw invalid();
  const {data:row,error}=await admin.from('usernames').select('user_id').eq('username',username).maybeSingle();
  if(error)throw new ApiError(503,'sign_in','Sign in is temporarily unavailable. Try again.');
  if(!row)throw invalid();
  const {data,error:userError}=await admin.auth.admin.getUserById(row.user_id);
  if(userError||!data.user?.email||data.user.is_anonymous)throw invalid();email=data.user.email;
 }
 const session=await exchange({email,password:value.password});if(!session)throw invalid();
 return {access_token:session.access_token,refresh_token:session.refresh_token};
}
