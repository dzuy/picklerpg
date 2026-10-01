import {openAccountDeletion,openBlockedPlayers} from '../account-safety';
import {App} from '@capacitor/app';
import {Capacitor} from '@capacitor/core';
import {ownsPack} from '../pack-catalog';
import {premiumStatus} from '../premium';
import {premiumAppearance} from '../premium-appearance';
import {loadAccountProgress} from '../account-xp';
import {playerFromRow} from '../cloud-players';
import {starterPlayer} from '../starter-player';
import {authClient} from '../auth-session';
import {browserStorage} from '../browser-storage';
import {OpenPlayStore} from '../persistence/open-play-store';
import {profileRecord} from '../profile-record';
import type {HistoryMatch} from '../player-history';
import {AvatarPreview,type AvatarThumbnails} from '../avatar-preview';
import {preloadAthletes} from '../athlete';
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
   authenticate(true,!!user?.is_anonymous);return;
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
  const membership=await premiumStatus().catch(()=>null);
  if(player){
   const model=node('div','','profile-player-model');header.append(model);
   const effective={...player,appearance:premiumAppearance(player.appearance,membership?.ownedPacks??[])};
   void preloadAthletes().then(()=>{
    if(!panel.isConnected)return;
    let preview:AvatarPreview|undefined;
    try{preview=new AvatarPreview(model,true,1.1,{interactive:false});preview.setPlayer(effective);
     const observer=new MutationObserver(()=>{if(!panel.isConnected){observer.disconnect();preview?.dispose();}});observer.observe(document.body,{childList:true,subtree:true});
    }catch{preview?.dispose();if(portraits){const image=node('img','','profile-player-fallback');image.src=portraits.get(effective.appearance,'full');image.alt=`${name||'Player'}’s player`;model.append(image);}}
   }).catch(()=>{});
  }
  const identity=node('div','','profile-identity-copy');
  const username=typeof user.user_metadata.username==='string'?user.user_metadata.username.trim():name;
  identity.append(node('h2',username||'Player'));
  if(name&&name!==username)identity.append(node('p',name,'profile-display-name'));
  if(player?.catchphrase?.trim())identity.append(node('p',player.catchphrase.trim(),'profile-bio'));
  if(player){const edit=node('a','Edit Player','profile-edit');edit.href=`/?openplay=1&tab=roster&editPlayer=${encodeURIComponent(player.id)}`;identity.append(edit);}
  header.append(identity);panel.append(header);
  const loadHistory=async()=>{
   const history=async()=>{const matches:HistoryMatch[]=[];for(let offset=0;;offset+=500){const result=await client!.from('match_history').select('id,home_names,away_names,home_score,away_score,ended_early,completed_at').eq('owner_id',user.id).order('completed_at',{ascending:false}).order('id').range(offset,offset+499);if(result.error)throw result.error;matches.push(...result.data);if(result.data.length<500)return matches;}};
   const [saved,remote]=await Promise.all([history(),remoteRequest<PublicMatch[]>(session!.data.session!.access_token,'/api/matches')]);
   return {saved,remote,local:new OpenPlayStore(browserStorage,user.id).list()};
  };
  const stats=node('dl','','lobby-profile-stats');
  const values=['Games','Wins','Losses'].map(label=>{const stat=node('div'),value=node('dd','—');stat.append(node('dt',label),value);stats.append(stat);return value;});
  const note=node('p','Loading your game record…','lobby-profile-note');note.setAttribute('role','status');panel.append(stats,note);
  const progression=node('section','','profile-skill-progress');
  panel.append(progression);void loadAccountProgress(progression,true);
  const settings=node('details','','profile-account-settings');settings.append(node('summary','Help and Account Settings'));
  const footer=node('footer','','lobby-profile-account'),signOutButton=node('button','Sign out','profile-sign-out'),accountStatus=node('p');
  const blocked=node('button','Blocked Players','profile-sign-out');blocked.type='button';blocked.setAttribute('aria-haspopup','dialog');blocked.onclick=()=>openBlockedPlayers();
  signOutButton.type='button';accountStatus.setAttribute('role','status');
  const currentEmail=user.email??'';
  if(user.new_email&&user.new_email!==currentEmail)accountStatus.textContent=`Email change to ${user.new_email} awaits confirmation. Check your email inboxes.`;
  const version=node('small','','profile-app-version');
  const formatVersion=(value:string,build?:string)=>`v${value.replace(/(?:\.0)+$/,'')}${build?`.b${build}`:''}`;
  const configuredVersion=String(import.meta.env.VITE_APP_VERSION||'1.0(18)');
  const versionParts=/^(\d+(?:\.\d+)*)(?:\((\d+)\))?$/.exec(configuredVersion);
  version.textContent=versionParts?formatVersion(versionParts[1],versionParts[2]):configuredVersion;
  if(Capacitor.isNativePlatform())void App.getInfo().then(info=>{version.textContent=formatVersion(info.version,info.build);}).catch(()=>{});
  const deletion=node('button','Delete account','profile-sign-out');deletion.type='button';deletion.onclick=()=>openAccountDeletion();const support=node('a','Help & support','profile-sign-out');support.href='https://picklebash.app/support';support.target='_blank';support.rel='noopener';const feedback=node('a','Feedback','profile-sign-out');feedback.href='mailto:poppy@picklebash.app';footer.append(blocked,signOutButton,deletion,support,feedback,accountStatus,version);settings.append(footer);panel.append(settings);
  signOutButton.onclick=()=>{signOutButton.disabled=true;signOutButton.textContent='Signing out…';accountStatus.textContent='';void signOut().catch(()=>{accountStatus.textContent='Could not sign out. Please try again.';}).finally(()=>{signOutButton.disabled=false;signOutButton.textContent='Sign out';});};
  try{
   const {saved,remote,local}=await loadHistory();
   const record=profileRecord(saved,local,remote);
   [record.games,record.wins,record.losses].forEach((value,i)=>values[i].textContent=String(value));
   note.remove();
  }catch{note.textContent='Your game record is unavailable right now.';}
 })().catch(()=>{panel.replaceChildren(node('p','Your profile could not be loaded. Please refresh to try again.'));}).finally(()=>panel.setAttribute('aria-busy','false'));
 return panel;
}
