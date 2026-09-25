import type {SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
import {uuid} from './validation';
import type {APNsSender} from './apns';
import type {TurnReady} from './push';
export function parseDevice(input:unknown){
 const value=input as {id?:unknown;token?:unknown;environment?:unknown};
 if(!value||typeof value.id!=='string'||!uuid(value.id)||typeof value.token!=='string'||!/^[a-fA-F0-9]{64,200}$/.test(value.token)||!['sandbox','production'].includes(String(value.environment)))throw new ApiError(400,'device','Invalid iOS registration.');
 return {id:value.id,token:value.token.toLowerCase(),environment:value.environment as 'sandbox'|'production'};
}
export class NativePushService {
 private deliveries=new Map<string,Promise<boolean>>();
 constructor(private client:SupabaseClient,private send?:APNsSender){}
 get available(){return !!this.send}
 async register(userId:string,input:unknown){
  const device=parseDevice(input);
  const {error}=await this.client.rpc('register_push_device',{p_id:device.id,p_user_id:userId,p_token:device.token,p_environment:device.environment});
  if(error)throw new ApiError(503,'device_storage','Could not save notifications. Try again.');
 }
 async disable(userId:string,input:unknown){
  const id=(input as {id?:unknown})?.id;if(typeof id!=='string'||!uuid(id))throw new ApiError(400,'device','Invalid device.');
  const {error}=await this.client.from('push_devices').update({enabled:false,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId);if(error)throw Error('device storage');
 }
 async count(userId:string){const {data,error}=await this.client.rpc('turn_badge_count',{p_user_id:userId});if(error)throw Error('badge count');return Number(data);}
 async deliver(userId:string,event?:TurnReady,type:'turn'|'nudge'='turn'){
  const previous=this.deliveries.get(userId)??Promise.resolve(false);
  const delivery=previous.catch(()=>false).then(()=>this.sendToDevices(userId,event,type));
  this.deliveries.set(userId,delivery);
  try{return await delivery}finally{if(this.deliveries.get(userId)===delivery)this.deliveries.delete(userId);}
 }
 private async sendToDevices(userId:string,event?:TurnReady,type:'turn'|'nudge'='turn'){
  if(!this.send)return false;
  const {data:devices,error}=await this.client.from('push_devices').select('*').eq('user_id',userId).eq('enabled',true);
  if(error)throw Error('native push devices');if(!devices?.length)return false;
  const badge=await this.count(userId);
  const payload=event?{aps:{alert:{title:type==='turn'?'Your turn':'Turn reminder',body:`${event.opponentName.slice(0,32)} just played. You're up.`},sound:'default',badge},type:type==='turn'?'your_turn':'nudge',gameId:event.matchId}:{aps:{badge},type:'badge_sync'};
  const results=await Promise.all(devices.map(async device=>{
   try{
    const result=await this.send!(device.device_token,device.environment,payload,event?`turn-${event.matchId}`:'turn-badge');
    if(result.status===200)return true;
    if(result.reason==='Unregistered'||result.reason==='BadDeviceToken'||result.reason==='DeviceTokenNotForTopic'){
     // A late rejection must never disable a refreshed token or another account's device.
     await this.client.from('push_devices').update({enabled:false}).eq('id',device.id).eq('user_id',userId).eq('device_token',device.device_token).eq('updated_at',device.updated_at);
    }else console.warn('APNs rejected notification',result.status,result.reason);
   }catch{console.warn('APNs delivery unavailable');}
   return false;
  }));
  if(!event&&results.some(result=>!result))throw Error('Badge delivery incomplete');
  return results.some(Boolean);
 }
 /** Retry badge synchronization after outages; revision comparison preserves concurrent mutations. */
 startBadgeWorker(){
  let running=false;
  const tick=async()=>{if(running||!this.send)return;running=true;try{
   const {data,error}=await this.client.from('push_badge_jobs').select('*').limit(100);if(error)throw error;
   for(const job of data??[]){try{await this.deliver(job.user_id);await this.client.from('push_badge_jobs').delete().eq('user_id',job.user_id).eq('revision',job.revision);}catch{/* Keep job for next pass. */}}
  }catch{console.warn('Badge synchronization deferred');}finally{running=false}};
  const timer=setInterval(()=>void tick(),5000);timer.unref();void tick();return ()=>clearInterval(timer);
 }
}
