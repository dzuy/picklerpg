import {isPackId,type PackId} from '../../src/pack-catalog';
import {premiumAppearance} from '../../src/premium-appearance';
import type {PremiumService} from './premium';
import {computerTeam} from './computer-team';
import {canChallengeAccount} from './opponent-eligibility';
import {activityRewards,activityEvents,type ActivityEvent} from '../../src/activity-rewards';
import {addBotRecord} from './bot-persona';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import {lobbyTeam,friendIds,type TeamDirectory} from '../../src/multiplayer/team-directory';
import {ApiError} from './errors';
import {profileRecord} from '../../src/profile-record';
import type {HistoryMatch} from '../../src/player-history';
import type {PublicMatch} from '../../src/multiplayer/protocol';
/** Explicit team projection: no emails, authentication metadata or private roster rows. */
export class TeamDirectoryService {
 private selectedTitles=new Map<string,string>();
 private botRecords=new Map<string,Record<string,unknown>>();
 constructor(private client:SupabaseClient,private eligible:ReadonlyMap<string,string>,private premium?:PremiumService,private communityBotsEnabled=true){}
 async record(actor:string,target:string,remote:()=>Promise<PublicMatch[]>){
  const directory=await this.list(actor);
  if(target!==actor&&!directory.teams.some(team=>team.id===target))throw new ApiError(404,'profile','This profile is unavailable.');
  const recordMetadata=this.botRecords.get(target)??{},selectedTitle=this.selectedTitles.get(target);
  const history=async()=>{
   const matches:HistoryMatch[]=[];
   for(let offset=0;;offset+=500){
    const {data,error}=await this.client.from('match_history').select('id,home_score,away_score,ended_early,completed_at').eq('owner_id',target).order('id').range(offset,offset+499);
    if(error)throw new ApiError(503,'profile','This game record is unavailable right now.');
    matches.push(...data as HistoryMatch[]);if(data.length<500)return matches;
   }
  };
  const progress=async()=>{
   try{
    const {data,error}=await this.client.from('account_xp').select('lifetime_xp').eq('account_id',target).maybeSingle();
    if(error)return null;
    // Give generated players stable sample XP for their simulated history.
    const baseline=addBotRecord({games:0,wins:0,losses:0},recordMetadata);
    return Number(data?.lifetime_xp??0)+baseline.games*10+baseline.wins*4;
   }catch{return null;}
  };
  const [saved,games,lifetimeXp]=await Promise.all([history(),remote(),progress()]);
  const seeded=recordMetadata.community_bot===true&&Array.isArray(recordMetadata.bot_seed_activity)?recordMetadata.bot_seed_activity as ActivityEvent[]:[];
  return {...addBotRecord(profileRecord(saved,[],games),recordMetadata),lifetimeXp,activity:activityRewards([...seeded,...activityEvents(saved,games)],selectedTitle)};
 }
 async list(actor:string):Promise<TeamDirectory>{
  const {data:own,error:ownError}=await this.client.auth.admin.getUserById(actor);
  if(ownError||!own.user)throw new ApiError(503,'teams','Your team could not be loaded.');
  this.botRecords.clear();this.botRecords.set(actor,own.user.app_metadata??{});this.selectedTitles.set(actor,own.user.user_metadata.activity_title);
  const {data:blocks,error:blockError}=await this.client.from('player_blocks').select('owner_id,blocked_id').or(`owner_id.eq.${actor},blocked_id.eq.${actor}`);if(blockError)throw new ApiError(503,'teams','Teams are unavailable. Please try again.');const blocked=new Set((blocks??[]).map(b=>b.owner_id===actor?b.blocked_id:b.owner_id));
  const name=(metadata:Record<string,unknown>)=>typeof metadata.player_name==='string'?metadata.player_name.trim().slice(0,32)||'Player':'Player';
  const self=lobbyTeam(actor,name(own.user.user_metadata),own.user.user_metadata),candidates:User[]=[];
  const friends=friendIds(own.user.user_metadata.open_play_friends).filter(id=>!blocked.has(id));
  for(let page=1;;page++){
   const {data,error}=await this.client.auth.admin.listUsers({page,perPage:100});if(error)throw new ApiError(503,'teams','Teams are unavailable. Please try again.');
   for(const user of data.users)if(user.id!==actor&&!blocked.has(user.id)&&canChallengeAccount(user,this.communityBotsEnabled)&&this.eligible.has(user.id)&&user.app_metadata?.multiplayer_playtest===true&&user.app_metadata?.directory_hidden!==true&&user.user_metadata?.purpose!=='invitation-storage-regression'&&!/^inviteqa_[ab]_[0-9a-f]{8}$/i.test(String(user.user_metadata?.username??'')))candidates.push(user);
   if(data.users.length<100)break;
  }
  const lastUsed=(user:User)=>Date.parse(user.last_sign_in_at??user.created_at)||0;
  candidates.sort((a,b)=>lastUsed(b)-lastUsed(a)||a.id.localeCompare(b.id));
  const communityIds=candidates.slice(0,100).map(user=>user.id),community=new Set(communityIds);
  const teams:TeamDirectory['teams']=candidates.filter(user=>community.has(user.id)||friends.includes(user.id)).map(user=>{
   this.botRecords.set(user.id,user.app_metadata??{});this.selectedTitles.set(user.id,user.user_metadata.activity_title);
   const team=lobbyTeam(user.id,name(user.user_metadata),user.user_metadata);team.players=computerTeam(user)??team.players;return team;
  });
  if(this.premium&&(await this.premium.status(actor)).enforced){
   const {data,error}=await this.client.from('pack_ownership').select('owner_id,pack_id').in('owner_id',[self.id,...teams.map(t=>t.id)]).eq('active',true);
   if(error)throw new ApiError(503,'membership','Player appearances are temporarily unavailable.');
   const active=new Map<string,PackId[]>();for(const row of data??[])if(isPackId(row.pack_id))active.set(row.owner_id,[...(active.get(row.owner_id)??[]),row.pack_id]);
   for(const team of [self,...teams]){const entitled=this.botRecords.get(team.id)?.community_bot===true?true:(active.get(team.id)??[]);team.avatar=premiumAppearance(team.avatar,entitled);team.players=team.players.map(p=>({...p,appearance:premiumAppearance(p.appearance,entitled)})) as typeof team.players;}
  }
  return {self,teams,friends,communityIds};
 }
}
