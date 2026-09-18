import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {defaultTeam} from '../../src/multiplayer/team-directory';
import type {TeamSelection} from '../../src/multiplayer/invitation-protocol';
import type {PublicMatch} from '../../src/multiplayer/protocol';
import type {MatchService} from './service';
import type {InvitationService} from './invitations';

function number(key:string){return createHash('sha256').update(key).digest().readUInt32BE(0);}
/** Stable per decision, so restarts and multiple servers cannot shorten the delay. */
export function botDelay(key:string,invitation=false){return (invitation?8000:4000)+number(key)%(invitation?17001:10001);}
export function botAction(game:PublicMatch){
 if(game.status!=='active'||game.currentTeam!==game.viewerTeam||!game.choices.length)return null;
 const key=`community-bot:${game.id}:${game.version}`,hex=createHash('sha256').update(key).digest('hex');
 const choice=game.choices[number(key)%game.choices.length];
 return {actionId:`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`,expectedVersion:game.version,decisionId:game.decisionId,action:{kind:'play_shot' as const,...choice}};
}
/** Stable schedule and sender for one recipient, including across server restarts. */
export function surpriseInvitePlan(recipient:string,anchor:string,botIds:string[],first:boolean){
 const key=`surprise:${recipient}:${anchor}`,ids=[...botIds].sort();
 const delay=first?15*60000+number(key)%(75*60000):24*3600000+number(key)%(48*3600000);
 const hex=createHash('sha256').update(key).digest('hex');
 return {due:Date.parse(anchor)+delay,botId:ids[number(`${key}:sender`)%ids.length],requestId:`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`};
}
/** Only server-owned app_metadata can grant control to the bot worker. */
export function startCommunityBots(client:SupabaseClient,matches:MatchService,invitations:InvitationService,refreshAccounts:()=>Promise<void>){
 let busy=false,refreshed=0,inviteChecked=0;const recipients=new Map<string,string>();const bots=new Map<string,TeamSelection>();
 async function tick(){
  if(busy)return;busy=true;
  try{
   if(Date.now()-refreshed>60000){
    const next=new Map<string,TeamSelection>(),nextRecipients=new Map<string,string>();
    for(let page=1;;page++){
     const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});if(error)throw error;
     for(const user of data.users){if(!user.is_anonymous&&user.app_metadata.community_bot!==true&&user.app_metadata.multiplayer_playtest===true&&typeof user.app_metadata.bot_invites_since==='string'&&Number.isFinite(Date.parse(user.app_metadata.bot_invites_since)))nextRecipients.set(user.id,user.app_metadata.bot_invites_since);const team=defaultTeam(user.user_metadata.open_play_team);if(user.app_metadata.community_bot===true&&user.app_metadata.multiplayer_playtest===true&&team)next.set(user.id,team);}
     if(data.users.length<1000)break;
    }
    recipients.clear();for(const [id,since] of nextRecipients)recipients.set(id,since);
    bots.clear();for(const [id,team] of next)bots.set(id,team);refreshed=Date.now();
   }
   if(!bots.size)return;
   await refreshAccounts();const ids=[...bots.keys()];
   if(Date.now()-inviteChecked>60000){
    inviteChecked=Date.now();
    for(const [recipient,since] of recipients){
     try{
      const latest=await client.from('async_invitations').select('id,created_at').eq('recipient_id',recipient).in('creator_id',ids).order('created_at',{ascending:false}).limit(1);if(latest.error)throw latest.error;
      const last=latest.data[0],plan=surpriseInvitePlan(recipient,last?.created_at??since,ids,!last);
      if(Date.now()<plan.due||!plan.botId)continue;
      const waiting=await client.from('async_invitations').select('id').eq('recipient_id',recipient).in('creator_id',ids).eq('status','pending').limit(1);if(waiting.error)throw waiting.error;if(waiting.data.length)continue;
      await invitations.create(plan.botId,{requestId:plan.requestId,opponentId:recipient,team:bots.get(plan.botId)!,court:'forest',scoring:'rally-doubles',target:3});
     }catch(error){report(error);}
    }
   }
   const pending=await client.from('async_invitations').select('id,recipient_id,created_at').eq('status','pending').in('recipient_id',ids);if(pending.error)throw pending.error;
   for(const invite of pending.data){if(Date.now()-Date.parse(invite.created_at)<botDelay(invite.id,true))continue;try{await invitations.accept(invite.id,invite.recipient_id,{team:bots.get(invite.recipient_id)!});}catch(error){report(error);}}
   const turns=await client.from('async_matches').select('id,current_action_user_id,version,updated_at').eq('status','active').in('current_action_user_id',ids);if(turns.error)throw turns.error;
   for(const row of turns.data){if(Date.now()-Date.parse(row.updated_at)<botDelay(`${row.id}:${row.version}`))continue;try{const game=await matches.get(row.id,row.current_action_user_id);if(game.version!==row.version)continue;const action=botAction(game);if(action)await matches.act(row.id,row.current_action_user_id,action);}catch(error){report(error);}}
  }catch(error){report(error);}finally{busy=false;}
 }
 function report(error:unknown){const status=(error as {status?:number})?.status;if(status===409||status===404)return;console.warn('Community bot worker could not complete a check:',(error as {code?:string})?.code??'unavailable');}
 const timer=setInterval(()=>void tick(),2000);timer.unref();void tick();return ()=>clearInterval(timer);
}
