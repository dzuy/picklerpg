import {normalizeSkillBudget} from './skill-budget';
import {accountSkillBudget} from './account-skill-budget';
import {normalizeTeamName} from './team-name';
import {accountReturnUrl} from './auth-destination';
import {authClient} from './auth-session';
import type {MatchParticipant} from './player-history';
import {type SupabaseClient,type User} from '@supabase/supabase-js';
import {parseLibrary,validatePlayer,type DesignedPlayer,type PlayerLibrary} from './player-design';
import {browserStorage} from './browser-storage';

export type LibraryChange={kind:'save';playerId:string}|{kind:'delete';playerId:string};
export type CloudSaveState='local'|'connecting'|'saving'|'saved'|'offline';
export type CloudAccountState={kind:'unavailable'|'connecting'|'guest'|'pending'|'authenticated';email?:string;playerName?:string;teamName?:string};
type PlayerRow={id:string;name:string;catchphrase:string|null;appearance:unknown;skills:unknown;handedness:'left'|'right';is_active:boolean;is_public?:boolean;published_skills?:DesignedPlayer['skills']};
const CLOUD_OWNER_KEY='pickle-rpg-cloud-owner-v1',CLOUD_DIRTY_KEY='pickle-rpg-cloud-dirty-v1';
export const PENDING_ACCOUNT_PLAYER_KEY='picklebash-pending-account-player-v1';

export function playerFromRow(row:PlayerRow):DesignedPlayer{
 return validatePlayer({id:row.id,name:row.name,...(row.published_skills?{publishedSkills:row.published_skills}:{}),isPublic:row.is_public??false,...(row.catchphrase?{catchphrase:row.catchphrase}:{}),appearance:row.appearance,skills:row.skills,handedness:row.handedness});
}
function rowFromPlayer(ownerId:string,player:DesignedPlayer,activeId:string|null){return {owner_id:ownerId,id:player.id,name:player.name,is_public:player.isPublic===true,published_skills:player.publishedSkills??null,catchphrase:player.catchphrase??null,appearance:player.appearance,skills:player.skills,handedness:player.handedness,is_active:player.id===activeId}}

