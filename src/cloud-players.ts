import {RosterOutbox} from './roster-outbox';
import {premiumForPlay} from './premium';
import {missingAppearancePacks} from './premium-appearance';
import type {GameplayRecord} from './persistence/gameplay-record';
import {normalizeSkillBudget} from './skill-budget';
import {accountSkillBudget} from './account-skill-budget';
import {normalizeTeamName} from './team-name';
import {accountReturnUrl} from './auth-destination';
import {authClient} from './auth-session';
import type {MatchParticipant} from './player-history';
import {type SupabaseClient,type User} from '@supabase/supabase-js';
import {parseLibrary,validatePlayer,type DesignedPlayer,type PlayerLibrary} from './player-design';
import {browserStorage,browserSessionStorage} from './browser-storage';

export type LibraryChange={kind:'save';playerId:string}|{kind:'delete';playerId:string;expectedRevision?:number;previousOperation?:string};
export type CloudSaveState='local'|'connecting'|'saving'|'saved'|'offline'|'conflict';
export type CloudAccountState={kind:'unavailable'|'connecting'|'guest'|'pending'|'authenticated';email?:string;playerName?:string;teamName?:string};
type PlayerRow={revision?:number;id:string;name:string;catchphrase:string|null;appearance:unknown;skills:unknown;handedness:'left'|'right';is_active:boolean;is_public?:boolean;published_skills?:DesignedPlayer['skills']};
const CLOUD_OWNER_KEY='pickle-rpg-cloud-owner-v1',CLOUD_DIRTY_KEY='pickle-rpg-cloud-dirty-v1';
export const PENDING_ACCOUNT_PLAYER_KEY='picklebash-pending-account-player-v1';

export function playerFromRow(row:PlayerRow):DesignedPlayer{
 return validatePlayer({revision:row.revision,id:row.id,name:row.name,...(row.published_skills?{publishedSkills:row.published_skills}:{}),isPublic:row.is_public??false,...(row.catchphrase?{catchphrase:row.catchphrase}:{}),appearance:row.appearance,skills:row.skills,handedness:row.handedness});
}
function rowFromPlayer(ownerId:string,player:DesignedPlayer,activeId:string|null){return {owner_id:ownerId,id:player.id,name:player.name,is_public:player.isPublic===true,published_skills:player.publishedSkills??null,catchphrase:player.catchphrase??null,appearance:player.appearance,skills:player.skills,handedness:player.handedness,is_active:player.id===activeId}}

export function accountPlayerRow(ownerId:string,player:DesignedPlayer,active=false){return rowFromPlayer(ownerId,validatePlayer(player),active?player.id:null)}
export async function addPlayerToSignedInAccount(player:DesignedPlayer){
 const client=authClient();if(!client)throw new Error('Your account is unavailable. Please try again.');
 const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;
 if(!session||session.user.is_anonymous)throw new Error('Sign in to add this player to your roster.');
 const budget=await accountSkillBudget(),normalized={...validatePlayer(player),skills:normalizeSkillBudget(player.skills,budget)};
 const previous=await client.from('players').select('appearance').eq('owner_id',session.user.id).eq('id',normalized.id).maybeSingle();
 if(previous.error)throw new Error('Could not check your saved player. Please try again.');
 const membership=await premiumForPlay();
 const missing=missingAppearancePacks(previous.data?.appearance,normalized.appearance,membership.ownedPacks);
 if(missing.length)throw new Error(`Unlock the ${missing[0]==='style'?'Style':'Party'} Pack to save these choices. Your character is still saved in the editor; close this window to change the Premium parts.`);
 await saveTransferredAccountPlayer(client,session.user.id,normalized);
 const defaults=Array.isArray(session.user.user_metadata.default_starter_ids)?session.user.user_metadata.default_starter_ids as string[]:[];
 const partner=defaults.find(id=>id!==normalized.id);
 const {error:selectionError}=await client.auth.updateUser({data:{default_starter_ids:[normalized.id,...(partner?[partner]:[])],default_starters_custom:false,starter_player:normalized}});
 if(selectionError)throw new Error('Your character was saved, but your default lineup could not be updated. Please try again.');
}

