import {stageGuestAccountPlayer,prepareAccountPlayerTransfer,transferPendingAccountPlayer} from '../pending-account-player';
import {Analytics} from '../analytics';
import {loadScoringPreference,saveScoringPreference,type ScoringPreference} from '../scoring-preference';
import './account-dialog.css';
import {showViewDialog} from '../view-focus';
import {hudButtonIcon} from '../hud-button';
import {matchShare,showGameShare,type MatchShareContext} from './game-share';
import {showTurnPromptAfterInvite} from '../pwa';
import {copyInviteLink} from './pending-invite-card';
import {TeamPicker} from './team-picker';
import type {TeamSelection} from './invitation-protocol';
import {guestRegistration} from './guest-registration';
import {authClient,matchCredentials,playerPasswordSession} from '../auth-session';
import {browserStorage} from '../browser-storage';
import {playerId} from '../player-design';
import {remoteRequest} from './api';
import {publicOrigin} from '../native-origin';
import {signInDialog} from './sign-in-dialog';
import {FIRST_GAME_WELCOME_URL} from '../first-game-welcome';
function track(event:string,token?:string){void matchCredentials().then(c=>remoteRequest(c.token,'/api/multiplayer/invite-event',{event,token})).catch(()=>{});}
export interface FriendChallenge {token:string;matchId:string;inviterName:string;invitedName:string;status:string}
function panel(title:string,closeButton=true){const dialog=document.createElement('dialog');dialog.className='friend-dialog remote-new-game';const h=document.createElement('h1');h.textContent=title;if(closeButton){const close=document.createElement('button');close.className='remote-quiet';close.textContent='Close';close.onclick=()=>dialog.close();dialog.append(close);}dialog.append(h);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());showViewDialog(dialog);return dialog;}
function dismissOnBackdrop(dialog:HTMLDialogElement){dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();});}
function button(label:string,primary=false){const b=document.createElement('button');b.type='button';b.className=primary?'remote-primary':'remote-quiet';b.textContent=label;return b;}
export function inviteFriend(done:(game:string)=>Promise<void>,initial?:TeamSelection){
 track('invite_friend_started');
 const d=panel('Private match');const intro=document.createElement('p');intro.textContent='Invite a friend to manage the opposing team. Each of you chooses and controls two athletes.';d.append(intro);d.classList.add('friend-team-dialog');const heading=document.createElement('h2');heading.textContent='Team A · You manage';const teamHost=document.createElement('div');d.append(heading,teamHost);const picker=new TeamPicker(teamHost,undefined,initial);const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input');label.textContent='Team B · Invite a friend to manage this team';input.autocomplete='off';input.placeholder='Ryan';input.maxLength=24;input.required=true;label.append(input);const create=button('Create private invitation',true);create.type='submit';const status=document.createElement('p');status.setAttribute('role','status');form.append(label,create,status);d.append(form);input.focus({preventScroll:true});
 form.onsubmit=e=>{e.preventDefault();if(create.disabled)return;track('invite_name_entered');create.disabled=true;teamHost.inert=true;input.disabled=true;void(async()=>{const c=await matchCredentials(),key=`pickle-friend-draft:${c.owner}`,team=await picker.freshTeam(),name=input.value.trim();const preference=loadScoringPreference();let draft:{name:string;team:TeamSelection;requestId:string}&ScoringPreference;let cached;try{cached=JSON.parse(browserStorage.getItem(key)??'null')}catch{}draft=cached&&cached.name===name&&JSON.stringify(cached.team)===JSON.stringify(team)&&cached.scoring===preference.scoring&&cached.target===preference.target?cached:{name,team,requestId:playerId(),...preference};browserStorage.setItem(key,JSON.stringify(draft));const challenge=await remoteRequest<FriendChallenge>(c.token,'/api/multiplayer/challenges',draft);saveScoringPreference(draft);browserStorage.removeItem(key);d.close();await done(challenge.matchId);shareChallenge(challenge,true).addEventListener('close',showTurnPromptAfterInvite,{once:true});})().catch(e=>{status.textContent=e.message;create.disabled=false;teamHost.inert=false;input.disabled=false;});};
}
export function shareChallenge(i:FriendChallenge,openShare=false){
 if(i.status!=='pending')return showGameShare(matchShare(i.matchId,{opponentName:i.invitedName,opponentTurn:false}));
 const d=panel(`Waiting for ${i.invitedName}`);d.classList.add('friend-share-dialog');
 const close=d.querySelector('button')!;close.className='friend-share-close';close.setAttribute('aria-label','Close');close.title='Close';close.innerHTML=hudButtonIcon('close');
 const intro=document.createElement('p');intro.className='friend-share-intro';intro.textContent='Share the game link with your friends to start playing.';
 const url=new URL(`/challenge/${i.token}`,publicOrigin()).href,link=document.createElement('input');link.value=url;link.readOnly=true;link.setAttribute('aria-label','Challenge link');link.onclick=()=>link.select();
 const send=button(`Text ${i.invitedName} a link`,true),copy=button('Copy Link'),message=document.createElement('p');message.setAttribute('role','status');
 async function copyLink(){try{await copyInviteLink(url);message.textContent='Link copied.';track('invite_link_copied',i.token);}catch{link.focus();link.select();message.textContent='Select and copy the link above.';}}
 const nativeShare=()=>navigator.share({title:'PickleBash challenge',text:`${i.inviterName} challenged you to PickleBash. Think you can outplay them?`,url});
 send.onclick=()=>{track('invite_share_opened',i.token);if(typeof navigator.share==='function')void nativeShare().then(()=>track('invite_share_completed',i.token)).catch(e=>{if(e.name!=='AbortError')void copyLink();});else void copyLink();};copy.onclick=()=>void copyLink();
 const actions=document.createElement('div');actions.className='friend-share-actions';actions.append(copy,send);
 const cancel=document.createElement('a');cancel.href='#';cancel.className='friend-share-cancel';cancel.textContent='Cancel Invitation';
 let cancelling=false;
 cancel.onclick=event=>{event.preventDefault();if(cancelling)return;cancelling=true;cancel.setAttribute('aria-disabled','true');message.textContent='';void matchCredentials().then(c=>remoteRequest(c.token,`/api/multiplayer/challenges/${i.token}/cancel`,{})).then(()=>{d.close();location.assign('/?openplay=1');}).catch(error=>{message.textContent=(error as Error).message||'Could not cancel the invitation. Please try again.';cancelling=false;cancel.removeAttribute('aria-disabled');});};
 d.append(intro,link,actions,message,cancel);
 if(openShare&&typeof navigator.share==='function')void nativeShare().then(()=>track('invite_share_completed',i.token)).catch(()=>{});
 let checking=false;const refresh=setInterval(()=>{if(document.hidden||checking)return;checking=true;void matchCredentials().then(c=>remoteRequest<FriendChallenge>(c.token,`/api/multiplayer/challenge-for-match/${i.matchId}`)).then(next=>{if(next.status!=='pending')d.close();}).catch(()=>{}).finally(()=>{checking=false;});},5000);d.addEventListener('close',()=>clearInterval(refresh));return d;
}
export async function shareMatch(id:string,pending=false,context?:MatchShareContext){if(!pending){showGameShare(matchShare(id,context));return;}const c=await matchCredentials();shareChallenge(await remoteRequest<FriendChallenge>(c.token,`/api/multiplayer/challenge-for-match/${id}`));}
export interface CreatePlayerAccountOptions {playerName?:string;onSignIn?:()=>Promise<void>;onSignInSelected?:()=>void;saveProgress?:boolean;canOpen?:()=>boolean;onShown?:()=>void;completionDestination?:string}
export async function createYourPlayer(onComplete:()=>Promise<void>=async()=>{},options:CreatePlayerAccountOptions={}):Promise<boolean>{
 await stageGuestAccountPlayer();
 const client=authClient();if(!client)throw Error('Account creation is unavailable. Please try again later.');const {data:{session},error}=await client.auth.getSession();if(error)throw error;if(session&&!session.user.is_anonymous)return true;
 if(options.saveProgress&&!session)throw Error('Reconnect to your guest session before saving progress. Your game is still on this device.');
 if(options.canOpen&&!options.canOpen())return false;
 track('guest_registration_started');Analytics.track('onboarding_started',{source:'account_dialog'});
 const d=panel(options.saveProgress?'Save your progress':'Create An Account',false),copy=document.createElement('p');dismissOnBackdrop(d);copy.textContent='Save your progress and your games with your friends';const form=document.createElement('form');
 d.classList.add('friend-account-dialog');
 const close=button('');close.className='friend-account-close';close.innerHTML=hudButtonIcon('close');close.setAttribute('aria-label','Close account creation');close.onclick=()=>d.close();d.prepend(close);
 const usernameLabel=document.createElement('label'),usernameInput=document.createElement('input');usernameInput.setAttribute('aria-label','Username');usernameInput.required=true;usernameInput.autocomplete='username';usernameInput.minLength=3;usernameInput.maxLength=24;usernameInput.pattern='[A-Za-z0-9_]{3,24}';usernameInput.placeholder='Username';usernameLabel.append(usernameInput);form.append(usernameLabel);
 const fields=['Email','Password'].map(name=>{const label=document.createElement('label'),input=document.createElement('input');input.setAttribute('aria-label',name);input.placeholder=name;input.type=name.toLowerCase();input.autocomplete=name==='Email'?'email':'new-password';input.required=true;if(name==='Password'){input.minLength=6;input.maxLength=128;}label.append(input);form.append(label);return input;});
 const save=button(options.saveProgress?'Create account & save progress':'Create Account',true);save.type='submit';const signIn=button('Already have an account? Sign in');const message=document.createElement('p');message.setAttribute('role','status');form.append(save,message);d.append(copy,form,signIn);
 if(options.saveProgress){const later=button('Not now');later.onclick=()=>d.close();d.append(later);}
 options.onShown?.();
 let completed=false;const outcome=new Promise<boolean>(resolve=>d.addEventListener('close',()=>resolve(completed),{once:true}));
 signIn.onclick=()=>{options.onSignInSelected?.();d.close();signInDialog(options.onSignIn??onComplete,()=>{void createYourPlayer(onComplete,options);},options.completionDestination)};
 const accountPlayerName=()=>options.playerName?.trim()||usernameInput.value.trim();
 const register=session?guestRegistration(session.user.id,credentials=>remoteRequest(session.access_token,'/api/multiplayer/claim-player',{...credentials,username:usernameInput.value.trim(),playerName:typeof session.user.user_metadata.player_name==='string'&&session.user.user_metadata.player_name.trim()?session.user.user_metadata.player_name.trim():accountPlayerName()}),{signIn:playerPasswordSession,install:async fresh=>{prepareAccountPlayerTransfer();if(options.completionDestination)history.replaceState(null,'',options.completionDestination);const {error}=await client.auth.setSession(fresh);if(error)throw error;}}):async(credentials:{email:string;password:string})=>{
  await remoteRequest('', '/api/multiplayer/register',{...credentials,username:usernameInput.value.trim(),playerName:accountPlayerName()});
  const fresh=await playerPasswordSession(credentials);
  prepareAccountPlayerTransfer();if(options.completionDestination)history.replaceState(null,'',options.completionDestination);const {error}=await client.auth.setSession(fresh);if(error)throw error;
 };
 form.onsubmit=e=>{e.preventDefault();if(save.disabled)return;save.disabled=true;signIn.disabled=true;message.textContent='Creating your account…';void(async()=>{await register({email:fields[0].value.trim(),password:fields[1].value});fields[1].value='';await transferPendingAccountPlayer();await onComplete();Analytics.track('onboarding_completed',{source:'account_dialog'});completed=true;const destination=options.completionDestination??FIRST_GAME_WELCOME_URL;history.replaceState(null,'',destination);d.close();setTimeout(()=>location.assign(destination),0);})().catch(e=>{message.textContent=e.message;save.disabled=false;signIn.disabled=false;});};
 return outcome;
}
