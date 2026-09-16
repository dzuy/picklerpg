import type {IncomingMessage,ServerResponse} from 'node:http';
import {createClient} from '@supabase/supabase-js';
import {MatchService} from './service';
import {SupabaseMatchRepository} from './repository';
import {ApiError} from './errors';
import {registerPlaytester,loadPlaytesters,playerName} from './accounts';
import {InvitationService,SupabaseInviteRepository} from './invitations';
import {resolvePublicTeam} from './public-players';
import {uuid} from './validation';
import {configuredPush,type PushService} from './push';
import {TrashTalkService} from './trash-talk';
import {NudgeService} from './nudges';
export type Authenticate=(token:string)=>Promise<string>;
function send(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));}
async function body(req:IncomingMessage){
 if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError(415,'content_type','Send JSON.');
 let size=0;const chunks:Buffer[]=[];
 for await(const chunk of req){size+=chunk.length;if(size>32768)throw new ApiError(413,'too_large','Request is too large.');chunks.push(Buffer.from(chunk));}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ApiError(400,'invalid_json','Invalid JSON.');}
}
export function createMatchHandler(service:MatchService,authenticate:Authenticate,register?: (input:unknown)=>Promise<unknown>,invitations?:InvitationService,push?:PushService,nudges?:NudgeService,trashTalk?:TrashTalkService){
 const buckets=new Map<string,{start:number;count:number}>();
 function limit(key:string,max:number){const now=Date.now();let b=buckets.get(key);if(!b||now-b.start>=60000){if(buckets.size>=5000)for(const [k,v] of buckets)if(now-v.start>=60000)buckets.delete(k);if(buckets.size>=5000)throw new ApiError(429,'busy','Try again shortly.');b={start:now,count:0};buckets.set(key,b);}if(++b.count>max)throw new ApiError(429,'rate_limited','Too many requests. Try again shortly.');}
 return async(req:IncomingMessage,res:ServerResponse)=>{
  try{
   // No cookie authority and no cross-origin write API. Bearer tokens are verified remotely.
   const origin=req.headers.origin;
   if(origin){let host;try{host=new URL(origin).host}catch{throw new ApiError(403,'origin','Invalid origin.');}if(host!==req.headers.host)throw new ApiError(403,'origin','This origin is not allowed.');}
   limit(`ip:${req.socket.remoteAddress}`,300);
   const pathname=new URL(req.url!,'http://localhost').pathname;
   if(pathname==='/api/multiplayer/register'&&req.method==='POST'){if(!register)throw new ApiError(403,'registration_disabled','Registration is closed.');limit('registration:global',6);send(res,201,await register(await body(req)));return;}
   const token=req.headers.authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];if(!token||token.length>8192)throw new ApiError(401,'authentication','Sign in to open this match.');
   const actor=await authenticate(token);if(!uuid(actor))throw new ApiError(401,'authentication','Sign in again.');
   limit(`user:${actor}`,180);
   if(pathname==='/api/multiplayer/push/config'&&req.method==='GET'){send(res,200,{publicKey:push?.publicKey??null});return;}
   if(pathname.startsWith('/api/multiplayer/push/')&&req.method==='POST'){
    if(!push)throw new ApiError(503,'push_disabled','Notifications are not available yet.');
    limit(`push:${actor}`,30);
    const input=await body(req);
    if(pathname==='/api/multiplayer/push/subscribe')await push.subscribe(actor,input);
    else if(pathname==='/api/multiplayer/push/unsubscribe')await push.remove(actor,input);
    else if(pathname==='/api/multiplayer/push/activity')await push.activity(actor,input);
    else throw new ApiError(404,'not_found','Endpoint not found.');
    send(res,200,{ok:true});return;
   }
   if(pathname==='/api/multiplayer/config'&&req.method==='GET'){send(res,200,service.config(actor));return;}
   if(invitations&&pathname==='/api/invitations'){
    if(req.method==='GET'){send(res,200,await invitations.list(actor));return;}
    if(req.method==='POST'){limit(`invite:${actor}`,6);send(res,201,await invitations.create(actor,await body(req)));return;}
   }
   const invite=pathname.match(/^\/api\/invitations\/([^/]+)(\/(?:accept|decline|cancel|delete))?$/);
   if(invitations&&invite&&uuid(invite[1])){
    if(req.method==='GET'&&!invite[2]){send(res,200,await invitations.get(invite[1],actor));return;}
    if(req.method==='POST'&&invite[2]&&invite[2]!=='/accept'){limit(`invite-close:${actor}`,12);send(res,200,await invitations.close(invite[1],actor,invite[2].slice(1) as 'decline'|'cancel'|'delete'));return;}
    if(req.method==='POST'&&invite[2]==='/accept'){limit(`accept:${actor}`,6);send(res,200,await invitations.accept(invite[1],actor,await body(req)));return;}
   }
   if(pathname==='/api/matches'){
    if(req.method==='GET'){send(res,200,await service.list(actor));return;}
    if(req.method==='POST'){if(invitations)throw new ApiError(400,'invitation_required','Send an invitation to start a new game.');limit(`create:${actor}`,6);send(res,201,await service.create(actor,await body(req)));return;}
   }
   const nudge=pathname.match(/^\/api\/matches\/([^/]+)\/nudge$/);
   if(nudge&&uuid(nudge[1])&&nudges){
    const id=nudge[1].toLowerCase();
    if(req.method==='GET'){send(res,200,await nudges.status(id,actor));return;}
    if(req.method==='POST'){if(!nudges.unlimited)limit(`nudge:${actor}`,12);send(res,200,await nudges.send(id,actor,await body(req)));return;}
   }
   const chat=pathname.match(/^\/api\/matches\/([^/]+)\/trash-talk$/);
   if(chat&&uuid(chat[1])&&trashTalk){
    if(req.method==='GET'){send(res,200,await trashTalk.feed(chat[1],actor));return;}
    if(req.method==='POST'){limit(`chat:${actor}`,30);send(res,200,await trashTalk.send(chat[1],actor,await body(req)));return;}
   }
   const archive=pathname.match(/^\/api\/matches\/([^/]+)\/archive$/);
   if(archive&&uuid(archive[1])&&req.method==='POST'){send(res,200,await service.archive(archive[1],actor,await body(req)));return;}
   const match=pathname.match(/^\/api\/matches\/([^/]+)(\/actions)?$/);
   if(match&&uuid(match[1])){
    const id=match[1].toLowerCase();
    if(req.method==='GET'&&!match[2]){send(res,200,await service.get(id,actor));return;}
    if(req.method==='POST'&&match[2]){limit(`act:${actor}`,60);send(res,200,await service.act(id,actor,await body(req)));return;}
   }
   throw new ApiError(404,'not_found','Remote endpoint not found.');
  }catch(error){const e=error instanceof ApiError?error:new ApiError(503,'unavailable','Remote play is temporarily unavailable. Retry the same action.');send(res,e.status,{error:{code:e.code,message:e.message}});}
 };
}
export function configuredMatchHandler(env:NodeJS.ProcessEnv=process.env){
 const unavailable=(message:string)=>async(_req:IncomingMessage,res:ServerResponse)=>send(res,503,{error:{code:'disabled',message}});
 if(env.MULTIPLAYER_ENABLED!=='true')return unavailable('Remote play is not enabled on this server.');
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return unavailable('Remote play needs server database configuration.');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const testers=new Map<string,string>();
 let refreshed=0,refreshing:Promise<void>|null=null;
 async function refreshTesters(){if(Date.now()-refreshed<5000)return;if(!refreshing)refreshing=(async()=>{const enrolled=await loadPlaytesters(client);testers.clear();for(const [id,email] of enrolled)testers.set(id,email);refreshed=Date.now();})().finally(()=>{refreshing=null;});await refreshing;}
 const authenticate:Authenticate=async token=>{const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw new ApiError(401,'authentication','Your session expired. Sign in again, then retry.');await refreshTesters();if(testers.has(data.user.id)){try{testers.set(data.user.id,playerName(data.user.user_metadata?.player_name));}catch{}}return data.user.id;};
 const register=env.MULTIPLAYER_CREATE_ENABLED==='true'?async(input:unknown)=>{const result=await registerPlaytester(client,input);refreshed=0;return result;}:undefined;
 const push=configuredPush(client,env);
 const service=new MatchService(new SupabaseMatchRepository(client),testers,env.MULTIPLAYER_CREATE_ENABLED==='true',push?event=>push.notify(event):undefined);
 return createMatchHandler(service,authenticate,register,new InvitationService(new SupabaseInviteRepository(client),service,testers,team=>resolvePublicTeam(client,team)),push,new NudgeService(client,testers,push?event=>push.notifyNudge(event):undefined,env.NUDGE_TEST_UNLIMITED==='true'),new TrashTalkService(client));
}