/** Save before switching selection: the database permits just one active player per owner. */
export async function saveTransferredAccountPlayer(client:SupabaseClient,owner:string,player:DesignedPlayer){
 const {error}=await client.from('players').upsert(accountPlayerRow(owner,player),{onConflict:'owner_id,id'});
 if(error)throw new Error('You’re signed in, but this player could not be added to your roster. Please try again.');
 const cleared=await client.from('players').update({is_active:false}).eq('owner_id',owner);
 if(cleared.error)throw new Error('Your player was saved, but could not be selected. Please try again.');
 const selected=await client.from('players').update({is_active:true}).eq('owner_id',owner).eq('id',player.id);
 if(selected.error)throw new Error('Your player was saved, but could not be selected. Please try again.');
}

/** Existing local edits win on first connection; cloud-only players are retained. */
export function mergePlayerLibraries(local:PlayerLibrary,remote:PlayerLibrary):PlayerLibrary{
 const players=new Map(remote.players.map(player=>[player.id,player]));
 for(const player of local.players)players.set(player.id,player);
 const merged=[...players.values()];
 const requested=local.activeId??remote.activeId;
 return {version:1,activeId:requested&&merged.some(player=>player.id===requested)?requested:null,players:merged};
}

export function accountStateForUser(user:(Pick<User,'email'|'is_anonymous'>&Partial<Pick<User,'user_metadata'>>)|null):CloudAccountState{
 if(!user)return {kind:'connecting'};
 const name=user.user_metadata?.player_name;
 const playerName=typeof name==='string'?name.trim():'';
 const team=user.user_metadata?.team_name;const teamName=typeof team==='string'?team.trim():'';
 return user.is_anonymous?{kind:'guest'}:{kind:'authenticated',...(user.email?{email:user.email}:{}),...(playerName?{playerName}:{}),...(teamName?{teamName}:{})};
}

