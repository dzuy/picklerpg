import {defaultTeam} from './team-directory';
import '../style.css';
import './remote.css';
import './lobby.css';
import {TeamPicker} from './team-picker';
import {playerFromRow} from '../cloud-players';
import type {TeamSelection} from './invitation-protocol';
import type {Session} from '@supabase/supabase-js';
import {authClient} from '../auth-session';
import {browserStorage} from '../browser-storage';
import {remoteRequest,RemoteError} from './api';
import {challengeToken} from './challenge-link';
import {openChallengeGame} from './open-challenge-game';
import {challengeIdentity,type ChallengeUser} from './challenge-identity';
const root=document.querySelector<HTMLDivElement>('#app')!;root.className='remote-app friend-page';document.body.dataset.screen='remote';
root.innerHTML=`<section class="remote-new-game friend-panel"><p class="remote-eyebrow">PICKLEBASH CHALLENGE</p><h1>Opening your challenge…</h1><p id="challenge-copy"></p><h2 id="challenge-matchup"></h2><section id="challenge-team" class="friend-team-dialog" hidden><h2>Your team</h2><div id="challenge-team-cards"></div></section><button id="challenge-accept" class="remote-primary" hidden>Accept Challenge</button><p id="challenge-identity" hidden></p><button id="challenge-switch-player" class="remote-quiet" hidden></button><button id="challenge-sign-in" class="remote-quiet" hidden>Sign in to return</button><form id="challenge-register" hidden aria-label="Create your account"><h2>Create your account</h2><p>Save this game so you can come back on any device.</p><label>Player name<input id="challenge-player-name" autocomplete="nickname" maxlength="32" required></label><label>Username<input id="challenge-username" autocomplete="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="e.g. lunaplays" required><small>Unique · 3–24 letters, numbers, or underscores.</small></label><label>Email<input id="challenge-register-email" type="email" autocomplete="email" required></label><label>Password<input id="challenge-register-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required></label><button class="remote-primary" type="submit">Create account & play</button><button id="challenge-existing-account" class="friend-auth-switch" type="button">Already have an account? Sign in</button></form><form id="challenge-login" hidden aria-label="Sign in to your game"><h2>Welcome back</h2><p>Sign in with the account you use for PickleBash.</p><label>Email<input id="challenge-email" type="email" autocomplete="username" required></label><label>Password<input id="challenge-password" type="password" autocomplete="current-password" required></label><button class="remote-primary" type="submit">Sign in & continue</button><button id="challenge-login-back" class="friend-auth-switch" type="button">New here? Create an account</button></form><p role="status" id="challenge-status"></p><a id="challenge-home" href="/?multiplayer=1" hidden>Start a new game</a></section>`;
const token=challengeToken(location.pathname),button=document.querySelector<HTMLButtonElement>('#challenge-accept')!,message=document.querySelector<HTMLElement>('#challenge-status')!;
const signIn=document.querySelector<HTMLButtonElement>('#challenge-sign-in')!,form=document.querySelector<HTMLFormElement>('#challenge-login')!;
const email=document.querySelector<HTMLInputElement>('#challenge-email')!,password=document.querySelector<HTMLInputElement>('#challenge-password')!;
const registerForm=document.querySelector<HTMLFormElement>('#challenge-register')!,playerName=document.querySelector<HTMLInputElement>('#challenge-player-name')!,username=document.querySelector<HTMLInputElement>('#challenge-username')!;
const registerEmail=document.querySelector<HTMLInputElement>('#challenge-register-email')!,registerPassword=document.querySelector<HTMLInputElement>('#challenge-register-password')!;
const loginBack=document.querySelector<HTMLButtonElement>('#challenge-login-back')!;
const teamSection=document.querySelector<HTMLElement>('#challenge-team')!,teamHost=document.querySelector<HTMLElement>('#challenge-team-cards')!;
let teamPicker:TeamPicker|undefined,teamOwner:string|null=null;
let needsSignIn=false,accepted=false,invitedName='',displayedActor:string|null=null;
const identityCopy=document.querySelector<HTMLElement>('#challenge-identity')!,switchPlayer=document.querySelector<HTMLButtonElement>('#challenge-switch-player')!;
function showIdentity(user:ChallengeUser|null){
 if(user?.id!==teamOwner){teamPicker=undefined;teamOwner=null;teamSection.hidden=true;}
 displayedActor=user?.id??null;identityCopy.hidden=true;switchPlayer.hidden=true;if(!accepted)button.textContent='Accept Challenge';
 if(accepted||!user)return;const identity=challengeIdentity(user,invitedName);button.textContent=identity.needsChoice?`Accept as ${identity.name}`:'Accept Challenge';
 if(!identity.needsChoice)return;identityCopy.hidden=false;identityCopy.textContent=identity.canSwitch?`You’re signed in as ${identity.name}. This invitation is for ${invitedName}.`:`You’re playing as ${identity.name}. To play as ${invitedName} without losing this player, open the link in a different browser profile.`;
 switchPlayer.hidden=!identity.canSwitch;switchPlayer.textContent=`Play as ${invitedName}`;
}

