/** Opt-in release smoke check using only dedicated QA accounts and a new QA match. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {newPlayer} from '../src/player-design';
import type {PublicMatch} from '../src/multiplayer/protocol';
const base=process.env.INVITE_TEST_BASE??'https://picklebash.app';
if(!process.argv.includes('--run-live')||!['https://picklebash.app','http://127.0.0.1:5178'].includes(base))throw Error('Explicit --run-live and an approved test origin are required.');
const accounts=JSON.parse(await readFile('.multiplayer-test-accounts.json','utf8'));
const opts={auth:{persistSession:false,autoRefreshToken:false}};
async function signIn(name:'a'|'b'){
 const client=createClient(process.env.SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,opts);
 const {data,error}=await client.auth.signInWithPassword({email:accounts[name].email,password:accounts[name].password});
 if(error||!data.session)throw Error(`Tester ${name} could not sign in (${error?.code??'unknown'}).`);
 assert.equal(data.user.id,accounts[name].id);return {token:data.session.access_token,id:data.user.id};
}
async function api(path:string,token='',body?:unknown){
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();assert.ok(response.ok,`${path.replace(/challenges\/.*/, 'challenges/[redacted]')} returned ${response.status}: ${data.error?.code??'unknown'}`);return data;
}
const a=await signIn('a'),b=await signIn('b');
const team=[newPlayer(randomUUID()),newPlayer(randomUUID())];
team[0].name='QA Invite One';team[1].name='QA Invite Two';
const challenge=await api('/api/multiplayer/challenges',a.token,{name:'Invite QA B',requestId:randomUUID(),team,court:'forest',target:3,scoring:'rally-doubles'});
assert.equal((await api(`/api/multiplayer/challenges/${challenge.token}`)).status,'pending');
const accepted=await api(`/api/multiplayer/challenges/${challenge.token}/accept`,b.token,{acceptAs:b.id,team});
assert.equal(accepted.matchId,challenge.matchId);
const match=await api(`/api/matches/${accepted.matchId}`,b.token) as PublicMatch;
assert.equal(match.viewerTeam,'away');assert.equal(match.currentTeam,'away');assert.equal(match.serving,true);
assert.equal(match.roster['opponent-left'].name,'QA Invite One');
const result=await api(`/api/matches/${match.id}/actions`,b.token,{actionId:randomUUID(),expectedVersion:match.version,decisionId:match.decisionId,action:{kind:'play_shot',...match.choices[0]}});
assert.equal(result.state.version,match.version+1);
const returning=await signIn('b');
assert.equal((await api(`/api/multiplayer/challenges/${challenge.token}/accept`,returning.token,{})).matchId,match.id);
assert.equal((await api(`/api/matches/${match.id}`,returning.token)).version,result.state.version);
for(const tester of [a,returning])assert.ok((await api('/api/matches',tester.token)).some((game:PublicMatch)=>game.id===match.id));
const report={base,verifiedAt:new Date().toISOString(),matchId:match.id,checks:['real password sign-ins','create and preview invitation','registered recipient team selection','recipient serves first','first turn persisted','fresh sign-in reopens same match','both game lists contain match']};
await writeFile('evaluation/invitation-release-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