export class CloudPlayerSync{
 async saveTeamName(value:string){
  const name=normalizeTeamName(value);
  if(!this.client||!this.ownerId)throw new Error('Connect to your account to save a team name.');
  const {data,error}=await this.client.auth.updateUser({data:{team_name:name||null}});
  if(error)throw new Error('Could not save your team name. Please try again.');
  this.accountStatus(accountStateForUser(data.user));return name;
 }
 private signingOut=false;private connecting=false;
 get accountId(){return this.ownerId}
 async signOut(){
  if(!this.client)throw new Error('Connect before signing out.');
  await this.queue;
  if(browserStorage.getItem(CLOUD_DIRTY_KEY)==='1'||this.outbox().pending().length)throw new Error('Your player changes are not synced yet. Reconnect before signing out.');
  const {data:{session}}=await this.client.auth.getSession();
  if(session?.user.is_anonymous)throw new Error('Protect your progress before signing out.');
  await (await import('./pwa')).disableDevicePush();
  this.signingOut=true;
  const {error}=await this.client.auth.signOut({scope:'local'});if(error){this.signingOut=false;throw error}
  browserStorage.removeItem('pickle-rpg-players-v1');browserStorage.removeItem(CLOUD_OWNER_KEY);location.reload();
 }
 async resendLink(email:string,mode:'protect'|'sign-in'){
  if(mode==='sign-in')return this.sendSignInLink(email);
  if(!this.client)throw new Error('Reconnect to send a link.');
  const {error}=await this.client.auth.resend({type:'email_change',email,options:{emailRedirectTo:this.returnUrl()}});if(error)throw error;
 }
 async recordMatch(result:{id:string;home_names:string;away_names:string;home_score:number;away_score:number;ended_early?:boolean;participants?:MatchParticipant[];difficulty?:string;target?:number},owner:string){
  if(!this.client||this.ownerId!==owner)throw new Error('Reconnect to the account that played this match.');
  const {error}=await this.client.rpc('record_solo_xp',{p_id:result.id,p_home_names:result.home_names,p_away_names:result.away_names,p_home_score:result.home_score,p_away_score:result.away_score,p_ended_early:!!result.ended_early,p_participants:result.participants??[],p_difficulty:result.difficulty??'normal',p_target:result.target??11});if(error)throw error;
 }
 async recordGameplay(record:GameplayRecord,owner:string){
  if(!this.client||this.ownerId!==owner)throw new Error('Reconnect to the account that played this match.');
  const {error}=await this.client.rpc('record_solo_gameplay',{p_record:record});if(error)throw error;
 }
 async history(){
  if(!this.client||!this.ownerId)throw new Error('Connect to view your match history.');
  const matches=[];
  for(let offset=0;;offset+=500){
   const history=await this.client.from('match_history').select('*').eq('owner_id',this.ownerId).order('completed_at',{ascending:false}).order('id').range(offset,offset+499);
   if(history.error)throw history.error;matches.push(...history.data);if(history.data.length<500)break;
  }
  const progress=await this.client.from('account_progress').select('*').eq('owner_id',this.ownerId).maybeSingle();
  if(progress.error)throw progress.error;
  return {matches,progress:progress.data};
 }
 private client:SupabaseClient|null=null;private ownerId:string|null=null;private queue=Promise.resolve();private changeVersion=0;
 constructor(private status:(state:CloudSaveState)=>void=()=>{},private accountStatus:(state:CloudAccountState)=>void=()=>{}){}
 async connect(local:PlayerLibrary):Promise<PlayerLibrary>{
  const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key){this.status('local');this.accountStatus({kind:'unavailable'});return structuredClone(local)}
  const connectingVersion=this.changeVersion;this.connecting=true;
  this.status('connecting');this.accountStatus({kind:'connecting'});
  try{
   this.client=authClient()!;
   this.client.auth.onAuthStateChange((_event,nextSession)=>{
    const nextOwner=nextSession?.user.id??null;
    this.accountStatus(accountStateForUser(nextSession?.user??null));
    if(this.ownerId&&nextOwner!==this.ownerId&&!this.signingOut&&!browserSessionStorage.getItem(PENDING_ACCOUNT_PLAYER_KEY)){this.ownerId=null;this.status('connecting');setTimeout(()=>location.reload(),0)}
   });
   let {data:{session},error}=await this.client.auth.getSession();if(error)throw error;
   if(!session){const signedIn=await this.client.auth.signInAnonymously();if(signedIn.error)throw signedIn.error;session=signedIn.data.session}
   if(!session)throw new Error('Guest session was not created.');this.ownerId=session.user.id;
   if(browserStorage.getItem(CLOUD_OWNER_KEY)&&browserStorage.getItem(CLOUD_OWNER_KEY)!==this.ownerId){local={version:1,activeId:null,players:[]};browserStorage.setItem('pickle-rpg-players-v1',JSON.stringify(local));browserStorage.removeItem(CLOUD_DIRTY_KEY)}
   if(!browserStorage.getItem(CLOUD_OWNER_KEY)){
    const unclaimed=new RosterOutbox(browserStorage,'unclaimed');
    for(const op of unclaimed.pending()){this.outbox().adopt(op);unclaimed.acknowledge(op);}
   }
   await this.flushChanges();
   this.accountStatus(accountStateForUser(session.user));
   const response=await this.client.from('players').select('id,name,catchphrase,appearance,skills,handedness,is_active,is_public,published_skills,revision').eq('owner_id',this.ownerId);
   if(response.error)throw response.error;
   const rows=(response.data??[]) as PlayerRow[];
   const remotePlayers=rows.map(playerFromRow),active=rows.find(row=>row.is_active)?.id??null;
   const remote:PlayerLibrary={version:1,activeId:active,players:remotePlayers};
   const previousOwner=browserStorage.getItem(CLOUD_OWNER_KEY);
   const current=previousOwner&&previousOwner!==this.ownerId?{version:1 as const,activeId:null,players:[]}:parseLibrary(browserStorage.getItem('pickle-rpg-players-v1'));
   // Never upload an entire cached roster over cloud records. Keep the cache for
   // recovery; only genuinely new, unclaimed players may be imported.
   if(current.players.length&&!browserStorage.getItem(`pickle-roster-recovery-v1:${this.ownerId}`))browserStorage.setItem(`pickle-roster-recovery-v1:${this.ownerId}`,JSON.stringify(current));
   if(!previousOwner){
    for(const player of current.players.filter(p=>!remote.players.some(r=>r.id===p.id))){
     const imported={...player,revision:1,saveOperation:undefined,previousSaveOperation:undefined};
     this.outbox().enqueue({version:1,activeId:remote.activeId,players:[imported]},{kind:'save',playerId:player.id});
     remote.players.push(imported);
    }
    await this.flushChanges();
   }
   const budget=await accountSkillBudget();
   const merged=remote;
   merged.players=merged.players.map(p=>({...p,skills:normalizeSkillBudget(p.skills,budget)}));
   if(connectingVersion!==this.changeVersion)throw Error('Your player changed while connecting. Reconnect to finish syncing.');
   browserStorage.setItem('pickle-rpg-players-v1',JSON.stringify(merged));
   if(connectingVersion!==this.changeVersion||this.outbox().pending().length)throw Error('Your player changed while connecting. Reconnect to finish syncing.');
   browserStorage.setItem(CLOUD_OWNER_KEY,this.ownerId);browserStorage.removeItem(CLOUD_DIRTY_KEY);this.status(this.hasConflicts()?'conflict':'saved');return structuredClone(merged);
  }catch(error){console.warn('Cloud player sync unavailable.',error);this.client=null;this.ownerId=null;this.status((error as {code?:string}).code==='P0001'?'conflict':'offline');this.accountStatus({kind:'unavailable'});return readLocalPlayerLibrary()}finally{this.connecting=false;}
 }
 async protectProgress(email:string){
  if(!this.client)throw new Error('Cloud accounts are unavailable right now.');
  const normalized=email.trim().toLowerCase();if(!normalized)throw new Error('Enter your email address.');
  const {data:{session},error:sessionError}=await this.client.auth.getSession();if(sessionError)throw sessionError;
  if(!session)throw new Error('Your guest session is not ready yet.');
  if(!session.user.is_anonymous)throw new Error('Your progress is already protected.');
  const {error}=await this.client.auth.updateUser({email:normalized},{emailRedirectTo:this.returnUrl()});if(error)throw error;
  this.accountStatus({kind:'pending',email:normalized});
 }
 async sendSignInLink(email:string){
  if(!this.client)throw new Error('Cloud accounts are unavailable right now.');
  const normalized=email.trim().toLowerCase();if(!normalized)throw new Error('Enter your email address.');
  const {error}=await this.client.auth.signInWithOtp({email:normalized,options:{emailRedirectTo:this.returnUrl(),shouldCreateUser:false}});if(error)throw error;
  this.accountStatus({kind:'pending',email:normalized});
 }
 private returnUrl(){return accountReturnUrl(new URL(location.href))}
 private outbox(){return new RosterOutbox(browserStorage,this.ownerId??browserStorage.getItem(CLOUD_OWNER_KEY)??'unclaimed');}
 save(library:PlayerLibrary,change:LibraryChange){
  browserStorage.setItem(CLOUD_DIRTY_KEY,'1');
  this.outbox().enqueue(library,change);
  const version=++this.changeVersion;
  if(this.connecting||!this.client||!this.ownerId){this.status('offline');return;}
  this.status('saving');
  this.queue=this.queue.then(()=>this.flushChanges()).then(()=>{
   if(version===this.changeVersion&&!this.outbox().pending().length){browserStorage.removeItem(CLOUD_DIRTY_KEY);this.status(this.hasConflicts()?'conflict':'saved');}
  }).catch(error=>{console.warn('Cloud player save failed.',error);this.status((error as {code?:string}).code==='P0001'?'conflict':'offline');});
 }
 private hasConflicts(){
  const prefix=`pickle-roster-conflict-v1:${this.ownerId}:`;
  for(let i=0;i<browserStorage.length;i++)if(browserStorage.key(i)?.startsWith(prefix))return true;
  return false;
 }
 private async flushChanges(){
  if(!this.client||!this.ownerId)return;
  const client=this.client,owner=this.ownerId,outbox=this.outbox();
  for(const operation of outbox.pending()){
   if(this.ownerId!==owner)throw Error('Reconnect to the account that edited these players.');
   const {error}=await client.rpc('apply_roster_change',{p_change:operation});
   if(error){
    if(error.code!=='P0001'||!error.message.includes('changed elsewhere'))throw error;
    // Preserve the complete rejected operation before removing it from retries.
    browserStorage.setItem(`pickle-roster-conflict-v1:${owner}:${operation.id}`,JSON.stringify(operation));
   }
   outbox.acknowledge(operation);
  }
 }

}

export function readLocalPlayerLibrary(){return parseLibrary(browserStorage.getItem('pickle-rpg-players-v1'))}
