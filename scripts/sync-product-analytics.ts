/** Commission/recover delivery from committed domain facts. Dry-run unless --send is present. */
import {createClient} from '@supabase/supabase-js';
import {ServerAnalytics,type AnalyticsRow} from '../server/multiplayer/analytics';
import {validProductEvent} from '../src/analytics/events';
const since=process.env.POSTHOG_EXPORT_SINCE;
if(!since||!Number.isFinite(Date.parse(since)))throw new Error('Set POSTHOG_EXPORT_SINCE to an explicit ISO rollout timestamp.');
const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Missing server Supabase configuration.');
const send=process.argv.includes('--send'),analytics=new ServerAnalytics();
if(send&&!analytics.enabled)throw new Error('Sending requires enabled production/staging PostHog configuration.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const until=new Date(Date.now()-60000).toISOString(),counts:Record<string,number>={};let after:AnalyticsRow|null=null;
try{for(;;){
 const {data,error}=await client.rpc('product_analytics_page',{p_since:since,p_until:until,p_after_time:after?.occurred_at??null,p_after_id:after?.event_id??null,p_limit:100});
 if(error)throw Error('Domain analytics query failed: '+error.code);
 const rows=data as AnalyticsRow[];
 for(const row of rows){if(!validProductEvent(row.event,row.properties))throw Error('Invalid domain event: '+row.event);if(send)await analytics.deliver(row);counts[row.event]=(counts[row.event]??0)+1;after=row;}
 if(rows.length<100)break;
}console.log(JSON.stringify({mode:send?'delivered':'dry-run',since,until,counts},null,2));}
finally{await analytics.shutdown();}
