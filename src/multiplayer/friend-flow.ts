import {hudButtonIcon} from '../hud-button';
import {matchShare,showGameShare} from './game-share';
import {showTurnPromptAfterInvite} from '../pwa';
import {copyInviteLink} from './pending-invite-card';
import {TeamPicker} from './team-picker';
import type {TeamSelection} from './invitation-protocol';
import {guestRegistration} from './guest-registration';
import {authClient,matchCredentials,playerPasswordSession} from '../auth-session';
import {browserStorage} from '../browser-storage';
import {playerId} from '../player-design';
import {remoteRequest} from './api';
function track(event:string,token?:string){void matchCredentials().then(c=>remoteRequest(c.token,'/api/multiplayer/invite-event',{event,token})).catch(()=>{});}
export interface FriendChallenge {token:string;matchId:string;inviterName:string;invitedName:string;status:string}
function panel(title:string){const dialog=document.createElement('dialog');dialog.className='friend-dialog remote-new-game';const h=document.createElement('h1');h.textContent=title;const close=document.createElement('button');close.className='remote-quiet';close.textContent='Close';close.onclick=()=>dialog.close();dialog.append(close,h);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();return dialog;}
function button(label:string,primary=false){const b=document.createElement('button');b.type='button';b.className=primary?'remote-primary':'remote-quiet';b.textContent=label;return b;}
export function inviteFriend(done:(game:string)=>Promise<void>,initial?:TeamSelection){
 track('invite_friend_started');
 const d=panel('Private match');const intro=document.createElement('p');intro.textContent='Invite a friend to manage the opposing team. Each of you chooses and controls two athletes.';d.append(intro);d.classList.add('friend-team-dialog');const heading=document.createElement('h2');heading.textContent='Team A · You manage';const teamHost=document.createElement('div');d.append(heading,teamHost);const picker=new TeamPicker(teamHost,undefined,initial);const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input');label.textContent='Team B · Invite a friend to manage this team';input.autocomplete='off';input.placeholder='Ryan';input.maxLength=24;input.required=true;label.append(input);const create=button('Create private invitation',true);create.type='submit';const status=document.createElement('p');status.setAttribute('role','status');form.append(label,create,status);d.append(form);input.focus({preventScroll:true});
 form.onsubmit=e=>{e.preventDefault();if(create.disabled)return;track('invite_name_entered');create.disabled=true;teamHost.inert=true;input.disabled=true;void(async()=>{const c=await matchCredentials(),key=`pickle-friend-draft:${c.owner}`,team=await picker.freshTeam(),name=input.value.trim();let draft:{name:string;team:TeamSelection;requestId:string};let cached;try{cached=JSON.parse(browserStorage.getItem(key)??'null')}catch{}draft=cached&&cached.name===name&&JSON.stringify(cached.team)===JSON.stringify(team)?cached:{name,team,requestId:playerId()};browserStorage.setItem(key,JSON.stringify(draft));const challenge=await remoteRequest<FriendChallenge>(c.token,'/api/multiplayer/challenges',draft);browserStorage.removeItem(key);d.close();await done(challenge.matchId);shareChallenge(challenge,true).addEventListener('close',showTurnPromptAfterInvite,{once:true});})().catch(e=>{status.textContent=e.message;create.disabled=false;teamHost.inert=false;input.disabled=false;});};
}
export function shareChallenge(i:FriendChallenge,openShare=false){
 if(i.status!=='pending')return showGameShare(matchShare(i.matchId));
 const d=panel(`Waiting for ${i.invitedName}`);d.classList.add('friend-share-dialog');
 const close=d.querySelector('button')!;close.className='friend-share-close';close.setAttribute('aria-label','Close');close.title='Close';close.innerHTML=hudButtonIcon('close');
 const intro=document.createElement('p');intro.className='friend-share-intro';intro.textContent='Share the game link with your friends to start playing.';
 const url=new URL(`/challenge/${i.token}`,location.origin).href,link=document.createElement('input');link.value=url;link.readOnly=true;link.setAttribute('aria-label','Challenge link');link.onclick=()=>link.select();
 const send=button('Send Challenge',true),copy=button('Copy Link'),message=document.createElement('p');message.setAttribute('role','status');
 async function copyLink(){try{await copyInviteLink(url);message.textContent='Link copied.';track('invite_link_copied',i.token);}catch{link.focus();link.select();message.textContent='Select and copy the link above.';}}
 const nativeShare=()=>navigator.share({title:'PickleBash challenge',text:`${i.inviterName} challenged you to PickleBash. Think you can outplay them?`,url});
 send.onclick=()=>{track('invite_share_opened',i.token);if(typeof navigator.share==='function')void nativeShare().catch(e=>{if(e.name!=='AbortError')void copyLink();});else void copyLink();};copy.onclick=()=>void copyLink();
 const actions=document.createElement('div');actions.className='friend-share-actions';actions.append(copy,send);
 const cancel=document.createElement('a');cancel.href='#';cancel.className='friend-share-cancel';cancel.textContent='Cancel Invitation';
 let cancelling=false;
 cancel.onclick=event=>{event.preventDefault();if(cancelling)return;cancelling=true;cancel.setAttribute('aria-disabled','true');message.textContent='';void matchCredentials().then(c=>remoteRequest(c.token,`/api/multiplayer/challenges/${i.token}/cancel`,{})).then(()=>{d.close();location.assign('/?openplay=1');}).catch(error=>{message.textContent=(error as Error).message||'Could not cancel the invitation. Please try again.';cancelling=false;cancel.removeAttribute('aria-disabled');});};
 d.append(intro,link,actions,message,cancel);
 if(openShare&&typeof navigator.share==='function')void nativeShare().then(()=>track('invite_share_opened',i.token)).catch(()=>{});
 let checking=false;const refresh=setInterval(()=>{if(document.hidden||checking)return;checking=true;void matchCredentials().then(c=>remoteRequest<FriendChallenge>(c.token,`/api/multiplayer/challenge-for-match/${i.matchId}`)).then(next=>{if(next.status!=='pending')d.close();}).catch(()=>{}).finally(()=>{checking=false;});},5000);d.addEventListener('close',()=>clearInterval(refresh));return d;
}
export async function shareMatch(id:string,pending=false){if(!pending){showGameShare(matchShare(id));return;}const c=await matchCredentials();shareChallenge(await remoteRequest<FriendChallenge>(c.token,`/api/multiplayer/challenge-for-match/${id}`));}
export async function createYourPlayer(onComplete:()=>Promise<void>=async()=>{}){
 const client=authClient()!,{data:{session}}=await client.auth.getSession();if(session&&!session.user.is_anonymous)return;
 track('guest_registration_started');
 const d=panel('Create your player'),copy=document.createElement('p');copy.textContent='Save your games, customize your player, and challenge friends.';const form=document.createElement('form');
 const usernameLabel=document.createElement('label'),usernameInput=document.createElement('input');usernameLabel.textContent='Username';usernameInput.required=true;usernameInput.autocomplete='username';usernameInput.minLength=3;usernameInput.maxLength=24;usernameInput.pattern='[A-Za-z0-9_]{3,24}';usernameInput.placeholder='e.g. bobsmith';usernameLabel.append(usernameInput);form.append(usernameLabel);
 const fields=['Email','Password'].map(name=>{const label=document.createElement('label'),input=document.createElement('input');label.textContent=name;input.type=name.toLowerCase();input.autocomplete=name==='Email'?'email':'new-password';input.required=true;if(name==='Password'){input.minLength=6;input.maxLength=128;}label.append(input);form.append(label);return input;});
 const save=button('Save your progress',true);save.type='submit';const message=document.createElement('p');message.setAttribute('role','status');form.append(save,message);d.append(copy,form);
 const register=session?guestRegistration(session.user.id,credentials=>remoteRequest(session.access_token,'/api/multiplayer/claim-player',{...credentials,username:usernameInput.value.trim(),playerName:typeof session.user.user_metadata.player_name==='string'&&session.user.user_metadata.player_name.trim()?session.user.user_metadata.player_name.trim():usernameInput.value.trim()}),{signIn:playerPasswordSession,install:async fresh=>{const {error}=await client.auth.setSession(fresh);if(error)throw error;}}):async(credentials:{email:string;password:string})=>{
  await remoteRequest('', '/api/multiplayer/register',{...credentials,username:usernameInput.value.trim()});
  const fresh=await playerPasswordSession(credentials);
  const {error}=await client.auth.setSession(fresh);if(error)throw error;
 };
 form.onsubmit=e=>{e.preventDefault();if(save.disabled)return;save.disabled=true;message.textContent='Saving your player…';void(async()=>{await register({email:fields[0].value.trim(),password:fields[1].value});fields[1].value='';d.close();await onComplete();})().catch(e=>{message.textContent=e.message;save.disabled=false;});};
}
