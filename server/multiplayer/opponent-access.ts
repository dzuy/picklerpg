import {createClient} from '@supabase/supabase-js';
import type {IncomingMessage} from 'node:http';
import {activeAuthenticatedUser} from './account-archive';
import {ApiError} from './errors';
import {clientAddress,databaseRateLimits,RateLimitError,type RateLimitStore} from './rate-limit';

export function opponentAccess(authenticate:(token:string)=>Promise<string|null>,limits:RateLimitStore,trustedHops=0){
 return async(req:IncomingMessage)=>{
  const consume=async(key:string,max:number)=>{const delay=await limits(key,max);if(delay)throw new RateLimitError(delay);};
  // Bound authentication work too; a header is not evidence of an authenticated player.
  await consume(`opponent-auth:${clientAddress(req,trustedHops)}`,300);
  const token=req.headers.authorization?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
  const actor=token?await authenticate(token):null;
  if(!actor)throw new ApiError(401,'authentication','Sign in to choose a shot.');
  await consume(`opponent:${actor}`,60);
  await consume('opponent:global',300);
 };
}
export function configuredOpponentAccess(env:NodeJS.ProcessEnv=process.env){
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return async()=>{throw new ApiError(503,'unavailable','Shot selection is unavailable.');};
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 return opponentAccess(async token=>(await activeAuthenticatedUser(client,token))?.id??null,databaseRateLimits(client),Number(env.TRUSTED_PROXY_HOPS??0));
}
