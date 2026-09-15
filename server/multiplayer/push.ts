import webpush from 'web-push';
import type {SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
export interface TurnReady {userId:string;matchId:string;version:number;opponentName:string}
export type TurnNotifier=(event:TurnReady)=>Promise<void>;
export interface Subscription {endpoint:string;keys:{p256dh:string;auth:string}}
// Restrict network destinations to browser push services, never user-chosen hosts.
export function parseSubscription(input:unknown):Subscription {
 const s=input as Subscription;
 let url:URL;try{url=new URL(s.endpoint)}catch{throw new ApiError(400,'subscription','Invalid notification subscription.');}
 const allowed=url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.apple.com')||url.hostname==='wns.windows.com'||url.hostname.endsWith('.notify.windows.com');
 if(!allowed||url.protocol!=='https:'||url.port||url.username||url.password||url.hash||s.endpoint.length>2048)throw new ApiError(400,'subscription','Unsupported notification provider.');
 const key=(v:unknown,n:number)=>typeof v==='string'&&/^[A-Za-z0-9_-]+={0,2}$/.test(v)&&Buffer.from(v,'base64url').length===n;
 if(!key(s.keys?.p256dh,65)||Buffer.from(s.keys.p256dh,'base64url')[0]!==4||!key(s.keys?.auth,16))throw new ApiError(400,'subscription','Invalid notification keys.');
 return {endpoint:s.endpoint,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}};
}
export class PushService {
 constructor(private client:SupabaseClient,readonly publicKey:string,private privateKey:string,private subject:string,private deliver:typeof webpush.sendNotification=webpush.sendNotification){}
 async subscribe(userId:string,input:unknown){
  const s=parseSubscription(input);
  // Reassign only when this authenticated browser explicitly enables notifications.
  const {error}=await this.client.from('push_subscriptions').upsert({user_id:userId,endpoint:s.endpoint,p256dh:s.keys.p256dh,auth:s.keys.auth,updated_at:new Date().toISOString(),active_until:null},{onConflict:'endpoint'});
  if(error)throw new ApiError(503,'push_storage','Could not save notifications. Try again.');
 }
 async remove(userId:string,input:unknown){
  const endpoint=(input as {endpoint?:unknown})?.endpoint;
  if(typeof endpoint!=='string'||endpoint.length>2048)throw new ApiError(400,'subscription','Invalid subscription.');
  const {error}=await this.client.from('push_subscriptions').delete().eq('user_id',userId).eq('endpoint',endpoint);if(error)throw Error('push storage');
 }
 async activity(userId:string,input:unknown){
  const value=input as {endpoint?:unknown;active?:unknown};
  if(typeof value?.endpoint!=='string'||value.endpoint.length>2048||typeof value.active!=='boolean')throw new ApiError(400,'subscription','Invalid activity.');
  const {error}=await this.client.from('push_subscriptions').update({active_until:value.active?new Date(Date.now()+40000).toISOString():null}).eq('user_id',userId).eq('endpoint',value.endpoint);if(error)throw Error('push storage');
 }
 async notify(event:TurnReady){
  const {data:claimed,error}=await this.client.rpc('claim_turn_push',{p_match_id:event.matchId,p_version:event.version,p_user_id:event.userId});
  if(error)throw Error('push claim');if(!claimed)return;
  const {data:rows,error:readError}=await this.client.from('push_subscriptions').select('id,endpoint,p256dh,auth,active_until').eq('user_id',event.userId);
  if(readError)throw Error('push subscriptions');
  // Any active device means the account is already seeing normal match updates.
  if(rows?.some(row=>Date.parse(row.active_until)>Date.now()))return;
  const payload=JSON.stringify({type:'turn',matchId:event.matchId,version:event.version,opponentName:event.opponentName.slice(0,32)});
  await Promise.allSettled((rows??[]).map(async row=>{
   try{
    await this.deliver({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},payload,{TTL:300,urgency:'normal',timeout:5000,vapidDetails:{subject:this.subject,publicKey:this.publicKey,privateKey:this.privateKey}});
    await this.client.from('push_subscriptions').update({last_used_at:new Date().toISOString()}).eq('id',row.id).eq('user_id',event.userId).eq('auth',row.auth);
   }catch(error){
    const status=(error as {statusCode?:number}).statusCode;
    if(status===404||status===410)await this.client.from('push_subscriptions').delete().eq('id',row.id).eq('user_id',event.userId).eq('auth',row.auth);
    else console.warn('Turn push delivery failed',status??'network');
   }
  }));
 }
}
export function configuredPush(client:SupabaseClient,env:NodeJS.ProcessEnv){
 const {VAPID_PUBLIC_KEY:publicKey,VAPID_PRIVATE_KEY:privateKey,VAPID_SUBJECT:subject}=env;
 if(!publicKey||!privateKey||!subject)return undefined;
 try{webpush.setVapidDetails(subject,publicKey,privateKey);return new PushService(client,publicKey,privateKey,subject)}catch{console.warn('Turn push disabled: invalid VAPID configuration');return undefined}
}
