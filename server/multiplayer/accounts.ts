import type {SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
export function playerName(input:unknown){if(typeof input!=='string')throw new ApiError(400,'player_name','Enter a player name.');const name=input.trim().replace(/\s+/g,' ');if(name.length<1||name.length>32||/[\u0000-\u001f\u007f]/.test(name))throw new ApiError(400,'player_name','Use a player name of 1–32 characters.');return name;}
export function registrationInput(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'registration','Enter an email and password.');
 const value=input as Record<string,unknown>;
 if(Object.keys(value).some(k=>!['email','password','playerName'].includes(k))||typeof value.email!=='string'||typeof value.password!=='string')throw new ApiError(400,'registration','Enter an email and password.');
 const email=value.email.trim().toLowerCase(),password=value.password;
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<6||password.length>128)throw new ApiError(400,'registration','Use a valid email and a password with 6–128 characters.');
 return {email,password,playerName:playerName(value.playerName)};
}
/** The playtest explicitly skips confirmation for NEW accounts. Existing identities are never modified. */
export async function registerPlaytester(client:SupabaseClient,input:unknown){
 const {email,password,playerName:name}=registrationInput(input);
 const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{player_name:name},app_metadata:{multiplayer_playtest:true}});
 if(error||!data.user)throw new ApiError(400,'registration','Could not create this account. If you already registered, choose Sign in.');
 return {created:true};
}
export async function loadPlaytesters(client:SupabaseClient){
 const users=new Map<string,string>();
 for(let page=1;page<=10;page++){
  const {data,error}=await client.auth.admin.listUsers({page,perPage:100});if(error)throw new ApiError(503,'accounts','Player list is unavailable. Try again.');
  for(const user of data.users)if(user.app_metadata?.multiplayer_playtest===true&&user.email){let name=user.email;try{name=playerName(user.user_metadata?.player_name);}catch{}users.set(user.id,name);}
  if(data.users.length<100)break;
 }
 return users;
}
