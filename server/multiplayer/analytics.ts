import {productProperties} from '../../src/analytics/privacy';
import {createHash} from 'node:crypto';
import {PostHog} from 'posthog-node';
import type {SupabaseClient} from '@supabase/supabase-js';
import {FLAG_DEFAULTS,validProductEvent,type FlagName,type EventName,type AnalyticsEvents} from '../../src/analytics/events';
/** Stable UUID across processes, retries and restarts; PostHog owns ingestion/deduplication. */
export function analyticsUuid(environment:string,event:string,key:string){
 const hex=createHash('sha256').update(JSON.stringify(['picklebash-v1',environment,event,key])).digest('hex');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export class ServerAnalytics {
 private client:PostHog|null=null;
 readonly environment:string;
 constructor(env:NodeJS.ProcessEnv=process.env){
  this.environment=env.ANALYTICS_ENVIRONMENT??'development';
  if(env.POSTHOG_ENABLED==='true'&&env.POSTHOG_KEY&&['production','staging'].includes(this.environment)){
   this.client=new PostHog(env.POSTHOG_KEY,{host:env.POSTHOG_HOST??'https://us.i.posthog.com',requestTimeout:3000,featureFlagsRequestTimeoutMs:1500,flushAt:20,flushInterval:5000,disableGeoip:true,before_send:event=>event?{...event,properties:{...event.properties,environment:this.environment,event_source:'server',platform:'server',app_version:env.APP_VERSION??'0.1.0'}}:null});
   this.client.on('error',()=>console.warn('Analytics delivery unavailable; gameplay is unaffected.'));
  }
 }
 get enabled(){return this.client!==null;}
 async getVariant(key:FlagName,actor:string,fallback:boolean|string=FLAG_DEFAULTS[key]):Promise<boolean|string>{
  if(!this.client)return fallback;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([this.client.evaluateFlags(actor,{personProperties:{environment:this.environment},flagKeys:[key]}).then(flags=>flags.getFlag(key)??fallback),new Promise<boolean|string>(resolve=>{timer=setTimeout(()=>resolve(fallback),1800);})]);}catch{return fallback;}finally{clearTimeout(timer);}
 }
 async isEnabled(key:FlagName,actor:string){return (await this.getVariant(key,actor))===true;}
 track<E extends EventName>(actor:string,event:E,properties:AnalyticsEvents[E],key:string){
  try{this.client?.capture({distinctId:actor,event,uuid:analyticsUuid(this.environment,event,key),properties:{...productProperties(properties),environment:this.environment,event_source:'server',platform:'server',app_version:process.env.APP_VERSION??'0.1.0'}});}catch{}
 }
 async deliver(row:AnalyticsRow){
  if(!this.client)return;
  if(!validProductEvent(row.event,row.properties))throw new Error('Invalid product analytics fact');
  // captureImmediate rejects failed ingestion; the domain-fact cursor must not advance.
  await this.client.captureImmediate({distinctId:row.actor_id,event:row.event,uuid:analyticsUuid(this.environment,row.event,row.event_id),timestamp:new Date(row.occurred_at),properties:{...productProperties(row.properties),domain_timestamp_ms:Date.parse(row.occurred_at),environment:this.environment,event_source:'server',platform:'server',app_version:process.env.APP_VERSION??'0.1.0'}});
 }
 async shutdown(){try{await this.client?.shutdown(5000);}catch{}}
}
export interface AnalyticsRow {event_id:string;actor_id:string;event:EventName;occurred_at:string;properties:Record<string,unknown>}
/** Small adapter from existing domain receipts to the official SDK, outside request handling. */
export function startAnalyticsExport(client:SupabaseClient,analytics:ServerAnalytics,env:NodeJS.ProcessEnv=process.env){
 const since=env.POSTHOG_EXPORT_SINCE;
 if(!analytics.enabled||!since||!Number.isFinite(Date.parse(since)))return ()=>{};
 let stopped=false,running=false,windowStart=since,cutoff=new Date(Date.now()-60000).toISOString(),after:AnalyticsRow|null=null;
 let lastFullScan=Date.now();const delivered=new Set<string>();
 const run=async()=>{
  if(stopped||running)return;running=true;
  try{
   const {data,error}=await client.rpc('product_analytics_page',{p_since:windowStart,p_until:cutoff,p_after_time:after?.occurred_at??null,p_after_id:after?.event_id??null,p_limit:100});
   if(error)throw error;
   for(const row of (data??[]) as AnalyticsRow[]){if(stopped)break;if(!delivered.has(row.event_id)){await analytics.deliver(row);delivered.add(row.event_id);if(delivered.size>100000)delivered.delete(delivered.values().next().value!);}after=row;}
   if(!stopped&&(data??[]).length<100){
    // Overlap catches transactions that commit after their event timestamp. Restart and
    // six-hour reconciliation replay all rollout-era facts, using the same event UUIDs.
    const full=Date.now()-lastFullScan>6*3600000;if(full)lastFullScan=Date.now();
    windowStart=full?since:new Date(Math.max(Date.parse(since),Date.parse(cutoff)-5*60000)).toISOString();
    cutoff=new Date(Date.now()-60000).toISOString();after=null;
   }
  }catch{console.warn('PostHog domain export deferred; existing receipts will be retried.');}
  finally{running=false;}
 };
 const timer=setInterval(()=>void run(),10000);timer.unref();void run();
 return ()=>{stopped=true;clearInterval(timer);};
}
export const serverAnalytics=new ServerAnalytics();