function showSignIn(copy='Sign in to return to this match.'){
 button.hidden=true;signIn.hidden=true;switchPlayer.hidden=true;identityCopy.hidden=true;registerForm.hidden=true;form.hidden=false;message.textContent=copy;email.focus();
}
function showCreateAccount(){
 button.hidden=true;signIn.hidden=true;switchPlayer.hidden=true;identityCopy.hidden=true;form.hidden=true;registerForm.hidden=false;message.textContent='';playerName.value ||= invitedName;playerName.focus();
}
signIn.onclick=()=>showSignIn();
document.querySelector<HTMLButtonElement>('#challenge-existing-account')!.onclick=()=>showSignIn('');
loginBack.onclick=()=>{if(!accepted){showCreateAccount();return;}form.hidden=true;button.hidden=false;signIn.hidden=needsSignIn;message.textContent='';};
async function join(accessToken:string,acceptAs?:string,team?:TeamSelection){
 const game=await remoteRequest<{matchId:string}>(accessToken,`/api/multiplayer/challenges/${token}/accept`,{...(acceptAs?{acceptAs}:{}),...(team?{team}:{})});
 browserStorage.setItem('pickle-email-accounts-v1','1');return game;
}
async function prepareJoin(session:Session,acceptAs?:string){
 if(!accepted&&!session.user.is_anonymous){
  if(teamOwner!==session.user.id){
   message.textContent='Loading your roster…';
   const {data,error}=await authClient()!.from('players').select('id,name,catchphrase,appearance,skills,handedness,is_active,is_public').eq('owner_id',session.user.id);
   if(error)throw Error('Could not load your roster. Please try again.');
   teamPicker=new TeamPicker(teamHost,(data??[]).map(playerFromRow),defaultTeam(session.user.user_metadata.open_play_team)??undefined);
   const hasTeam=await teamPicker.hasTeam();teamOwner=session.user.id;
   if(hasTeam){teamSection.hidden=false;button.textContent='Start game';message.textContent='Choose your player and partner, then start the game.';return null;}
   teamPicker=undefined;
  }
  if(teamPicker)return join(session.access_token,acceptAs,await teamPicker.freshTeam());
 }
 return join(session.access_token,acceptAs);
}
async function openGame(game:{matchId:string}){await openChallengeGame(game.matchId,()=>import('./remote-main'));}
form.onsubmit=event=>{event.preventDefault();const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;if(submit.disabled)return;submit.disabled=true;message.textContent='Returning to your game…';void(async()=>{
 const client=authClient();if(!client)throw Error('The court is temporarily unavailable. Please try again.');
 const {data,error}=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});
 if(error||!data.session)throw Error('Sign-in failed. Check your email and password and try again.');
 password.value='';
 // The server validates ownership of the claimed slot before returning the match.
 if(!accepted&&challengeIdentity(data.session.user,invitedName).needsChoice){form.hidden=true;button.hidden=false;showIdentity(data.session.user);message.textContent='';return;}
 form.hidden=true;button.hidden=false;showIdentity(data.session.user);const game=await prepareJoin(data.session);if(game)await openGame(game);
 })().catch(e=>{message.textContent=e instanceof RemoteError&&e.status===409?'This account did not accept this challenge. Sign in with the account you used for this game.':e.message;}).finally(()=>{submit.disabled=false;});};
registerForm.onsubmit=event=>{event.preventDefault();const submit=registerForm.querySelector<HTMLButtonElement>('[type=submit]')!;if(submit.disabled)return;submit.disabled=true;message.textContent='Creating your account…';void(async()=>{
 const client=authClient();if(!client)throw Error('The court is temporarily unavailable. Please try again.');
 const credentials={email:registerEmail.value.trim(),password:registerPassword.value};
 await remoteRequest('', '/api/multiplayer/register',{...credentials,username:username.value.trim(),playerName:playerName.value.trim()});
 const {data,error}=await client.auth.signInWithPassword(credentials);if(error||!data.session)throw Error('Your account was created, but sign-in did not finish. Choose Sign in and try again.');
 registerPassword.value='';registerForm.hidden=true;button.hidden=false;showIdentity(data.session.user);const game=await prepareJoin(data.session);if(game)await openGame(game);
 })().catch(e=>{message.textContent=e.message;}).finally(()=>{submit.disabled=false;});};
