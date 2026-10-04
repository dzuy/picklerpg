import {activeAuthenticatedUser} from './account-archive';
import {AccountSafetyService} from './account-safety';
import {PremiumService} from './premium';
import {PremiumStripe} from './premium-stripe';
import {premiumWebhook} from './premium-routes';
import {RateLimitError,memoryRateLimits,databaseRateLimits,clientAddress,type RateLimitStore} from './rate-limit';
import {serverAnalytics,startAnalyticsExport} from './analytics';
import {GameAnalysisService} from './game-analysis';
import {startCommunityBots,acceptBotChallenge} from './community-bots';
import {canChallengeAccount} from './opponent-eligibility';
import {signInAccount} from './sign-in';
import {TeamDirectoryService} from './team-directory';
import {FriendService} from './friends';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createClient} from '@supabase/supabase-js';
import {MatchService} from './service';
import {SupabaseMatchRepository} from './repository';
import {ApiError} from './errors';
import {registerPlaytester,loadPlaytesters,playerName} from './accounts';
import {InvitationService,SupabaseInviteRepository} from './invitations';
import {resolveMatchTeam} from './computer-team';
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
export function createMatchHandler(service:MatchService,authenticate:Authenticate,register?: (input:unknown)=>Promise<unknown>,invitations?:InvitationService,push?:PushService,nudges?:NudgeService,trashTalk?:TrashTalkService,friends?:FriendService,teams?:TeamDirectoryService,signIn?:(input:unknown)=>Promise<unknown>,analysis?:GameAnalysisService,rateLimits:RateLimitStore=memoryRateLimits(),trustedProxyHops=0,premium?:PremiumService,safety?:AccountSafetyService,refreshDirectory:(actor:string)=>Promise<void>=async()=>{}){
 async function limit(key:string,max:number){const delay=await rateLimits(key,max);if(delay)throw new RateLimitError(delay);}
 return async(req:IncomingMessage,res:ServerResponse)=>{
  try{
   // Native app requests use a local origin; bearer tokens still authorize every private route.
   const origin=req.headers.origin;
   if(origin&&origin!=='capacitor://localhost'){let host;try{host=new URL(origin).host}catch{throw new ApiError(403,'origin','Invalid origin.');}if(host!==req.headers.host)throw new ApiError(403,'origin','This origin is not allowed.');}
   const webhookPath=new URL(req.url!,'http://localhost').pathname;
   if(req.method==='POST'&&['/api/multiplayer/billing/webhooks/revenuecat','/api/multiplayer/billing/webhooks/stripe'].includes(webhookPath)){if(!premium)throw new ApiError(503,'billing_unavailable','Billing is not configured.');await premiumWebhook(req,premium,webhookPath);send(res,200,{ok:true});return;}
   const address=clientAddress(req,trustedProxyHops);
   // Authenticated players never share gameplay quotas with a network or proxy.
   if(!req.headers.authorization)await limit(`anonymous:${address}`,300);
   const url=new URL(req.url!,'http://localhost'),pathname=url.pathname;
   if(pathname==='/api/multiplayer/sign-in'&&req.method==='POST'){if(!signIn)throw new ApiError(503,'sign_in','Sign in is unavailable.');await limit(`sign-in:${address}`,10);send(res,200,await signIn(await body(req)));return;}
   if(pathname==='/api/multiplayer/register'&&req.method==='POST'){if(!register)throw new ApiError(403,'registration_disabled','Registration is closed.');await limit(`registration:${address}`,6);send(res,201,await register(await body(req)));return;}
   const challenge=pathname.match(/^\/api\/multiplayer\/challenges\/([A-Za-z0-9_-]{43})(\/(?:accept|cancel))?$/);
   if(friends&&challenge&&!challenge[2]&&req.method==='GET'){await limit(`challenge-preview:${address}`,120);const i=await friends.get(challenge[1]);await friends.event(null,'invite_link_opened',i);send(res,200,friends.preview(i));return;}
   if(pathname.startsWith('/api/multiplayer/challenges/')&&req.method==='GET')throw new ApiError(404,'challenge','This challenge link is invalid or no longer available.');
   const token=req.headers.authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];if(!token||token.length>8192)throw new ApiError(401,'authentication','Sign in to open this match.');
   let actor:string;try{actor=await authenticate(token);}catch(error){await limit(`failed-auth:${address}`,30);throw error;}if(!uuid(actor))throw new ApiError(401,'authentication','Sign in again.');
   const traffic=req.method==='GET'?'read':/^\/api\/matches\/[^/]+\/actions$/.test(pathname)?'turn':'write';
   await limit(`${traffic}:${actor}`,traffic==='read'?300:traffic==='turn'?60:120);
   if(safety&&pathname.startsWith('/api/multiplayer/safety')){
    if(pathname==='/api/multiplayer/safety/blocks'&&req.method==='GET'){send(res,200,await safety.blocks(actor));return;}
    if(req.method==='POST'){await limit(`safety:${actor}`,6);const input=await body(req);
     if(pathname==='/api/multiplayer/safety/block'){send(res,200,await safety.block(actor,input));return;}
     if(pathname==='/api/multiplayer/safety/report'){send(res,201,await safety.report(actor,input));return;}
     if(pathname==='/api/multiplayer/safety/delete-account'){await limit(`delete-account:${actor}`,3);send(res,202,await safety.deletion(actor,input));return;}
    }
    throw new ApiError(404,'safety','Safety endpoint unavailable.');
   }
   if(pathname.startsWith('/api/multiplayer/premium')){
    if(!premium){if(pathname==='/api/multiplayer/premium'&&req.method==='GET'){send(res,200,{ownedPacks:[],enforced:false,sources:[],availablePacks:[],appleReady:false,webReady:false,admin:false,privacyUrl:null,termsUrl:null});return;}throw new ApiError(503,'billing_unavailable','The store is being set up. Please check back soon.');}
    if(pathname==='/api/multiplayer/premium'&&req.method==='GET'){send(res,200,await premium.status(actor));return;}
    if(req.method==='POST'){
     await limit(`billing:${actor}`,12);
     if(pathname==='/api/multiplayer/premium/refresh'){await premium.requireAccount(actor);if(premium.env.REVENUECAT_SECRET_KEY)await premium.refreshApple(actor);if(premium.env.STRIPE_SECRET_KEY)await new PremiumStripe(premium).refresh(actor);send(res,200,await premium.status(actor));return;}
     if(pathname==='/api/multiplayer/premium/checkout'){send(res,200,await new PremiumStripe(premium).checkout(actor,await body(req)));return;}
     if(pathname==='/api/multiplayer/premium/grant'){send(res,200,await premium.grant(actor,await body(req)));return;}
    }
    throw new ApiError(404,'not_found','Membership endpoint not found.');
   }
   if(analysis&&pathname==='/api/multiplayer/game-analysis/access'&&req.method==='GET'){send(res,200,await analysis.access(actor));return;}
   if(analysis&&pathname==='/api/multiplayer/game-analysis'&&req.method==='POST'){await limit(`analysis:${actor}`,6);send(res,200,await analysis.analyze(actor,await body(req)));return;}
   if(pathname==='/api/multiplayer/push/native/config'&&req.method==='GET'){send(res,200,{available:push?.native?.available??false});return;}
   if(pathname==='/api/multiplayer/push/badge'&&req.method==='GET'){
    if(!push?.native)throw new ApiError(503,'push_disabled','Notifications unavailable.');
    send(res,200,{count:await push.native.count(actor)});return;
   }
   if(pathname.startsWith('/api/multiplayer/push/native/')&&req.method==='POST'){
    if(!push?.native)throw new ApiError(503,'push_disabled','Notifications unavailable.');
    await limit(`native-push:${actor}`,30);const input=await body(req);
    if(pathname==='/api/multiplayer/push/native/register')await push.native.register(actor,input);
    else if(pathname==='/api/multiplayer/push/native/disable')await push.native.disable(actor,input);
    else throw new ApiError(404,'not_found','Endpoint not found.');
    send(res,200,{ok:true});return;
   }
   if(pathname==='/api/multiplayer/push/config'&&req.method==='GET'){send(res,200,{publicKey:push?.publicKey??null});return;}
   if(pathname.startsWith('/api/multiplayer/push/')&&req.method==='POST'){
    if(!push)throw new ApiError(503,'push_disabled','Notifications are not available yet.');
    await limit(`push:${actor}`,30);
    const input=await body(req);
    if(pathname==='/api/multiplayer/push/subscribe')await push.subscribe(actor,input);
    else if(pathname==='/api/multiplayer/push/unsubscribe')await push.remove(actor,input);
    else if(pathname==='/api/multiplayer/push/activity')await push.activity(actor,input);
    else throw new ApiError(404,'not_found','Endpoint not found.');
    send(res,200,{ok:true});return;
   }
   if(friends&&pathname==='/api/multiplayer/invite-event'&&req.method==='POST'){await limit(`event:${actor}`,30);send(res,200,await friends.clientEvent(actor,await body(req)));return;}
   if(friends&&pathname==='/api/multiplayer/challenges'&&req.method==='POST'){await limit(`friend:${actor}`,6);send(res,201,await friends.create(actor,await body(req)));return;}
   if(friends&&challenge&&challenge[2]&&req.method==='POST'){await limit(`claim:${actor}`,12);const input=await body(req);send(res,200,await friends.accept(challenge[1],actor,challenge[2]==='/cancel',input?.acceptAs,input?.team));return;}
   const ownChallenge=pathname.match(/^\/api\/multiplayer\/challenge-for-match\/([a-f0-9-]{36})$/);
   if(friends&&ownChallenge&&req.method==='GET'){send(res,200,await friends.own(actor,ownChallenge[1]));return;}
   if(friends&&pathname==='/api/multiplayer/claim-player'&&req.method==='POST'){await limit(`upgrade:${actor}`,6);send(res,200,await friends.upgrade(actor,await body(req)));return;}
   if(teams&&pathname==='/api/multiplayer/teams'&&req.method==='GET'){await refreshDirectory(actor);send(res,200,await teams.list(actor));return;}
   const teamRecord=pathname.match(/^\/api\/multiplayer\/teams\/([^/]+)\/record$/);
   if(teams&&teamRecord&&uuid(teamRecord[1])&&req.method==='GET'){const target=teamRecord[1].toLowerCase();send(res,200,await teams.record(actor,target,()=>service.list(target)));return;}
   if(pathname==='/api/multiplayer/shot-mix'&&req.method==='GET'){await limit(`shot-mix:${actor}`,20);send(res,200,await service.shotMix(actor,new URL(req.url!,'http://localhost').searchParams));return;}
   if(pathname==='/api/multiplayer/config'&&req.method==='GET'){await refreshDirectory(actor);send(res,200,service.config(actor));return;}
   if(invitations&&pathname==='/api/invitations'){
    if(req.method==='GET'){send(res,200,await invitations.list(actor));return;}
    if(req.method==='POST'){await limit(`invite:${actor}`,6);send(res,201,await invitations.create(actor,await body(req)));return;}
   }
   const invite=pathname.match(/^\/api\/invitations\/([^/]+)(\/(?:accept|decline|cancel|delete))?$/);
   if(invitations&&invite&&uuid(invite[1])){
    if(req.method==='GET'&&!invite[2]){send(res,200,await invitations.get(invite[1],actor));return;}
    if(req.method==='POST'&&invite[2]&&invite[2]!=='/accept'){await limit(`invite-close:${actor}`,12);send(res,200,await invitations.close(invite[1],actor,invite[2].slice(1) as 'decline'|'cancel'|'delete'));return;}
    if(req.method==='POST'&&invite[2]==='/accept'){await limit(`accept:${actor}`,6);send(res,200,await invitations.accept(invite[1],actor,await body(req)));return;}
   }
   if(pathname==='/api/multiplayer/match-summaries'&&req.method==='GET'){send(res,200,await service.summaries(actor,new URL(req.url!,'http://localhost').searchParams));return;}
   if(pathname==='/api/matches'){
    if(req.method==='GET'){send(res,200,await service.list(actor));return;}
    if(req.method==='POST'){if(invitations)throw new ApiError(400,'invitation_required','Send an invitation to start a new game.');await limit(`create:${actor}`,6);send(res,201,await service.create(actor,await body(req)));return;}
   }
   const rematch=pathname.match(/^\/api\/matches\/([^/]+)\/rematch$/);
   if(invitations&&rematch&&uuid(rematch[1])&&req.method==='GET'){send(res,200,await invitations.rematchStatus(rematch[1].toLowerCase(),actor));return;}
   if(invitations&&rematch&&uuid(rematch[1])&&req.method==='POST'){
    await limit(`rematch:${actor}`,12);const input=await body(req),intent=input?.intent??'manual';
    if(!['manual','automatic','accept'].includes(intent))throw new ApiError(400,'rematch','Choose a rematch action.');
    if(intent==='automatic'&&!await serverAnalytics.isEnabled('rematch_auto_countdown',actor))throw new ApiError(409,'rematch_disabled','Automatic rematches are unavailable. Tap to request a rematch.');
    send(res,200,await invitations.rematch(rematch[1].toLowerCase(),actor,intent));return;
   }
   const countdown=pathname.match(/^\/api\/matches\/([^/]+)\/rematch-countdown$/);
   if(invitations&&countdown&&uuid(countdown[1])&&req.method==='POST'){if(!await serverAnalytics.isEnabled('rematch_auto_countdown',actor)){send(res,200,{claimed:false});return;}send(res,200,await invitations.claimCountdown(countdown[1].toLowerCase(),actor));return;}
   const nudge=pathname.match(/^\/api\/matches\/([^/]+)\/nudge$/);
   if(nudge&&uuid(nudge[1])&&nudges){
    const id=nudge[1].toLowerCase();
    if(req.method==='GET'){send(res,200,await nudges.status(id,actor));return;}
    if(req.method==='POST'){if(!nudges.unlimited)await limit(`nudge:${actor}`,12);send(res,200,await nudges.send(id,actor,await body(req)));return;}
   }
   const chatPreferences=pathname.match(/^\/api\/matches\/([^/]+)\/chat-preferences$/);
   if(chatPreferences&&uuid(chatPreferences[1])&&trashTalk&&req.method==='POST'){await limit(`chat-preferences:${actor}`,30);send(res,200,await trashTalk.mute(chatPreferences[1],actor,await body(req)));return;}
   const chat=pathname.match(/^\/api\/matches\/([^/]+)\/trash-talk$/);
   if(chat&&uuid(chat[1])&&trashTalk){
    if(req.method==='GET'){send(res,200,await trashTalk.feed(chat[1],actor,url.searchParams.get('beforeTime'),url.searchParams.get('beforeId')));return;}
    if(req.method==='POST'){await limit(`chat:${actor}`,30);send(res,200,await trashTalk.send(chat[1],actor,await body(req)));return;}
   }
   const leave=pathname.match(/^\/api\/matches\/([^/]+)\/leave$/);
   if(leave&&uuid(leave[1])&&req.method==='POST'){send(res,200,await service.leave(leave[1],actor));return;}
   const notifications=pathname.match(/^\/api\/matches\/([^/]+)\/notifications$/);
   if(notifications&&uuid(notifications[1])&&req.method==='POST'){await limit(`notifications:${actor}`,30);send(res,200,await service.notifications(notifications[1],actor,await body(req)));return;}
   const archive=pathname.match(/^\/api\/matches\/([^/]+)\/archive$/);
   if(archive&&uuid(archive[1])&&req.method==='POST'){send(res,200,await service.archive(archive[1],actor,await body(req)));return;}
   const description=pathname.match(/^\/api\/matches\/([^/]+)\/describe-shot$/);
   if(description&&uuid(description[1])&&req.method==='POST'){await limit(`describe:${actor}`,20);send(res,200,await service.describe(description[1].toLowerCase(),actor,await body(req)));return;}
   const match=pathname.match(/^\/api\/matches\/([^/]+)(\/actions)?$/);
   if(match&&uuid(match[1])){
    const id=match[1].toLowerCase();
    if(req.method==='GET'&&!match[2]){send(res,200,await service.get(id,actor));return;}
    if(req.method==='POST'&&match[2]){send(res,200,await service.act(id,actor,await body(req)));return;}
   }
   throw new ApiError(404,'not_found','Remote endpoint not found.');
  }catch(error){const e=error instanceof ApiError?error:new ApiError(503,'unavailable','Remote play is temporarily unavailable. Retry the same action.');if(e instanceof RateLimitError)res.setHeader('Retry-After',String(e.retryAfter));send(res,e.status,{error:{code:e.code,message:e.message}});}
 };
}
export function configuredMatchHandler(env:NodeJS.ProcessEnv=process.env){
 const unavailable=(message:string)=>async(_req:IncomingMessage,res:ServerResponse)=>send(res,503,{error:{code:'disabled',message}});
 if(env.MULTIPLAYER_ENABLED!=='true')return unavailable('Remote play is not enabled on this server.');
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return unavailable('Remote play needs server database configuration.');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 startAnalyticsExport(client,serverAnalytics,env);
 const communityBotsEnabled=env.MULTIPLAYER_CREATE_ENABLED==='true'&&env.COMMUNITY_BOTS_ENABLED!=='false';
 const testers=new Map<string,string>();
 let refreshed=0,refreshing:Promise<void>|null=null;
 async function refreshTesters(){if(Date.now()-refreshed<60000)return;if(!refreshing)refreshing=(async()=>{const enrolled=await loadPlaytesters(client,communityBotsEnabled);testers.clear();for(const [id,email] of enrolled)testers.set(id,email);refreshed=Date.now();})().finally(()=>{refreshing=null;});await refreshing;}
 const authenticate:Authenticate=async token=>{const user=await activeAuthenticatedUser(client,token);if(!user)throw new ApiError(401,'authentication','Your session expired. Sign in again, then retry.');if(testers.has(user.id)||user.is_anonymous||user.app_metadata?.multiplayer_playtest===true){try{testers.set(user.id,playerName(user.user_metadata?.username??user.user_metadata?.player_name));}catch{}}return user.id;};
 const register=env.MULTIPLAYER_CREATE_ENABLED==='true'?async(input:unknown)=>{const result=await registerPlaytester(client,input);refreshed=0;return result;}:undefined;
 const premium=env.PACK_STORE_ENABLED==='true'?new PremiumService(client,env):undefined;
 const push=configuredPush(client,env);
 const service=new MatchService(new SupabaseMatchRepository(client),testers,env.MULTIPLAYER_CREATE_ENABLED==='true',push?event=>push.notify(event):undefined);
 const invitations:InvitationService=new InvitationService(new SupabaseInviteRepository(client),service,testers,(team,owner)=>resolveMatchTeam(client,team,owner),!communityBotsEnabled?undefined:invite=>acceptBotChallenge(client,service,invitations,invite),invite=>push.notifyInvitation(invite),async opponent=>{const {data,error}=await client.auth.admin.getUserById(opponent);if(error)throw new ApiError(503,'opponent','Could not check this player. Please try again.');if(!data.user||!canChallengeAccount(data.user,communityBotsEnabled))throw new ApiError(403,'opponent','This player is unavailable. Choose another opponent.');testers.set(data.user.id,playerName(data.user.user_metadata?.username??data.user.user_metadata?.player_name??'Player'));});
 if(communityBotsEnabled)startCommunityBots(client,service,invitations,refreshTesters);
 return createMatchHandler(service,authenticate,register,invitations,push,new NudgeService(client,testers,push?event=>push.notifyNudge(event):undefined,env.NUDGE_TEST_UNLIMITED==='true'),new TrashTalkService(client),new FriendService(client,service),new TeamDirectoryService(client,testers,premium,communityBotsEnabled),input=>signInAccount(client,async credentials=>{const exchange=createClient(url,env.VITE_SUPABASE_PUBLISHABLE_KEY??key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data,error}=await exchange.auth.signInWithPassword(credentials);return error?null:data.session;},input),new GameAnalysisService(client,env,undefined,premium),env.RATE_LIMIT_STORE==='database'?databaseRateLimits(client):memoryRateLimits(),Number(env.TRUSTED_PROXY_HOPS??0),premium,new AccountSafetyService(client,async(email,password)=>{const exchange=createClient(url,env.VITE_SUPABASE_PUBLISHABLE_KEY??key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await exchange.auth.signInWithPassword({email,password});return error?null:data.user?.id??null;}),async actor=>{await refreshTesters();const {data,error}=await client.auth.admin.getUserById(actor);if(error||!data.user)throw new ApiError(503,'accounts','Your account could not be loaded.');const user=data.user;if(!user.app_metadata?.account_archived_at&&(user.is_anonymous||user.app_metadata?.multiplayer_playtest===true))testers.set(actor,playerName(user.user_metadata?.username??user.user_metadata?.player_name??'Player'));});
}
