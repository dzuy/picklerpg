import type {IncomingMessage,ServerResponse} from 'node:http';
import {memoryRateLimits} from './rate-limit';
import {createClient} from '@supabase/supabase-js';
import type {AnalyticsDashboard,AnalyticsPeriod} from '../../src/analytics/dashboard-contract';

const DAY=86400000,TTL=300000;
export class DashboardError extends Error {constructor(public status:number,public code:string,message:string){super(message);}}
type Identity={id:string;is_anonymous?:boolean};
type Dependencies={authenticate:(token:string)=>Promise<Identity|null>;adminIds:ReadonlySet<string>;key?:string;project?:string;host?:string;coverageSince?:string;fetcher?:typeof fetch;now?:()=>number};
const empty=():AnalyticsPeriod=>({active:0,accounts:0,completed:0,started:0,finished:0,participations:0,rematchEligible:0,rematched:0,invited:0,accepted:0,activated:0,inviteCompleted:0,retentionEligible:0,retained:0});
const sqlDate=(n:number)=>`toDateTime('${new Date(n).toISOString().slice(0,19).replace('T',' ')}', 'UTC')`;
/** Fixed server-owned queries. No browser-supplied SQL, identities or date strings. */
export function dashboardQueries(start:number,end:number,coverage:number){
 const a=sqlDate(start),b=sqlDate(end),lookback=sqlDate(Math.max(coverage,start-7*DAY));
 const base=`SELECT event, person_id, timestamp, properties FROM events WHERE properties.environment = 'production' AND timestamp >= ${a} AND timestamp < ${b}`;
 const stamp=`coalesce(toFloat(properties.domain_timestamp_ms), toFloat(toUnixTimestamp(timestamp)) * 1000.0)`;
 return [
 {keys:['active','accounts','completed'] as const,sql:`WITH e AS (${base}) SELECT countDistinctIf(person_id, event IN ('app_opened','shot_selected')), countDistinctIf(person_id, event = 'account_created'), countDistinctIf(toString(properties.match_id), event = 'match_completed' AND properties.game_mode = 'multiplayer' AND isNotNull(properties.match_id)) FROM e`},
 {keys:['started','finished'] as const,sql:`WITH e AS (${base}) SELECT count(), countIf(isNotNull(finish) AND finish >= begin) FROM (SELECT toString(properties.match_id) AS id, min(if(event = 'match_started', ${stamp}, NULL)) AS begin, min(if(event = 'match_completed', ${stamp}, NULL)) AS finish FROM e WHERE event IN ('match_started','match_completed') AND properties.game_mode = 'multiplayer' AND isNotNull(properties.match_id) GROUP BY id) WHERE isNotNull(begin)`},
 {keys:['participations'] as const,sql:`WITH e AS (${base}) SELECT sum(if(active = 1, completed, 0)) FROM (SELECT person_id, max(if(event IN ('app_opened','shot_selected'), 1, 0)) AS active, countDistinctIf(toString(properties.match_id), event = 'match_completed' AND properties.game_mode = 'multiplayer' AND isNotNull(properties.match_id)) AS completed FROM e GROUP BY person_id)`},
 {keys:['rematchEligible','rematched'] as const,sql:`WITH e AS (${base}) SELECT count(), countIf(isNotNull(requested) AND requested >= completed) FROM (SELECT id, min(if(stage = 'completed', ts, NULL)) AS completed, min(if(stage = 'requested', ts, NULL)) AS requested FROM (SELECT toString(properties.match_id) AS id, ${stamp} AS ts, 'completed' AS stage FROM e WHERE event = 'match_completed' AND properties.game_mode = 'multiplayer' UNION ALL SELECT toString(properties.original_match_id) AS id, ${stamp} AS ts, 'requested' AS stage FROM e WHERE event IN ('rematch_manual_requested','rematch_auto_requested') AND properties.event_source = 'server') WHERE isNotNull(id) AND id != '' GROUP BY id) WHERE isNotNull(completed)`},
 {keys:['invited','accepted','activated','inviteCompleted'] as const,sql:`WITH e AS (${base}) SELECT count(), countIf(accepted >= sent), countIf(accepted >= sent AND activated >= accepted), countIf(accepted >= sent AND activated >= accepted AND completed >= activated) FROM (SELECT toString(properties.invite_id) AS id, min(if(event = 'invite_sent', ${stamp}, NULL)) AS sent, min(if(event = 'invite_accepted', ${stamp}, NULL)) AS accepted, min(if(event = 'invited_player_activated', ${stamp}, NULL)) AS activated, min(if(event = 'invited_player_first_match_completed', ${stamp}, NULL)) AS completed FROM e WHERE event IN ('invite_sent','invite_accepted','invited_player_activated','invited_player_first_match_completed') AND isNotNull(properties.invite_id) GROUP BY id) WHERE isNotNull(sent)`},
 {keys:['retentionEligible','retained'] as const,sql:`WITH e AS (SELECT event, person_id, timestamp FROM events WHERE properties.environment = 'production' AND timestamp >= ${lookback} AND timestamp < ${b}), cohort AS (SELECT person_id, min(timestamp) AS joined FROM e WHERE event = 'account_created' GROUP BY person_id), activity AS (SELECT DISTINCT person_id, toDate(toTimeZone(timestamp, 'UTC')) AS day FROM e WHERE event IN ('app_opened','shot_selected')) SELECT countDistinct(c.person_id), countDistinctIf(c.person_id, a.day = addDays(toDate(toTimeZone(c.joined, 'UTC')), 7)) FROM cohort c LEFT JOIN activity a ON c.person_id = a.person_id WHERE c.joined >= ${lookback} AND c.joined < ${sqlDate(end-7*DAY)} AND addDays(toStartOfDay(toTimeZone(c.joined, 'UTC')), 8) <= ${b}`}
 ];
}
export function createAdminAnalyticsHandler(deps:Dependencies){
 const now=deps.now??Date.now,fetcher=deps.fetcher??fetch;
 const cache=new Map<number,AnalyticsDashboard>(),pending=new Map<number,Promise<AnalyticsDashboard>>();
 let cooldown=0;const limit=memoryRateLimits(now);
 const coverage=Date.parse(deps.coverageSince??'2026-09-28T00:00:00Z');
 async function period(start:number,end:number,signal:AbortSignal){
  const result=empty();
  // Sequential bounded queries avoid competing with gameplay or exhausting API concurrency.
  for(const query of dashboardQueries(start,end,coverage)){
   const response=await fetcher(`${deps.host??'https://us.posthog.com'}/api/projects/${deps.project}/query/`,{method:'POST',headers:{Authorization:`Bearer ${deps.key}`,'Content-Type':'application/json'},body:JSON.stringify({query:{kind:'HogQLQuery',query:query.sql},refresh:'blocking'}),signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])});
   if(!response.ok)throw new Error('Provider unavailable');
   const body=await response.json();const row=body?.results?.[0];
   if(body.error||body.hasMore||!Array.isArray(row)||row.length!==query.keys.length)throw new Error('Invalid aggregate response');
   query.keys.forEach((key,i)=>{const value=row[i]===null?0:Number(row[i]);if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid aggregate');result[key]=value;});
  }
  return result;
 }
 async function report(days:7|30){
  const cached=cache.get(days);if(cached&&now()-Date.parse(cached.generatedAt)<TTL)return cached;
  if(pending.has(days))return pending.get(days)!;
  if(now()<cooldown)throw new DashboardError(503,'unavailable','Analytics is temporarily unavailable. Try again shortly.');
  const run=(async()=>{
   try{
    const end=Math.floor(now()/TTL)*TTL,start=end-days*DAY,previousStart=start-days*DAY;
    const signal=AbortSignal.timeout(25000);
    const [current,previous]=await Promise.all([period(start,end,signal),period(previousStart,start,signal)]);
    const data:AnalyticsDashboard={status:'ready',days,start:new Date(start).toISOString(),end:new Date(end).toISOString(),previousStart:new Date(previousStart).toISOString(),generatedAt:new Date(now()).toISOString(),coverageSince:new Date(coverage).toISOString(),current,previous};cache.set(days,data);return data;
   }catch{cooldown=now()+60000;throw new DashboardError(503,'unavailable','Analytics is temporarily unavailable. Try again shortly.');}
   finally{pending.delete(days);}
  })();pending.set(days,run);return run;
 }
 return async(req:IncomingMessage,res:ServerResponse)=>{
  const send=(status:number,value:unknown)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));
  try{
   if(req.method!=='GET'){res.setHeader('Allow','GET');throw new DashboardError(405,'method','Use GET.');}
   const token=req.headers.authorization?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
   if(!token)throw new DashboardError(401,'authentication','Sign in to your admin account.');
   const user=await deps.authenticate(token);
   if(!user)throw new DashboardError(401,'authentication','Sign in to your admin account.');
   if(user.is_anonymous||!deps.adminIds.has(user.id))throw new DashboardError(403,'forbidden','This page is available to analytics admins only.');
   const retry=await limit(user.id,30);if(retry){res.setHeader('Retry-After',String(retry));throw new DashboardError(429,'rate_limited','Please wait a moment before refreshing.');}
   const params=new URL(req.url??'/', 'http://localhost').searchParams;
   if([...params.keys()].some(k=>k!=='days')||params.getAll('days').length>1||!['7','30'].includes(params.get('days')??'7'))throw new DashboardError(400,'range','Choose 7 or 30 days.');
   if(!deps.key||!/^\d+$/.test(deps.project??'')||!Number.isFinite(coverage))return send(200,{status:'setup',message:'Connect analytics to see your numbers. A server-side PostHog query key and project ID are required.'});
   if(!['https://us.posthog.com','https://eu.posthog.com'].includes(deps.host??'https://us.posthog.com'))throw new DashboardError(503,'configuration','Analytics configuration needs attention.');
   send(200,await report(Number(params.get('days')??7) as 7|30));
  }catch(error){const e=error instanceof DashboardError?error:new DashboardError(503,'unavailable','Analytics is temporarily unavailable. Try again shortly.');send(e.status,{error:{code:e.code,message:e.message}});}
 };
}
export function configuredAdminAnalyticsHandler(env:NodeJS.ProcessEnv=process.env){
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 const client=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 return createAdminAnalyticsHandler({authenticate:async token=>{if(!client)return null;const {data,error}=await client.auth.getUser(token);return error?null:data.user;},adminIds:new Set((env.ANALYTICS_ADMIN_IDS??'').split(',').map(x=>x.trim()).filter(Boolean)),key:env.POSTHOG_PERSONAL_API_KEY,project:env.POSTHOG_PROJECT_ID,host:env.POSTHOG_QUERY_HOST,coverageSince:env.ANALYTICS_COVERAGE_SINCE});
}
