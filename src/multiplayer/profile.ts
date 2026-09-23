import {playerFromRow} from '../cloud-players';
import {starterPlayer} from '../starter-player';
import {authClient,playerPasswordSession} from '../auth-session';
import {guestRegistration} from './guest-registration';
import {browserStorage} from '../browser-storage';
import {OpenPlayStore} from '../persistence/open-play-store';
import {profileRecord} from '../profile-record';
import type {HistoryMatch} from '../player-history';
import type {AvatarThumbnails} from '../avatar-preview';
import {profileAvatar} from './team-directory';
import {remoteRequest} from './api';
import type {PublicMatch} from './protocol';

function node<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls=''){const el=document.createElement(tag);el.textContent=text;el.className=cls;return el;}
function accountAccess(panel:HTMLElement,client:NonNullable<ReturnType<typeof authClient>>,session:Awaited<ReturnType<typeof client.auth.getSession>>['data']['session']){
 const heading=node('h2','Create your account'),copy=node('p','Save players, play with friends, and keep your games on every device.','profile-auth-copy');
 const form=node('form','','profile-auth-form') as HTMLFormElement,usernameLabel=node('label','Username *'),username=node('input') as HTMLInputElement,emailLabel=node('label','Email *'),email=node('input') as HTMLInputElement,passwordLabel=node('label','Password *'),password=node('input') as HTMLInputElement;
 username.name='username';username.required=true;username.autocomplete='username';username.minLength=3;username.maxLength=24;username.pattern='[A-Za-z0-9_]{3,24}';username.placeholder='e.g. luna17';usernameLabel.append(username);
 email.name='identifier';email.type='email';email.required=true;email.autocomplete='email';emailLabel.append(email);
 password.name='password';password.type='password';password.required=true;password.minLength=6;password.maxLength=128;password.autocomplete='new-password';passwordLabel.append(password);
 const submit=node('button','Create Account','team-lobby-primary') as HTMLButtonElement;submit.type='submit';const toggle=node('button','Already have an account? Sign in','team-lobby-quiet') as HTMLButtonElement;toggle.type='button';const message=node('p','','profile-auth-status');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 form.append(usernameLabel,emailLabel,passwordLabel,submit,message);panel.append(heading,copy,form,toggle);
 let signup=true;
 const sync=()=>{heading.textContent=signup?'Create your account':'Welcome back';copy.textContent=signup?'Save players, play with friends, and keep your games on every device.':'Sign in to see your roster, games, and profile.';usernameLabel.hidden=!signup;emailLabel.firstChild!.textContent=signup?'Email *':'Username or email *';email.type=signup?'email':'text';email.autocomplete='username';password.autocomplete=signup?'new-password':'current-password';password.minLength=signup?6:1;submit.textContent=signup?'Create Account':'Sign in';toggle.textContent=signup?'Already have an account? Sign in':'New here? Create an account';message.textContent='';};
 toggle.onclick=()=>{signup=!signup;sync();(signup?username:email).focus();};
 const register=session?.user.is_anonymous?guestRegistration(session.user.id,credentials=>remoteRequest(session.access_token,'/api/multiplayer/claim-player',{...credentials,username:username.value.trim(),playerName:username.value.trim()}),{signIn:playerPasswordSession,install:async fresh=>{const {error}=await client.auth.setSession(fresh);if(error)throw error;}}):async(credentials:{email:string;password:string})=>{await remoteRequest('','/api/multiplayer/register',{...credentials,username:username.value.trim(),playerName:username.value.trim()});const fresh=await playerPasswordSession(credentials);const {error}=await client.auth.setSession(fresh);if(error)throw error;};
 form.onsubmit=event=>{event.preventDefault();if(submit.disabled)return;submit.disabled=true;toggle.disabled=true;message.textContent=signup?'Creating your account…':'Signing in…';void(async()=>{if(signup)await register({email:email.value.trim(),password:password.value});else{const fresh=await remoteRequest<{access_token:string;refresh_token:string}>('','/api/multiplayer/sign-in',{identifier:email.value.trim(),password:password.value});const {error}=await client.auth.setSession(fresh);if(error)throw error;}password.value='';location.assign(signup?'/?openplay=1&setup=1':'/?openplay=1&tab=profile');})().catch(error=>{message.textContent=(error as Error).message;submit.disabled=false;toggle.disabled=false;});};
 sync();
}
export function profilePanel(portraits:AvatarThumbnails|undefined,authenticate:(signup:boolean,guest:boolean)=>void,signOut:()=>Promise<void>){
 const panel=node('section','','lobby-profile own-profile');panel.setAttribute('aria-label','Your profile');panel.setAttribute('aria-busy','true');panel.append(node('p','Loading your profile…'));
 void (async()=>{
  const client=authClient();
  const session=client?await client.auth.getSession():null;
  if(session?.error)throw session.error;
  const user=session?.data.session?.user;
  panel.replaceChildren();
  if(!user||user.is_anonymous){
   if(!client)throw new Error('Accounts are unavailable right now.');accountAccess(panel,client,session?.data.session??null);return;
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
  identity.append(node('span','Your corner of the court','profile-eyebrow'),node('h2',username||'Player'),node('p',name!==username?name:'PickleBash player','profile-display-name'));
  if(player?.catchphrase?.trim())identity.append(node('p',player.catchphrase.trim(),'profile-bio'));
  header.append(identity);panel.append(header);
  const actions=node('div','','profile-actions');
  if(player){const edit=node('a','Edit player','profile-edit');edit.href=`/?openplay=1&tab=roster&editPlayer=${encodeURIComponent(player.id)}`;actions.append(edit);}
  const roster=node('a','My roster','profile-roster');roster.href='/?openplay=1&tab=roster';actions.append(roster);
  const stats=node('dl','','lobby-profile-stats');
  const values=['Games','Wins','Losses'].map(label=>{const stat=node('div'),value=node('dd','—');stat.append(node('dt',label),value);stats.append(stat);return value;});
  const note=node('p','Loading your game record…','lobby-profile-note');note.setAttribute('role','status');panel.append(stats,actions,note);
  const progression=node('section','','profile-skill-progress');
  const progressHeader=node('div','','profile-progress-header'),progressTitle=node('div');
  progressTitle.append(node('span','Level up together','profile-eyebrow'),node('h3','Skill points'));
  const budgetBadge=node('div','','profile-budget-badge');budgetBadge.hidden=true;
  progressHeader.append(progressTitle,budgetBadge);
  const progressCopy=node('p','Loading your account skill budget…','profile-progress-copy');progressCopy.setAttribute('role','status');
  const progressBar=node('progress','','profile-progress-bar');progressBar.max=10;progressBar.hidden=true;progressBar.setAttribute('aria-label','Completed games toward your next skill point');
  const rewardNote=node('p','','profile-reward-note');
  progression.append(progressHeader,progressCopy,progressBar,rewardNote);panel.append(progression);
  void client!.rpc('my_skill_progress').then(({data,error})=>{
   if(error||!data){progressCopy.textContent='Skill progress is unavailable right now.';return;}
   budgetBadge.replaceChildren(node('strong',String(data.budget)),node('span','per player'));budgetBadge.hidden=false;
   progressCopy.textContent=data.nextAt===null?'Maximum budget reached. Make every point count.':`${data.nextAt-data.games} more ${data.nextAt-data.games===1?'game':'games'} to your next skill point.`;
   progressBar.value=data.nextAt===null?10:data.games%10;progressBar.hidden=false;
   rewardNote.textContent=`${data.games} completed online games · Every 10 earns +1 point, up to 45.`;
  });
  const footer=node('footer','','lobby-profile-account'),signOutButton=node('button','Sign out','team-lobby-quiet'),accountStatus=node('p');
  signOutButton.type='button';accountStatus.setAttribute('role','status');
  const currentEmail=user.email??'';
  const accountLabel=node('p',currentEmail||name||'Player','profile-email');
  if(user.new_email&&user.new_email!==currentEmail)accountStatus.textContent=`Email change to ${user.new_email} awaits confirmation. Check your email inboxes.`;
  const accountActions=node('div','','profile-account-actions');accountActions.append(signOutButton);footer.append(node('span','Email address','profile-account-label'),accountLabel,accountActions,accountStatus);const settings=node('details','','profile-account-settings');settings.append(node('summary','Account settings'),footer);panel.append(settings);
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
