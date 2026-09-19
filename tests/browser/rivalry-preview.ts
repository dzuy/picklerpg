/** Local-only playable preview: fake identities, seeded history, real engine and PostgreSQL. */
import {createServer} from 'vite';
import {database,PgRepository} from '../helpers/postgres';
import {A,B,C,creation,action} from '../helpers/remote';
import {MatchService} from '../../server/multiplayer/service';
import {InvitationService} from '../../server/multiplayer/invitations';
import {pgInvitations} from '../helpers/invitations';
import {createMatchHandler} from '../../server/multiplayer/routes';
import {lobbyTeam} from '../../src/multiplayer/team-directory';
import {ApiError} from '../../server/multiplayer/errors';
const db=await database();await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
const repo=new PgRepository(db.pool),names=new Map([[A,'Alex'],[B,'Ryan'],[C,'Sam']]),service=new MatchService(repo,names);
let game=await service.create(A,creation());
for(let i=0;game.status==='active'&&i<600;i++){const who=game.currentTeam==='home'?A:B;game=await service.get(game.id,who);game=(await service.act(game.id,who,action(game,i))).state;}
if(game.status!=='completed')throw Error('Preview match did not finish.');
const template=(await repo.get(game.id,A))!;const now=Date.now();const links:Array<{label:string;id:string}>=[];
// Ordered history includes a three-game streak, break, tie, and new series lead.
for(const [i,winner] of [B,B,B,A,A,A,B].entries()){
 const row=await repo.create(service.prepare(A,creation())),checkpoint=structuredClone(template.checkpoint),team=winner===A?'home':'away';
 checkpoint.matchId=row.id;checkpoint.revision=1;checkpoint.scoring.winner=team;checkpoint.scoring.score={home:winner===A?3:1,away:winner===B?3:1};
 checkpoint.rally.state.score=checkpoint.scoring.score;checkpoint.rally.state.result={winner:team,reason:'winner'};
 await db.pool.query("update async_matches set status='completed',version=1,current_action_user_id=null,completed_at=$2,winner_user_id=$3,checkpoint=$4,last_result=$5 where id=$1",[row.id,new Date(now-(10-i)*60000),winner,checkpoint,checkpoint.rally.state.result]);
 links.push({label:['First game','Two games','Three-game streak','Streak broken','Five-game milestone','Series tied','Series lead'][i],id:row.id});
}
// A recent shift in selected families for the personal dashboard. Each game is
// played through the authoritative engine; options absent from the menu stay absent.
for(let n=0;n<12;n++){
 let sample=await service.create(A,creation());
 for(let i=0;i<600&&sample.status==='active';i++){
  const who=sample.currentTeam==='home'?A:B;sample=await service.get(sample.id,who);
  const preferred=sample.choices.findIndex(c=>c.intent.type===(n<6?'drive':'drop'));
  sample=(await service.act(sample.id,who,action(sample,preferred>=0?preferred:i))).state;
 }
 if(sample.status!=='completed')throw Error('Shot-mix fixture did not finish.');
}
const active=await service.create(A,creation());
const handler=createMatchHandler(service,async token=>{if([A,B,C].includes(token))return token;throw new ApiError(401,'auth','Preview identity required');},undefined,new InvitationService(pgInvitations(repo),service,names));
const port=Number(process.env.RIVALRY_PREVIEW_PORT??5194);
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port,strictPort:true},plugins:[{
 name:'isolated-rivalry-preview',enforce:'pre',resolveId(id){if(id.endsWith('/auth-session'))return '\0preview-auth';},
 load(id){if(id!=='\0preview-auth')return;return `const p=new URLSearchParams(location.search);if(p.has('viewer')){sessionStorage.setItem('rivalry-preview-viewer',p.get('viewer'));sessionStorage.removeItem('rivalry-preview-signed-out');const clean=new URL(location.href);clean.searchParams.delete('viewer');history.replaceState(null,'',clean);}const owner=sessionStorage.getItem('rivalry-preview-viewer')==='b'?'${B}':'${A}';export const playerPasswordSession=async()=>{throw Error('Use the simulated preview accounts.');};const listeners=new Set();const signedOut=()=>sessionStorage.getItem('rivalry-preview-signed-out')==='1';export const matchCredentials=async()=>{if(signedOut())throw Error('Preview signed out. Open a player link from /preview to sign in again.');return {owner,token:owner};};const q=()=>{const v={};for(const k of ['select','eq','order','limit','range','in','insert','upsert','update','delete'])v[k]=()=>v;v.maybeSingle=async()=>({data:null,error:null});v.then=(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject);return v;};export const authClient=()=>({rpc:async()=>({data:[],error:null}),from:q,auth:{getSession:async()=>({data:{session:signedOut()?null:{access_token:owner,user:{id:owner,email:'preview@example.invalid',user_metadata:{player_name:owner==='${A}'?'Alex':'Ryan'}}}}}),updateUser:async()=>({error:null}),signOut:async()=>{sessionStorage.setItem('rivalry-preview-signed-out','1');for(const listener of listeners)listener('SIGNED_OUT',null);return {error:null};},onAuthStateChange:listener=>{listeners.add(listener);return {data:{subscription:{unsubscribe(){listeners.delete(listener)}}}};}}});`;},
 configureServer(server){server.middlewares.use((req,res,next)=>{
  const path=new URL(req.url!,'http://localhost').pathname;
  if(path==='/preview'){
   res.setHeader('Content-Type','text/html');res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PickleBash rivalry preview</title><style>body{font:18px system-ui;max-width:740px;margin:40px auto;padding:20px;background:#e5eaf4;color:#213152}a{display:block;padding:12px;margin:8px 0;background:white;border-radius:10px}p{line-height:1.5}</style><h1>Rivalry test court</h1><p>Local preview with simulated accounts and seeded history. Gameplay and rematches use the real server and database. After signing out, open a player link below to sign in again.</p>${links.map(l=>`<a href="/?openplay=1&match=${l.id}&viewer=a">${l.label} — Alex</a><a href="/?openplay=1&match=${l.id}&viewer=b" target="_blank">${l.label} — Ryan</a>`).join('')}<a href="/?openplay=1&match=${game.id}&viewer=a">Final shot playback → result</a><a href="/?openplay=1&match=${active.id}&viewer=a">Play an active game</a><a href="/?openplay=1&tab=profile&viewer=a">Your personal Shot Mix</a><a href="/?openplay=1&viewer=a">Games and friend profiles</a>`);return;
  }
  if(path==='/api/multiplayer/teams'){
   const actor=req.headers.authorization?.slice(7);if(actor!==A&&actor!==B){res.writeHead(401).end();return;}
   const other=actor===A?B:A;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({self:lobbyTeam(actor,names.get(actor)!,{}),teams:[lobbyTeam(other,names.get(other)!,{})],friends:[other]}));return;
  }
  if(/^\/api\/multiplayer\/teams\/[^/]+\/record$/.test(path)){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({games:8,wins:4,losses:4}));return;}
  if(path.startsWith('/api/')){void handler(req,res);return;}next();
 });}
}]});
await server.listen();console.log(`Rivalry preview ready: http://127.0.0.1:${port}/preview`);
let closing=false;async function close(){if(closing)return;closing=true;await server.close();await db.close();process.exit(0);}process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