export function accountPlayerRow(ownerId:string,player:DesignedPlayer){return rowFromPlayer(ownerId,validatePlayer(player),null)}
export async function addPlayerToSignedInAccount(player:DesignedPlayer){
 const client=authClient();if(!client)throw new Error('Your account is unavailable. Please try again.');
 const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;
 if(!session||session.user.is_anonymous)throw new Error('Sign in to add this player to your roster.');
 const budget=await accountSkillBudget(),normalized={...validatePlayer(player),skills:normalizeSkillBudget(player.skills,budget)};
 const {error}=await client.from('players').upsert(accountPlayerRow(session.user.id,normalized),{onConflict:'owner_id,id'});
 if(error)throw new Error('You’re signed in, but this player could not be added to your roster. Please try again.');
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
 private signingOut=false;
 get accountId(){return this.ownerId}
 async signOut(){
  if(!this.client)throw new Error('Connect before signing out.');
  await this.queue;
  if(browserStorage.getItem(CLOUD_DIRTY_KEY)==='1')throw new Error('Your player changes are not synced yet. Reconnect before signing out.');
  const {data:{session}}=await this.client.auth.getSession();
  if(session?.user.is_anonymous)throw new Error('Protect your progress before signing out.');
  this.signingOut=true;
  const {error}=await this.client.auth.signOut({scope:'local'});if(error){this.signingOut=false;throw error}
  browserStorage.removeItem('pickle-rpg-players-v1');browserStorage.removeItem(CLOUD_OWNER_KEY);location.reload();
 }
 async resendLink(email:string,mode:'protect'|'sign-in'){
  if(mode==='sign-in')return this.sendSignInLink(email);
  if(!this.client)throw new Error('Reconnect to send a link.');
  const {error}=await this.client.auth.resend({type:'email_change',email,options:{emailRedirectTo:this.returnUrl()}});if(error)throw error;
 }
 async recordMatch(result:{id:string;home_names:string;away_names:string;home_score:number;away_score:number;ended_early?:boolean;participants?:MatchParticipant[]},owner:string){
  if(!this.client||this.ownerId!==owner)throw new Error('Reconnect to the account that played this match.');
  const {error}=await this.client.rpc(result.participants?'record_match_players':result.ended_early?'record_early_match':'record_match',{p_id:result.id,p_home_names:result.home_names,p_away_names:result.away_names,p_home_score:result.home_score,p_away_score:result.away_score,...(result.participants?{p_ended_early:!!result.ended_early,p_participants:result.participants}:{})});if(error)throw error;
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
  this.status('connecting');this.accountStatus({kind:'connecting'});
  try{
   this.client=authClient()!;
   this.client.auth.onAuthStateChange((_event,nextSession)=>{
    const nextOwner=nextSession?.user.id??null;
    this.accountStatus(accountStateForUser(nextSession?.user??null));
    if(this.ownerId&&nextOwner!==this.ownerId&&!this.signingOut){this.ownerId=null;this.status('connecting');setTimeout(()=>location.reload(),0)}
   });
   let {data:{session},error}=await this.client.auth.getSession();if(error)throw error;
   if(!session){const signedIn=await this.client.auth.signInAnonymously();if(signedIn.error)throw signedIn.error;session=signedIn.data.session}
   if(!session)throw new Error('Guest session was not created.');this.ownerId=session.user.id;
   if(browserStorage.getItem(CLOUD_OWNER_KEY)&&browserStorage.getItem(CLOUD_OWNER_KEY)!==this.ownerId){local={version:1,activeId:null,players:[]};browserStorage.setItem('pickle-rpg-players-v1',JSON.stringify(local));browserStorage.removeItem(CLOUD_DIRTY_KEY)}
   this.accountStatus(accountStateForUser(session.user));
   const response=await this.client.from('players').select('id,name,catchphrase,appearance,skills,handedness,is_active,is_public,published_skills').eq('owner_id',this.ownerId);
   if(response.error)throw response.error;
   const rows=(response.data??[]) as PlayerRow[];
   const remotePlayers=rows.map(playerFromRow),active=rows.find(row=>row.is_active)?.id??null;
   const remote:PlayerLibrary={version:1,activeId:active,players:remotePlayers};
   const previousOwner=browserStorage.getItem(CLOUD_OWNER_KEY);
   const current=previousOwner&&previousOwner!==this.ownerId?{version:1 as const,activeId:null,players:[]}:parseLibrary(browserStorage.getItem('pickle-rpg-players-v1'));
   const needsUpload=!previousOwner||(previousOwner===this.ownerId&&browserStorage.getItem(CLOUD_DIRTY_KEY)==='1');
   const budget=await accountSkillBudget();
   const merged=needsUpload?mergePlayerLibraries(current,remote):remote;
   merged.players=merged.players.map(p=>({...p,skills:normalizeSkillBudget(p.skills,budget)}));
   browserStorage.setItem('pickle-rpg-players-v1',JSON.stringify(merged));
   if(needsUpload)await this.replaceCloudLibrary(merged);
   browserStorage.setItem(CLOUD_OWNER_KEY,this.ownerId);browserStorage.removeItem(CLOUD_DIRTY_KEY);this.status('saved');return structuredClone(merged);
  }catch(error){console.warn('Cloud player sync unavailable.',error);this.client=null;this.ownerId=null;this.status('offline');this.accountStatus({kind:'unavailable'});return structuredClone(local)}
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
 save(library:PlayerLibrary,change:LibraryChange){
  browserStorage.setItem(CLOUD_DIRTY_KEY,'1');
  if(!this.client||!this.ownerId)return;
  const version=++this.changeVersion;
  this.status('saving');this.queue=this.queue.then(()=>this.persistChange(library,change)).then(()=>{if(version===this.changeVersion){browserStorage.removeItem(CLOUD_DIRTY_KEY);this.status('saved')}}).catch(error=>{console.warn('Cloud player save failed.',error);this.status('offline')});
 }
 private async persistChange(library:PlayerLibrary,change:LibraryChange){
  const client=this.client!,ownerId=this.ownerId!;
  const cleared=await client.from('players').update({is_active:false}).eq('owner_id',ownerId);if(cleared.error)throw cleared.error;
  if(change.kind==='delete'){
   const removed=await client.from('players').delete().eq('owner_id',ownerId).eq('id',change.playerId);if(removed.error)throw removed.error;
  }else{
   const player=library.players.find(candidate=>candidate.id===change.playerId);if(!player)return;
   const saved=await client.from('players').upsert(rowFromPlayer(ownerId,player,library.activeId),{onConflict:'owner_id,id'});if(saved.error)throw saved.error;
  }
  if(library.activeId){const selected=await client.from('players').update({is_active:true}).eq('owner_id',ownerId).eq('id',library.activeId);if(selected.error)throw selected.error}
 }
 private async replaceCloudLibrary(library:PlayerLibrary){
  if(!library.players.length)return;
  const cleared=await this.client!.from('players').update({is_active:false}).eq('owner_id',this.ownerId!);if(cleared.error)throw cleared.error;
  const result=await this.client!.from('players').upsert(library.players.map(player=>rowFromPlayer(this.ownerId!,player,library.activeId)),{onConflict:'owner_id,id'});if(result.error)throw result.error;
 }
}

export function readLocalPlayerLibrary(){return parseLibrary(browserStorage.getItem('pickle-rpg-players-v1'))}
