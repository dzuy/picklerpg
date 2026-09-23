import {activityRewards,activityEvents,type ActivityEvent} from '../../src/activity-rewards';
import {addBotRecord} from './bot-persona';
import type {SupabaseClient} from '@supabase/supabase-js';
import {lobbyTeam,friendIds,type TeamDirectory} from '../../src/multiplayer/team-directory';
import {ApiError} from './errors';
import {profileRecord} from '../../src/profile-record';
import type {HistoryMatch} from '../../src/player-history';
import type {PublicMatch} from '../../src/multiplayer/protocol';
/** Explicit team projection: no emails, authentication metadata or private roster rows. */
export class TeamDirectoryService {
 private selectedTitles=new Map<string,string>();
 private botRecords=new Map<string,Record<string,unknown>>();
 constructor(private client:SupabaseClient,private eligible:ReadonlyMap<string,string>){}
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
  const [saved,games]=await Promise.all([history(),remote()]);
  const seeded=recordMetadata.community_bot===true&&Array.isArray(recordMetadata.bot_seed_activity)?recordMetadata.bot_seed_activity as ActivityEvent[]:[];
  return {...addBotRecord(profileRecord(saved,[],games),recordMetadata),activity:activityRewards([...seeded,...activityEvents(saved,games)],selectedTitle)};
 }
 async list(actor:string):Promise<TeamDirectory>{
  const {data:own,error:ownError}=await this.client.auth.admin.getUserById(actor);
  if(ownError||!own.user)throw new ApiError(503,'teams','Your team could not be loaded.');
  this.botRecords.clear();this.botRecords.set(actor,own.user.app_metadata??{});this.selectedTitles.set(actor,own.user.user_metadata.activity_title);
  const name=(metadata:Record<string,unknown>)=>typeof metadata.player_name==='string'?metadata.player_name.trim().slice(0,32)||'Player':'Player';
  const self=lobbyTeam(actor,name(own.user.user_metadata),own.user.user_metadata),teams:TeamDirectory['teams']=[];
  for(let page=1;page<=10;page++){
   const {data,error}=await this.client.auth.admin.listUsers({page,perPage:100});if(error)throw new ApiError(503,'teams','Teams are unavailable. Please try again.');
   for(const user of data.users){this.botRecords.set(user.id,user.app_metadata??{});this.selectedTitles.set(user.id,user.user_metadata.activity_title);}
   for(const user of data.users)if(user.id!==actor&&!user.is_anonymous&&this.eligible.has(user.id)&&user.app_metadata?.multiplayer_playtest===true&&user.app_metadata?.directory_hidden!==true&&user.user_metadata?.purpose!=='invitation-storage-regression'&&!/^inviteqa_[ab]_[0-9a-f]{8}$/i.test(String(user.user_metadata?.username??'')))teams.push(lobbyTeam(user.id,name(user.user_metadata),user.user_metadata));
   if(data.users.length<100)break;
  }
  return {self,teams:teams.sort((a,b)=>a.name.localeCompare(b.name)),friends:friendIds(own.user.user_metadata.open_play_friends)};
 }
}