async function enter(){
 if(!token)throw new RemoteError(404,'challenge','This challenge link is incomplete. Copy Link from the original challenge and try again.');
 history.replaceState(null,'',`/challenge/${token}`);
 const i=await remoteRequest<{inviterName:string;invitedName:string;status:string}>('',`/api/multiplayer/challenges/${token}`);accepted=i.status==='accepted';invitedName=i.invitedName;
 loginBack.textContent=accepted?'Back to challenge':'New here? Create an account';
 root.querySelector('h1')!.textContent=i.status==='cancelled'?'This challenge is no longer available.':`${i.inviterName} challenged you, ${i.invitedName}.`;
 document.querySelector('#challenge-copy')!.textContent=accepted?'This challenge has already been accepted. Return to your game, or sign in if you saved your player.':i.status==='cancelled'?'Start a new game and challenge a friend.':'Think you can outplay them?';
 document.querySelector('#challenge-matchup')!.textContent=`${i.inviterName} vs. ${i.invitedName}`;
 button.hidden=i.status==='cancelled';button.textContent=accepted?'Return to game':'Accept Challenge';signIn.hidden=!accepted;document.querySelector<HTMLElement>('#challenge-home')!.hidden=i.status==='pending';
 if(i.status==='pending'){try{const current=await authClient()?.auth.getSession();if(current?.data.session)showIdentity(current.data.session.user);else showCreateAccount();}catch{showCreateAccount();}}
 switchPlayer.onclick=()=>{switchPlayer.disabled=true;button.disabled=true;void(async()=>{const client=authClient();if(!client)throw Error('Please try again.');const current=await client.auth.getSession();if(current.data.session?.user.id!==displayedActor||current.data.session.user.is_anonymous){showIdentity(current.data.session?.user??null);throw Error('Your session changed. Please choose your player again.');}const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;showIdentity(null);const fresh=await client.auth.signInAnonymously();if(fresh.error||!fresh.data.session)throw Error('Could not enter the court. Please try Accept Challenge again.');showIdentity(fresh.data.session.user);const game=await join(fresh.data.session.access_token);await client.auth.refreshSession();await openGame(game);})().catch(e=>{message.textContent=e.message;}).finally(()=>{switchPlayer.disabled=false;button.disabled=false;});};
 if(accepted){try{const current=await authClient()?.auth.getSession();needsSignIn=!current?.data.session||!!current.error;}catch{needsSignIn=true;}if(needsSignIn){button.textContent='Sign in to return';signIn.hidden=true;}}
 button.onclick=()=>{if(needsSignIn){showSignIn();return;}button.disabled=true;void(async()=>{
 const client=authClient();if(!client)throw Error('The court is temporarily unavailable. Please try again.');
 let {data:{session},error}=await client.auth.getSession();if(error){showSignIn('Your session expired. Sign in to return to this match.');return;}
 if(!session){if(accepted){needsSignIn=true;showSignIn();return;}const result=await client.auth.signInAnonymously();if(result.error)throw Error('Could not enter the court. Please try again.');session=result.data.session;}
 if(!session)throw Error('Please try again.');
 if(!accepted&&challengeIdentity(session.user,invitedName).needsChoice&&displayedActor!==session.user.id){showIdentity(session.user);return;}
 const game=await prepareJoin(session,!accepted&&displayedActor===session.user.id?session.user.id:undefined);if(!game)return;
 if(session.user.is_anonymous){const {error}=await client.auth.refreshSession();if(error){showSignIn('Your session expired. Sign in if you saved your player.');return;}}
 await openGame(game);
 })().catch(async e=>{if(e instanceof RemoteError&&e.status===401){needsSignIn=true;showSignIn('Your session expired. Sign in to return to this match.');}else if(e instanceof RemoteError&&e.code==='identity_choice'){const current=await authClient()?.auth.getSession();showIdentity(current?.data.session?.user??null);message.textContent=e.message;}else message.textContent=e.message;}).finally(()=>{button.disabled=false;});};
}
void enter().catch(e=>{root.querySelector('h1')!.textContent=e instanceof RemoteError&&e.status===404?'This challenge is no longer available.':'Could not open your challenge.';message.textContent=e.message;document.querySelector<HTMLElement>('#challenge-home')!.hidden=false;});
