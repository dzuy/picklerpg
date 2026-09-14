/** Explicitly invoked live-project test. Creates dedicated test users/games, never modifies user games. */
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {newPlayer} from '../src/player-design';
import {SLOTS} from '../src/engine/checkpoint';
import type {PublicMatch,RemoteAction,ActionReceipt} from '../src/multiplayer/protocol';
const url=process.env.SUPABASE_URL!,secret=process.env.SUPABASE_SERVICE_ROLE_KEY!,publishable=process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
if(!process.argv.includes('--run-live')||new URL(url).hostname!=='vwdtfnljcjbyokdvjiea.supabase.co')throw Error('Explicit --run-live and the approved project are required.');
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,secret,opts),file='.multiplayer-test-accounts.json';
type Tester={email:string;password:string;id?:string};
let accounts:Record<'a'|'b'|'outsider',Tester>;
try{accounts=JSON.parse(await readFile(file,'utf8'));}catch(e:any){if(e.code!=='ENOENT')throw e;accounts=Object.fromEntries(['a','b','outsider'].map(name=>[name,{email:`phase3-${name}-${randomUUID()}@picklebash-test.invalid`,password:randomBytes(32).toString('base64url')}])) as typeof accounts;await writeFile(file,JSON.stringify(accounts,null,2),{mode:0o600});}
async function save(){await writeFile(file,JSON.stringify(accounts,null,2),{mode:0o600});}
const tokens:Record<string,string>={};
for(const [name,account] of Object.entries(accounts)){
 if(!account.id){const {data,error}=await admin.auth.admin.createUser({email:account.email,password:account.password,email_confirm:true,user_metadata:{purpose:'phase3-controlled-test',tester:name}});if(error)throw Error(`Test account creation failed (${error.code}).`);account.id=data.user.id;await save();}
 const client=createClient(url,publishable,opts),{data,error}=await client.auth.signInWithPassword({email:account.email,password:account.password});if(error||!data.session)throw Error(`Test sign-in failed (${error?.code}).`);assert.equal(data.user.id,account.id);tokens[name]=data.session.access_token;
}
console.log('Three dedicated password-protected test identities ready; credentials kept in ignored local file.');
const a=accounts.a.id!,b=accounts.b.id!,outsider=accounts.outsider.id!;
const oldHistory=await admin.from('match_history').select('*',{count:'exact',head:true});assert.ifError(oldHistory.error);
const report:any={project:new URL(url).hostname,startedAt:new Date().toISOString(),testAccounts:[a,b],checks:[],matches:[]};
let server:ChildProcess|undefined;
const port=5192,base=`http://127.0.0.1:${port}`;
async function start(){server=spawn(process.execPath,['server/production.mjs'],{env:{...process.env,PORT:String(port),MULTIPLAYER_ENABLED:'true',MULTIPLAYER_CREATE_ENABLED:'true',MULTIPLAYER_TESTER_IDS:[a,b].join(',')},stdio:['ignore','ignore','pipe']});let error='';server.stderr?.on('data',chunk=>{error+=String(chunk);process.stderr.write(chunk)});for(let i=0;i<50;i++){try{if((await fetch(base+'/healthz')).ok)return;}catch{}if(server.exitCode!==null)throw Error('Test server failed to start.');await new Promise(r=>setTimeout(r,100));}throw Error('Test server did not become healthy.');}
async function stop(){if(server&&server.exitCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}}
async function api(path:string,who:string,body?:unknown){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${tokens[who]??who}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,body:await response.json()};}
const action=(s:PublicMatch,i=0):RemoteAction=>({actionId:randomUUID(),expectedVersion:s.version,decisionId:s.decisionId,action:{kind:'play_shot',...s.choices[i%s.choices.length]}});
try{
 await start();
 assert.equal((await api('/api/matches','invalid-token')).status,401);
 const anon=createClient(url,publishable,opts);
 const auth=createClient(url,publishable,{...opts,global:{headers:{Authorization:`Bearer ${tokens.a}`}}});
 for(const client of [anon,auth])for(const table of ['async_matches','async_match_actions']){const r=await client.from(table).select('*').limit(1);assert.ok([401,403].includes(r.status));const w=await client.from(table).insert({});assert.ok([401,403].includes(w.status));}
 for(const client of [anon,auth]){const r=await client.rpc('create_async_test_match',{p_match:{}});assert.ok([401,403].includes(r.status));const w=await client.rpc('commit_async_match_action',{p_match_id:randomUUID(),p_actor:a,p_action_id:randomUUID(),p_request_hash:'0'.repeat(64),p_expected_version:0,p_checkpoint:{},p_current_actor:a,p_status:'active',p_last_result:null,p_animation:[],p_action:{}});assert.ok([401,403].includes(w.status));}
 report.checks.push('Real Auth token validation; anonymous/authenticated direct table and RPC access denied');console.log('Live Auth and data-API access restrictions passed.');
 for(const scoring of ['rally-doubles','side-out-doubles'] as const){
  const input={creationId:randomUUID(),opponentId:b,scoring,roster:Object.fromEntries(SLOTS.map((id,i)=>[id,{...newPlayer(id),name:`Phase3 ${['Alex','Blake','Casey','Drew'][i]}`}]))};
  const [created,again]=await Promise.all([api('/api/matches','a',input),api('/api/matches','a',input)]);assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(again.status,201);let s=created.body as PublicMatch;assert.equal(s.id,again.body.id);
  assert.equal((await api(`/api/matches/${s.id}`,'outsider')).status,404);
  const first=action(s);assert.equal((await api(`/api/matches/${s.id}/actions`,'b',first)).status,403);
  assert.equal((await api(`/api/matches/${s.id}/actions`,'a',{...first,score:{home:3,away:0}})).status,400);
  const results=await Promise.all([api(`/api/matches/${s.id}/actions`,'a',first),api(`/api/matches/${s.id}/actions`,'a',{...first,actionId:randomUUID()})]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  // If the competing ID won, use its returned receipt's ID for the exact retry.
  const accepted=results.find(x=>x.status===200)!.body as ActionReceipt;
  const retryRequest={...first,actionId:accepted.actionId};
  await stop();await start();const retry=await api(`/api/matches/${s.id}/actions`,'a',retryRequest);assert.equal(retry.status,200);assert.deepEqual(retry.body,accepted);s=accepted.state;console.log(`${scoring}: competing requests and restart retry passed.`);
  let turns=1,receptions=0;
  for(let i=0;i<500&&s.status!=='completed';i++){
   const who=s.currentTeam==='home'?'a':'b';const current=await api(`/api/matches/${s.id}`,who);assert.equal(current.status,200);s=current.body;
   const request=action(s,i);if(request.action.timing)receptions++;
   let r;if(i===0){const race=await Promise.all([api(`/api/matches/${s.id}/actions`,who,request),api(`/api/matches/${s.id}/actions`,who,request)]);assert.equal(race[0].status,200);assert.deepEqual(race[0],race[1]);r=race[0];}else r=await api(`/api/matches/${s.id}/actions`,who,request);
   if(r.status===429){await stop();await start();r=await api(`/api/matches/${s.id}/actions`,who,request);}
   assert.equal(r.status,200,JSON.stringify(r.body));s=r.body.state;turns++;if(turns%10===0)console.log(`${scoring}: ${turns} accepted actions, score ${s.score.home}-${s.score.away}.`);
   const raw=JSON.stringify(s);for(const field of ['seed','resolution_secret','checkpoint','receptionChoice','feedback','options'])assert.ok(!raw.includes(`"${field}"`));
  }
  assert.equal(s.status,'completed');
  await stop();await start();for(const who of ['a','b']){const reopened=await api(`/api/matches/${s.id}`,who);assert.equal(reopened.status,200);assert.equal(reopened.body.status,'completed');assert.deepEqual(reopened.body.score,s.score);}
  const row=await admin.from('async_matches').select('version,status,completed_at,winner_user_id').eq('id',s.id).single();assert.ifError(row.error);assert.ok(row.data.completed_at);assert.equal(row.data.version,turns);
  const history=await admin.from('async_match_actions').select('*',{count:'exact',head:true}).eq('match_id',s.id);assert.ifError(history.error);assert.equal(history.count,turns);
  const original=await api(`/api/matches/${s.id}/actions`,'a',retryRequest);assert.deepEqual(original.body,accepted);
  report.matches.push({id:s.id,scoring,score:s.score,turns,receptions,status:s.status});console.log(`${scoring}: complete ${s.score.home}-${s.score.away}; ${turns} actions; durable after Node restart.`);
 }
 const newHistory=await admin.from('match_history').select('*',{count:'exact',head:true});assert.ifError(newHistory.error);assert.equal(newHistory.count,oldHistory.count);
 report.checks.push('Creation retry identity','Distinct-ID concurrency: one commit','Identical-ID concurrency: one receipt','Wrong owner / outsider / score forgery rejected','Discarded-response retry after Node restart','Old exact receipt after completion','Public payload seed/outcome redaction','Both scoring modes complete with exactly one history row per action','Solo match history unchanged');
 report.finishedAt=new Date().toISOString();await writeFile('evaluation/phase3-hosted-report.json',JSON.stringify(report,null,2)+'\n');
 let env=await readFile('.env.local','utf8');for(const [key,value] of Object.entries({MULTIPLAYER_TESTER_IDS:[a,b,'d1f091b9-2a61-4ada-8831-fba9a5b59eb6'].join(','),MULTIPLAYER_CREATE_ENABLED:'true'})){const re=new RegExp('^'+key+'=.*$','m');env=re.test(env)?env.replace(re,key+'='+value):env+'\n'+key+'='+value+'\n';}await writeFile('.env.local',env,{mode:0o600});
 console.log('Hosted test passed. Local multiplayer enabled for the two test accounts and the existing protected account.');
}finally{await stop();}
