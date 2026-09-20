import {shotMixPanel} from './shot-mix-view';
import {playerFromRow} from '../cloud-players';
import {starterPlayer} from '../starter-player';
import {authClient} from '../auth-session';
import {editEmailDialog} from './edit-email-dialog';
import {browserStorage} from '../browser-storage';
import {OpenPlayStore} from '../persistence/open-play-store';
import {profileRecord} from '../profile-record';
import type {HistoryMatch} from '../player-history';
import type {AvatarThumbnails} from '../avatar-preview';
import {profileAvatar} from './team-directory';
import {remoteRequest} from './api';
import type {PublicMatch} from './protocol';

function node<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls=''){const el=document.createElement(tag);el.textContent=text;el.className=cls;return el;}
export function profilePanel(portraits:AvatarThumbnails|undefined,authenticate:(signup:boolean,guest:boolean)=>void,signOut:()=>Promise<void>){
 const panel=node('section','','lobby-profile own-profile');panel.setAttribute('aria-label','Your profile');panel.setAttribute('aria-busy','true');panel.append(node('p','Loading your profile…'));
 void (async()=>{
  const client=authClient();
  const session=client?await client.auth.getSession():null;
  if(session?.error)throw session.error;
  const user=session?.data.session?.user;
  panel.replaceChildren();
  if(!user||user.is_anonymous){
   panel.append(node('h2','Your profile'),node('p','Create an account or sign in to see your player and game record.'));
   const actions=node('div','','lobby-profile-auth');
   for(const signup of [true,false]){const button=node('button',signup?'Create account':'Sign in',signup?'team-lobby-primary':'team-lobby-quiet');button.type='button';button.onclick=()=>authenticate(signup,!!user?.is_anonymous);actions.append(button);}
   panel.append(actions);return;
  }
  const name=typeof user.user_metadata.player_name==='string'?user.user_metadata.player_name.trim():'Player';
  const columns='id,name,catchphrase,appearance,skills,handedness,is_active,is_public';
  let {data:players,error:playerError}=await client!.from('players').select(columns).eq('owner_id',user.id).order('is_active',{ascending:false}).order('created_at').limit(1);
  if(playerError)throw playerError;
  if(!players?.length){
   const generated=starterPlayer(name,'starter');
   const {error}=await client!.from('players').upsert({owner_id:user.id,...generated,is_active:true},{onConflict:'owner_id,id',ignoreDuplicates:true});if(error)throw error;
   const result=await client!.from('players').select(columns).eq('owner_id',user.id).order('is_active',{ascending:false}).order('created_at').limit(1);if(result.error)throw result.error;players=result.data;
  }
  const player=players?.[0]?playerFromRow(players[0]):null;
  const header=node('header','','profile-identity');
  if(portraits){const avatar=node('img','','profile-avatar');avatar.src=portraits.get(player?.appearance??profileAvatar(user.id,user.user_metadata.profile_avatar),'face');avatar.alt=`${name||'Player'}’s avatar`;header.append(avatar);}
  const identity=node('div','','profile-identity-copy');
  const username=typeof user.user_metadata.username==='string'?user.user_metadata.username.trim():name;
  identity.append(node('h2',username||'Player'),node('p',name!==username?name:'PickleBash player','profile-display-name'));
  if(player?.catchphrase?.trim())identity.append(node('p',player.catchphrase.trim(),'profile-bio'));
  header.append(identity);panel.append(header);
  const actions=node('div','','profile-actions');
  if(player){const edit=node('a','Edit player','profile-edit');edit.href=`/?openplay=1&tab=roster&editPlayer=${encodeURIComponent(player.id)}`;actions.append(edit);}
  const roster=node('a','My roster','profile-roster');roster.href='/?openplay=1&tab=roster';actions.append(roster);
  const stats=node('dl','','lobby-profile-stats');
  const values=['Games','Wins','Losses'].map(label=>{const stat=node('div'),value=node('dd','—');stat.append(node('dt',label),value);stats.append(stat);return value;});
  const note=node('p','Loading your game record…','lobby-profile-note');note.setAttribute('role','status');panel.append(stats,actions,note);
  const insights=node('section','','profile-insights');insights.append(node('h3','Your game'),node('p','A closer look at how you play.','profile-section-copy'),shotMixPanel());panel.append(insights);
  const footer=node('footer','','lobby-profile-account'),signOutButton=node('button','Sign out','team-lobby-quiet'),accountStatus=node('p');
  signOutButton.type='button';accountStatus.setAttribute('role','status');
  let currentEmail=user.email??'';
  const accountLabel=node('p',currentEmail||name||'Player','profile-email'),editEmail=node('button','Edit email','team-lobby-quiet');editEmail.type='button';
  if(user.new_email&&user.new_email!==currentEmail)accountStatus.textContent=`Email change to ${user.new_email} awaits confirmation. Check your email inboxes.`;
  editEmail.onclick=()=>editEmailDialog(user.id,currentEmail,(email,pending)=>{currentEmail=email;accountLabel.textContent=email;accountStatus.textContent=pending?`Email change to ${pending} awaits confirmation. Check your email inboxes.`:'Email address updated.';});
  const accountActions=node('div','','profile-account-actions');accountActions.append(editEmail,signOutButton);footer.append(node('span','Email address','profile-account-label'),accountLabel,accountActions,accountStatus);const settings=node('details','','profile-account-settings');settings.append(node('summary','Account settings'),footer);panel.append(settings);
  signOutButton.onclick=()=>{signOutButton.disabled=true;signOutButton.textContent='Signing out…';accountStatus.textContent='';void signOut().catch(()=>{accountStatus.textContent='Could not sign out. Please try again.';}).finally(()=>{signOutButton.disabled=false;signOutButton.textContent='Sign out';});};
  try{
   const history=async()=>{const matches:HistoryMatch[]=[];for(let offset=0;;offset+=500){const result=await client!.from('match_history').select('id,home_names,away_names,home_score,away_score,ended_early,completed_at').eq('owner_id',user.id).order('completed_at',{ascending:false}).order('id').range(offset,offset+499);if(result.error)throw result.error;matches.push(...result.data);if(result.data.length<500)return matches;}};
   const [saved,remote]=await Promise.all([history(),remoteRequest<PublicMatch[]>(session!.data.session!.access_token,'/api/matches')]);
   const record=profileRecord(saved,new OpenPlayStore(browserStorage,user.id).list(),remote);
   [record.games,record.wins,record.losses].forEach((value,i)=>values[i].textContent=String(value));
   note.remove();
  }catch{note.textContent='Your game record is unavailable right now.';}
 })().catch(()=>{panel.replaceChildren(node('p','Your profile could not be loaded. Please refresh to try again.'));}).finally(()=>panel.setAttribute('aria-busy','false'));
 return panel;
}
