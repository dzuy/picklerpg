import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import type {IncomingMessage} from 'node:http';
import type {SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
export class RateLimitError extends ApiError {
 constructor(readonly retryAfter:number){super(429,'rate_limited','Too many requests. Please wait a moment.');}
}
export type RateLimitStore=(key:string,max:number)=>Promise<number>;
export function memoryRateLimits(now=Date.now):RateLimitStore {
 const buckets=new Map<string,{start:number;count:number}>();let sweep=0;
 return async(key,max)=>{
  const time=now();
  if(time>=sweep){for(const [k,b] of buckets)if(time-b.start>=60000)buckets.delete(k);sweep=time+60000;}
  let b=buckets.get(key);if(!b||time-b.start>=60000){b={start:time,count:0};buckets.set(key,b);}
  if(b.count>=max)return Math.max(1,Math.ceil((b.start+60000-time)/1000));
  b.count++;return 0;
 };
}
export function databaseRateLimits(client:SupabaseClient):RateLimitStore {
 return async(key,max)=>{
  const {data,error}=await client.rpc('consume_api_rate_limit',{p_key:createHash('sha256').update(key).digest('hex'),p_limit:max});
  if(error||!Number.isInteger(data)||data<0)throw new ApiError(503,'rate_limit_unavailable','Online play is temporarily unavailable. Your turn is saved.');
  return data as number;
 };
}
/** Only trust a deployment-configured number of proxies; never the arbitrary leftmost header. */
export function clientAddress(req:IncomingMessage,trustedHops=0){
 const socket=req.socket.remoteAddress??'unknown';
 if(!Number.isSafeInteger(trustedHops)||trustedHops<1)return socket;
 const raw=req.headers['x-forwarded-for'];if(typeof raw!=='string')return socket;
 const chain=raw.split(',').map(s=>s.trim());
 const address=chain[chain.length-trustedHops];return address&&isIP(address)?address:socket;
}
