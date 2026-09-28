import test from 'node:test';
import assert from 'node:assert/strict';
import {AnalyticsController,type AnalyticsAdapter} from '../src/analytics/core';
import {sanitizeProperties,productProperties} from '../src/analytics/privacy';
import {analyticsUuid,ServerAnalytics} from '../server/multiplayer/analytics';
const adapter=(calls:unknown[]):AnalyticsAdapter=>({track:(...args)=>calls.push(args),identify:(...args)=>calls.push(['identify',...args]),reset:()=>calls.push('reset'),setUserProperties:()=>{},flag:()=>undefined});
test('safe defaults, retries and SDK exceptions cannot break gameplay',()=>{
 const a=new AnalyticsController();assert.equal(a.isEnabled('rematch_auto_countdown'),false);assert.equal(a.isEnabled('xp_progression'),true);
 const calls:unknown[]=[];const sdk=adapter(calls);a.connect(sdk);
 a.track('rematch_prompt_shown',{original_match_id:'m',countdown_enabled:false},'m');a.track('rematch_prompt_shown',{original_match_id:'m',countdown_enabled:false},'m');assert.equal(calls.length,1);
 a.connect({...sdk,track(){throw Error('offline')},flag(){throw Error('offline')},identify(){throw Error('offline')},reset(){throw Error('offline')}});
 assert.doesNotThrow(()=>{a.track('app_opened',{source:'launch'});a.identify('a');a.reset();});assert.equal(a.isEnabled('rematch_auto_countdown'),false);
});
test('guest upgrade retains identity, account change resets before identify',()=>{
 const calls:unknown[]=[];const a=new AnalyticsController();a.connect(adapter(calls));a.identify('guest',{is_guest:true});a.identify('guest',{is_guest:false});assert.equal(calls.includes('reset'),false);
 a.identify('other');assert.equal(calls[2],'reset');assert.deepEqual(calls[3],['identify','other',{}]);a.reset();assert.equal(calls.at(-1),'reset');
});
test('multivariate values remain distinct from boolean enablement',()=>{
 const a=new AnalyticsController();a.connect({...adapter([]),flag:()=> 'variant_b'});assert.equal(a.getVariant('experimental_gameplay'),'variant_b');assert.equal(a.isEnabled('experimental_gameplay'),false);
});
test('privacy excludes arbitrary properties and URL/auth attribution',()=>{
 assert.deepEqual(productProperties({match_id:'m',email:'private',password:'secret',command:'private shot text',home_score:3,source:'launch'}),{match_id:'m',home_score:3,source:'launch'});
 assert.deepEqual(sanitizeProperties({$current_url:'https://app/challenge/secret',$initial_referrer:'secret',email:'secret',environment:'production',opponent_id:'uuid',$feature_flag:'rematch_auto_countdown'}),{environment:'production',opponent_id:'uuid',$feature_flag:'rematch_auto_countdown'});
});
test('authoritative event IDs are stable and partitioned by environment and actor',()=>{
 assert.equal(analyticsUuid('production','match_completed','m:a'),analyticsUuid('production','match_completed','m:a'));
 assert.notEqual(analyticsUuid('production','match_completed','m:a'),analyticsUuid('production','match_completed','m:b'));
 assert.notEqual(analyticsUuid('production','match_completed','m:a'),analyticsUuid('staging','match_completed','m:a'));
 assert.match(analyticsUuid('production','match_completed','m:a'),/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('development backend cannot emit production events even with copied key',async()=>{
 const a=new ServerAnalytics({POSTHOG_ENABLED:'true',POSTHOG_KEY:'phc_fake',ANALYTICS_ENVIRONMENT:'development'});assert.equal(a.enabled,false);assert.equal(await a.isEnabled('rematch_auto_countdown','a'),false);
});
test('once receipts survive reload and are scoped to the account',()=>{
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const calls:unknown[]=[];const a=new AnalyticsController(false,storage);a.connect(adapter(calls));a.identify('a');a.track('match_started',{match_id:'m',game_mode:'solo'},'m');
 const b=new AnalyticsController(false,storage);b.connect(adapter(calls));b.identify('a');b.track('match_started',{match_id:'m',game_mode:'solo'},'m');
 assert.equal(calls.filter(v=>Array.isArray(v)&&v[0]==='match_started').length,1);
 b.identify('b');b.track('match_started',{match_id:'m',game_mode:'solo'},'m');assert.equal(calls.filter(v=>Array.isArray(v)&&v[0]==='match_started').length,2);
});
test('pre-initialization events follow initial identity but cannot cross an account switch',()=>{
 const calls:unknown[]=[];const a=new AnalyticsController();a.track('onboarding_started',{source:'test'});a.identify('a');a.connect(adapter(calls));assert.deepEqual(calls[0],['identify','a',{}]);assert.equal((calls[1] as unknown[])[0],'onboarding_started');
 const b=new AnalyticsController();b.identify('a');b.track('onboarding_started',{source:'test'});b.identify('b');b.connect(adapter(calls));assert.equal(calls.filter(v=>Array.isArray(v)&&v[0]==='onboarding_started').length,1);
});
test('domain exporter retries failed delivery without losing facts and suppresses overlap duplicates',async t=>{
 const {startAnalyticsExport}=await import('../server/multiplayer/analytics');
 t.mock.timers.enable({apis:['setInterval','Date'],now:new Date('2026-09-28T12:00:00Z')});
 const row={event_id:'match:m:a',actor_id:'a',event:'match_started',occurred_at:'2026-09-28T11:00:00.123456Z',properties:{match_id:'m',game_mode:'multiplayer'}};
 let attempts=0,queries=0;const cursors:unknown[]=[];
 const client={rpc:async(_name:string,args:Record<string,unknown>)=>{queries++;cursors.push(args.p_after_time);return {data:[row],error:null};}};
 const service={enabled:true,deliver:async()=>{attempts++;if(attempts===1)throw Error('offline');}};
 const stop=startAnalyticsExport(client as never,service as never,{POSTHOG_EXPORT_SINCE:'2026-09-28T00:00:00Z'});
 const settle=()=>new Promise<void>(resolve=>setImmediate(resolve));
 try{await settle();assert.equal(attempts,1);t.mock.timers.tick(10000);await settle();assert.equal(attempts,2);assert.deepEqual(cursors,[null,null]);t.mock.timers.tick(10000);await settle();assert.equal(attempts,2);assert.equal(queries,3);stop();t.mock.timers.tick(10000);await settle();assert.equal(queries,3);}finally{stop();}
});
test('backend delivery preserves committed time separately from ingestion clock adjustments',async()=>{
 const a=new ServerAnalytics({ANALYTICS_ENVIRONMENT:'production'});let captured:any;
 Object.defineProperty(a,'client',{value:{captureImmediate:async(value:unknown)=>{captured=value;}}});
 const committed='2026-09-28T01:43:18.470152Z';
 await a.deliver({event_id:'m:a:start',actor_id:'a',event:'match_started',occurred_at:committed,properties:{match_id:'m',game_mode:'multiplayer'}});
 assert.equal(captured.timestamp.getTime(),Date.parse(committed));assert.equal(captured.properties.domain_timestamp_ms,Date.parse(committed));
 assert.equal(captured.uuid,analyticsUuid('production','match_started','m:a:start'));
});
