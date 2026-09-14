import '../style.css';
import './remote.css';
import {authClient,matchCredentials} from '../auth-session';
import {CourtScene} from '../scene';
import {preloadAthletes} from '../athlete';
import {newPlayer,parseLibrary,PLAYER_STORAGE_KEY,playerId} from '../player-design';
import {SLOTS} from '../engine/checkpoint';
import {CourtTargetPicker} from '../target-picker';
import {remoteTargeting} from './targeting';
import {targetLabel} from '../engine/shot-intent';
import type {GameState,RallyShot} from '../engine/model';
import {remoteRequest} from './api';
import {samplePlayback} from './playback';
import {RemoteSession} from './match-session';
import type {CreateRemoteMatch,PublicMatch,RemoteConfig,TurnAnimation} from './protocol';
document.body.dataset.screen='remote';
const root=document.querySelector<HTMLDivElement>('#app')!;
root.className='remote-app';
root.innerHTML=`<header class="remote-nav"><a id="remote-solo" href="/">← Home</a><strong class="remote-brand">PICKLE<span>BASH</span></strong><button id="remote-sign-out" class="remote-quiet" hidden>Sign out</button><button id="remote-refresh" class="remote-quiet">Refresh</button></header><div class="remote-meta"><p id="remote-account"></p><p id="remote-status" role="status" aria-live="polite"></p></div><section id="remote-login" class="remote-new-game" hidden><p class="remote-eyebrow">WELCOME TO THE COURT</p><h1>Create your account</h1><p id="remote-auth-copy">Use a different email on each device and choose a password of at least 6 characters. No confirmation email is needed for this playtest.</p><form id="remote-login-form"><label id="remote-name-label">Player name<input id="remote-player-name" autocomplete="nickname" maxlength="32" required></label><label>Email<input id="remote-email" type="email" autocomplete="username" required></label><label>Password<input id="remote-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required></label><button class="remote-primary" id="remote-sign-in">Create account ↗</button></form><button id="remote-auth-mode" class="remote-quiet">Already registered? Sign in</button></section><section id="remote-name-setup" class="remote-new-game" hidden><h1>What should we call you?</h1><p>Your player name appears in games and the opponent list.</p><form id="remote-name-form"><label>Player name<input id="remote-existing-name" autocomplete="nickname" maxlength="32" required></label><button class="remote-primary">Save player name ↗</button></form></section><section id="remote-password-reset" class="remote-new-game" hidden><h1>Choose a new password</h1><p id="remote-reset-account"></p><p>For this playtest, use 6–128 characters. No capitals, numbers, or symbols required.</p><form id="remote-reset-form"><label>New password<input id="remote-new-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required></label><button class="remote-primary">Save password and play ↗</button></form></section><section id="remote-lobby" hidden><div class="remote-hero"><div><p class="remote-eyebrow">PLAY TOGETHER</p><h1>Your next rally<br>is waiting.</h1><p>Pick up a game. Take your shot. Come back for the next one.</p></div><div class="remote-hero-mark" aria-hidden="true">01<span>MORE GAME.</span></div></div><div class="remote-lobby-layout"><section class="remote-match-list"><div class="remote-section-heading"><h2>Your games</h2><span id="remote-game-count"></span></div><div class="remote-filters" role="group" aria-label="Filter games"><button data-filter="active" aria-pressed="true">In play</button><button data-filter="turn" aria-pressed="false">Your turn</button><button data-filter="completed" aria-pressed="false">Finished</button></div><div id="remote-games"></div></section><section class="remote-new-game remote-start-card"><p class="remote-eyebrow">MEET ON COURT</p><h2>A new matchup?</h2><p>Invite another player and set up your next game.</p><button id="remote-start-setup" class="remote-primary">Start a game ↗</button></section></div></section><section id="remote-setup" class="remote-new-game" aria-label="Set up a game" hidden><button id="remote-cancel-setup" class="remote-quiet">← Your games</button><p class="remote-eyebrow">MEET ON COURT</p><h1>Set up your game</h1><p>Choose who to invite and how you want to score.</p><label>Invite a player<select id="remote-opponent"></select></label><label>Scoring<select id="remote-scoring"><option value="rally-doubles">Rally scoring</option><option value="side-out-doubles">Side-out scoring</option></select></label><div class="remote-setup-summary"><strong>Your match</strong><p id="remote-setup-summary"></p><p>First to 3 · Doubles · Equal skills</p><p>Each player controls their own team of two.</p></div><button id="remote-create" class="remote-primary">Create game & invite ↗</button></section><section id="remote-game" hidden><div class="remote-heading"><button id="remote-back" class="remote-quiet">← Your games</button><h1 id="remote-score"></h1><strong id="remote-turn"></strong><button id="remote-skip" hidden>Skip animation</button></div><p id="remote-match-identity"></p><div id="remote-court"></div><p id="remote-result"></p><button id="remote-retry" hidden>Retry saved turn</button><div class="remote-play-dock"><p id="remote-aim">Tap the opposing court, then choose a shot from the wheel.</p><details id="remote-shot-options"><summary>Shot list · default targets</summary><div id="remote-choices"></div></details></div></section>`;
const el=(id:string)=>document.getElementById(id)!;
let session:RemoteSession|null=null,scene:CourtScene|undefined,account='',config:RemoteConfig|null=null;
let signup=true,accountEmail='',shownRoster='';
let targetPicker:CourtTargetPicker|undefined;
let games:PublicMatch[]=[],gameFilter='active';
let display:GameState|null=null,shot:RallyShot|null=null,shownVersion=-1,animation:TurnAnimation[]=[],animationStart=0;
function showLogin(){el('remote-setup').hidden=true;el('remote-password-reset').hidden=true;clearTarget();session?.dispose();session=null;account='';display=null;animation=[];el('remote-name-setup').hidden=true;el('remote-login').hidden=false;el('remote-lobby').hidden=true;el('remote-game').hidden=true;el('remote-sign-out').hidden=true;el('remote-account').textContent='';}
function accountLabel(){const name=config?.selfName??'Signed in';return accountEmail&&name!==accountEmail?`${name} · ${accountEmail}`:name;}
function opponentLabel(s:PublicMatch){const id=s.accountIds?.[s.viewerTeam==='home'?'away':'home'];return config?.testers.find(t=>t.id===id)?.name??'Opponent';}
function status(message:string){el('remote-status').textContent=message;}
function presentation(state:GameState,intent= session?.state?.choices[0]?.intent):RallyShot {
 const actor=intent?.actor??state.currentHitter??'you',p=state.ball.position;
 return {actor,intent:intent??{schemaVersion:1,actor,type:'serve',target:{kind:'zone',zone:'middle',depth:'deep'},pace:'medium',shape:'arc',intendedNetClearance:.4,tacticalIntent:'sustain',aggression:.5,source:'menu'},title:'',description:'',cue:'',contact:{...p},aimPoint:{...p},legs:[{from:{...p},to:{...p},duration:1,arc:0}],positions:Object.fromEntries(state.players.map(p=>[p.id,p.position])) as RallyShot['positions']};
}
function choiceLabel(intent:PublicMatch['choices'][number]['intent']){
 const spin=intent.spin;const variant=spin?.vertical==='topspin'?'Topspin':spin?.vertical==='slice'?'Backspin':spin?.side&&spin.side!=='none'?'Sidespin':intent.intendedNetClearance>=2?'Lob':intent.pace==='fast'?'Fast':intent.pace==='soft'?'Soft':'';
 return `${variant&&variant.toLowerCase()!==intent.type?variant+' ':''}${intent.type}`;
}
function clearTarget(){targetPicker?.clear();}
function render(){
 if(!session)return;const s=session.state;
 status(session.message||(session.busy?'Saving turn…':session.offline?'Offline · showing the last saved state.':'Moves are saved before animation.'));
 el('remote-retry').hidden=!session.pending;(el('remote-retry') as HTMLButtonElement).disabled=session.busy;
 if(!s)return;
 el('remote-account').textContent=`Signed in as ${accountLabel()} · You control Team ${s.viewerTeam==='home'?'A':'B'}`;
 el('remote-score').textContent=`${config?.selfName??'You'} ${s.score[s.viewerTeam]} — ${s.score[s.viewerTeam==='home'?'away':'home']} ${opponentLabel(s)}`;
 el('remote-match-identity').textContent=`Against ${opponentLabel(s)} · Game ${s.id.slice(0,8)}`;
 el('remote-turn').textContent=s.status==='completed'?`Finished · Team ${s.score.home>s.score.away?'A':'B'} wins`:s.currentTeam===s.viewerTeam?'Your turn':'Waiting for your opponent';
 el('remote-result').textContent=s.result?`Last point: Team ${s.result.winner==='home'?'A':'B'} · ${s.result.reason.replaceAll('-',' ')}`:'';
 if(shownVersion!==s.version){
  const initial=shownVersion<0;clearTarget();shownVersion=s.version;display=structuredClone(s.display);shot=presentation(display);
  if(initial&&scene)scene.setViewTeam(s.viewerTeam);
  animation=structuredClone(s.animation);animationStart=performance.now();el('remote-skip').hidden=!animation.length;
 }
 const rosterKey=JSON.stringify(s.roster);if(scene&&shownRoster!==rosterKey){for(const id of SLOTS)scene.substitutePlayer(id,s.roster[id]);shownRoster=rosterKey;}
 el('remote-aim').textContent=s.status==='completed'?'Game finished. Head back to your games for another match.':s.currentTeam!==s.viewerTeam?`${opponentLabel(s)} is choosing a shot.`:animation.length?'Watch the rally, or tap the court to skip and aim.':'Tap the opposing court, then choose a shot from the wheel.';
 el('remote-shot-options').hidden=!s.choices.length;
 targetPicker?.sync(true);
 const choices=el('remote-choices');choices.replaceChildren();
 for(const choice of s.choices){const b=document.createElement('button');b.textContent=`${choice.timing?`${choice.timing==='air'?'Volley':'After bounce'} · `:''}${choiceLabel(choice.intent)} · ${targetLabel(choice.intent.target)}`;b.disabled=session.busy||!!session.pending||session.offline;b.onclick=()=>{clearTarget();skip();void session?.submit(choice).catch(e=>status(e.message));};choices.append(b);}
}
function skip(){animation=[];el('remote-skip').hidden=true;if(session?.state){display=structuredClone(session.state.display);shot=presentation(display);}}
async function open(id:string){
 (el('remote-solo') as HTMLAnchorElement).href=`/?returnMatch=${encodeURIComponent(id)}`;
 clearTarget();session?.dispose();shownVersion=-1;shownRoster='';session=null;animation=[];display=null;shot=null;
 const credentials=await matchCredentials();if(account&&credentials.owner!==account)throw new Error('Account changed. Reload remote play.');account=credentials.owner;config=await remoteRequest<RemoteConfig>(credentials.token,'/api/multiplayer/config');el('remote-account').textContent=`Signed in as ${accountLabel()}`;el('remote-login').hidden=true;el('remote-sign-out').hidden=false;
 el('remote-setup').hidden=true;el('remote-lobby').hidden=true;el('remote-game').hidden=false;
 const url=new URL(location.href);url.searchParams.set('match',id);history.replaceState(null,'',url);
 if(!scene){await preloadAthletes();scene=new CourtScene(el('remote-court'),()=>{});scene.setGuides(false);targetPicker=new CourtTargetPicker(remoteTargeting(()=>session,skip,status),scene);}

 session=new RemoteSession(account,id,matchCredentials,remoteRequest,localStorage,render);render();await session.refresh();if(session.state&&!session.offline){try{localStorage.setItem(`pickle-remote:${account}:${id}:opened`,'1')}catch{}}if(session.pending)await session.retry();
}
async function lobby(){
 (el('remote-solo') as HTMLAnchorElement).href='/';
 clearTarget();session?.dispose();session=null;animation=[];display=null;shot=null;el('remote-setup').hidden=true;el('remote-game').hidden=true;el('remote-lobby').hidden=false;
 const url=new URL(location.href);url.searchParams.delete('match');history.replaceState(null,'',url);
 const c=await matchCredentials();account=c.owner;config=await remoteRequest<RemoteConfig>(c.token,'/api/multiplayer/config');
 el('remote-account').textContent=`Signed in as ${accountLabel()}`;el('remote-login').hidden=true;el('remote-sign-out').hidden=false;
 const select=el('remote-opponent') as HTMLSelectElement;select.replaceChildren();for(const tester of config.testers){const option=document.createElement('option');option.value=tester.id;option.textContent=tester.name.replace('Tester ','Player ');select.append(option);}
 for(const id of ['remote-create','remote-start-setup'])(el(id) as HTMLButtonElement).disabled=!config.creationEnabled||!config.testers.length;
 games=await remoteRequest<PublicMatch[]>(c.token,'/api/matches');renderGames();
 status(config.creationEnabled?'':'New games are unavailable for this account. You can still open your existing games.');
}
function renderGames(){
 const container=el('remote-games');container.replaceChildren();
 const active=games.filter(g=>g.status==='active');el('remote-game-count').textContent=`${active.length} in play`;
 const visible=games.filter(g=>gameFilter==='completed'?g.status==='completed':g.status==='active'&&(gameFilter!=='turn'||g.currentTeam===g.viewerTeam)).sort((a,b)=>Number(b.currentTeam===b.viewerTeam)-Number(a.currentTeam===a.viewerTeam));
 if(!visible.length){const empty=document.createElement('div');empty.className='remote-empty';const title=document.createElement('h3');title.textContent=gameFilter==='turn'?'You’re all caught up.':gameFilter==='completed'?'The first finish is ahead.':'A fresh court awaits.';const copy=document.createElement('p');copy.textContent=gameFilter==='turn'?'Your opponents are up. Check back for your next shot.':gameFilter==='completed'?'Completed games will be waiting here.':'Choose a player and start your first game.';empty.append(title,copy);container.append(empty);}
 for(const game of visible){
  const card=document.createElement('button');card.className='remote-game-card';const yours=game.currentTeam===game.viewerTeam,done=game.status==='completed';
  const badge=document.createElement('span');badge.className='remote-badge '+(done?'finished':yours?'ready':'waiting');badge.textContent=done?'Finished':yours?'Your turn':'Their turn';
  let unopened=false;try{unopened=!done&&game.viewerTeam==='away'&&!localStorage.getItem(`pickle-remote:${account}:${game.id}:opened`)}catch{}
  if(unopened){const fresh=document.createElement('span');fresh.className='remote-new-badge';fresh.textContent='New game';badge.prepend(fresh);}
  const names=document.createElement('strong');const own=game.viewerTeam==='home'?['you','partner'] as const:['opponent-left','opponent-right'] as const;names.textContent=`vs ${opponentLabel(game)}`;
  const opponents=document.createElement('span');opponents.className='remote-card-opponent';opponents.textContent=`Your team: ${game.roster[own[0]].name} & ${game.roster[own[1]].name}`;
  const score=document.createElement('span');score.className='remote-card-score';score.textContent=`${game.score[game.viewerTeam]} – ${game.score[game.viewerTeam==='home'?'away':'home']}`;
  const action=document.createElement('span');action.className='remote-card-action';action.textContent=done?'View result ↗':yours?'Take your shot ↗':'Open game ↗';
  const ref=document.createElement('span');ref.className='remote-card-ref';ref.textContent=`Game ${game.id.slice(0,8)} · ${game.rules.scoring==='rally-doubles'?'Rally':'Side-out'} · First to ${game.rules.target}`;
  const created=document.createElement('time');created.className='remote-card-created';
  if(game.createdAt&&Number.isFinite(Date.parse(game.createdAt))){created.dateTime=game.createdAt;created.textContent=`Created ${new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(game.createdAt))}`;created.title=new Intl.DateTimeFormat(undefined,{dateStyle:'full',timeStyle:'long'}).format(new Date(game.createdAt));}
  card.append(badge,names,opponents,score);if(created.textContent)card.append(created);card.append(ref,action);card.onclick=()=>void open(game.id).catch(e=>status(e.message));container.append(card);
 }
}
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]')))button.onclick=()=>{gameFilter=button.dataset.filter!;for(const sibling of Array.from(document.querySelectorAll('[data-filter]')))sibling.setAttribute('aria-pressed',String(sibling===button));renderGames();};
async function create(){
 const c=await matchCredentials();if(c.owner!==account)throw new Error('Account changed. Reload remote play.');
 const key=`pickle-remote:${account}:creation`;let request:CreateRemoteMatch;
 const saved=localStorage.getItem(key);
 if(saved)request=JSON.parse(saved);else{
  const library=parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY));
  const roster=Object.fromEntries(SLOTS.map((id,i)=>{const p=library.players[i]??newPlayer();return [id,{...p,name:library.players[i]?.name??['Alex','Blake','Casey','Drew'][i]}]})) as CreateRemoteMatch['roster'];
  request={creationId:playerId(),opponentId:(el('remote-opponent') as HTMLSelectElement).value,roster,scoring:(el('remote-scoring') as HTMLSelectElement).value as CreateRemoteMatch['scoring']};localStorage.setItem(key,JSON.stringify(request));
 }
 const result=await remoteRequest<PublicMatch>(c.token,'/api/matches',request);localStorage.removeItem(key);await open(result.id);
}
function setupSummary(){const select=el('remote-opponent') as HTMLSelectElement;el('remote-setup-summary').textContent=`${config?.selfName??'You'} vs ${select.selectedOptions[0]?.textContent??'Choose a player'}`;}
el('remote-start-setup').onclick=()=>{el('remote-lobby').hidden=true;el('remote-setup').hidden=false;setupSummary();el('remote-opponent').focus();};
el('remote-opponent').onchange=setupSummary;
el('remote-cancel-setup').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-create').onclick=()=>{const button=el('remote-create') as HTMLButtonElement;button.disabled=true;void create().catch(e=>status(e.message)).finally(()=>{button.disabled=!config?.creationEnabled||!config.testers.length;});};
el('remote-back').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-refresh').onclick=()=>void (session?session.refresh():lobby()).catch(e=>status(e.message));
el('remote-retry').onclick=()=>void session?.retry();el('remote-skip').onclick=skip;
let renderFailed=false;
function frame(now:number){
 try{if(!renderFailed&&scene&&display&&shot&&!document.hidden){
  if(animation.length){const segment=animation[0],sample=samplePlayback(segment,now-animationStart),progress=sample.progress;
   display.ball.position=sample.position;display.players=sample.players;display.elapsed=progress*segment.duration;display.phase='flight';display.paused=false;display.simulationTime=now/1000;shot=presentation(display,segment.intent);
   if(progress===1){animation.shift();animationStart=now;if(!animation.length)skip();}
  }
  scene.render(display,now/1000,shot,animation.length?null:session?.state?.serveCall??null);targetPicker?.sync(!el('remote-game').hidden);
 }
 }catch(error){renderFailed=true;console.error('Remote court render failed',error);status('Court rendering failed. Reload to restore the saved match.');}
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);
setInterval(()=>{if(!document.hidden&&session&&!session.busy)void session.refresh();},5000);
window.addEventListener('focus',()=>{if(session)void session.refresh();});window.addEventListener('online',()=>{if(session)void session.refresh();});
authClient()?.auth.onAuthStateChange((_event,s)=>{if(account&&s?.user.id!==account){showLogin();status('Sign in to continue with this account.');}});
async function enter(){const client=authClient();if(!client){showLogin();status('Cloud accounts are not configured.');return;}
 const recovery=new URLSearchParams(location.hash.slice(1));
 if(recovery.get('type')==='recovery'&&recovery.get('token_hash')){
  const token_hash=recovery.get('token_hash')!;const clean=new URL(location.href);clean.hash='';clean.searchParams.delete('match');history.replaceState(null,'',clean);
  sessionStorage.removeItem('pickle-password-reset');showLogin();status('Checking your reset link…');
  const {error}=await client.auth.verifyOtp({token_hash,type:'recovery'});if(error){status('This reset link has expired or was already used. Request a new one.');return;}
  localStorage.setItem('pickle-email-accounts-v1','1');sessionStorage.setItem('pickle-password-reset','1');
 }
 if(sessionStorage.getItem('pickle-password-reset')){
  const {data:{session:auth}}=await client.auth.getSession();showLogin();
  if(!auth){sessionStorage.removeItem('pickle-password-reset');status('Your reset session expired. Request a new reset link.');return;}
  el('remote-login').hidden=true;el('remote-password-reset').hidden=false;el('remote-reset-account').textContent=`Resetting password for ${auth.user.email??'your account'}`;status('');return;
 }
 const marker='pickle-email-accounts-v1';if(!localStorage.getItem(marker)){await client.auth.signOut({scope:'local'});localStorage.setItem(marker,'1');const clean=new URL(location.href);clean.hash='';clean.searchParams.delete('match');history.replaceState(null,'',clean);showLogin();status('Create a new account for this device.');return;}
 const fragment=new URLSearchParams(location.hash.slice(1));if(fragment.has('error')){await client.auth.signOut({scope:'local'});showLogin();status('That sign-in link failed. Use your email and password below.');return;}
 const {data:{session:auth}}=await client.auth.getSession();if(!auth){showLogin();status('');return;}accountEmail=auth.user.email??'';if(!auth.user.user_metadata?.player_name){showLogin();el('remote-login').hidden=true;el('remote-name-setup').hidden=false;status(`Signed in as ${accountEmail}`);return;}el('remote-name-setup').hidden=true;const matchId=new URLSearchParams(location.search).get('match');if(matchId&&/^[a-f0-9-]{36}$/i.test(matchId))await open(matchId);else await lobby();}
function authMode(){el('remote-auth-copy').textContent=signup?'Choose a player name, use a different email on each device, and choose a password of at least 6 characters. No confirmation email is needed.':'Sign in with the email and password you registered on this device.';el('remote-name-label').hidden=!signup;(el('remote-player-name') as HTMLInputElement).required=signup;el('remote-login').querySelector('h1')!.textContent=signup?'Create your account':'Welcome back';el('remote-sign-in').textContent=signup?'Create account ↗':'Sign in ↗';el('remote-auth-mode').textContent=signup?'Already registered? Sign in':'New here? Create an account';(el('remote-password') as HTMLInputElement).autocomplete=signup?'new-password':'current-password';(el('remote-password') as HTMLInputElement).minLength=signup?6:1;}
el('remote-auth-mode').onclick=()=>{signup=!signup;authMode();status('');};
(el('remote-login-form') as HTMLFormElement).onsubmit=e=>{e.preventDefault();const button=el('remote-sign-in') as HTMLButtonElement;button.disabled=true;status(signup?'Creating account…':'Signing in…');void(async()=>{const client=authClient();if(!client)throw Error('Cloud accounts are not configured.');const credentials={email:(el('remote-email') as HTMLInputElement).value.trim(),password:(el('remote-password') as HTMLInputElement).value};
 if(signup)await remoteRequest('', '/api/multiplayer/register',{...credentials,playerName:(el('remote-player-name') as HTMLInputElement).value.trim()});
 const {error}=await client.auth.signInWithPassword(credentials);if(error)throw Error(error.status===400?'Sign-in failed. Check your email and password.':error.message);(el('remote-password') as HTMLInputElement).value='';const clean=new URL(location.href);clean.hash='';history.replaceState(null,'',clean);await enter();})().catch(e=>status(e.message)).finally(()=>{button.disabled=false;});};
(el('remote-name-form') as HTMLFormElement).onsubmit=e=>{e.preventDefault();const name=(el('remote-existing-name') as HTMLInputElement).value.trim().replace(/\s+/g,' ');if(!name||name.length>32){status('Enter a player name of 1–32 characters.');return;}const button=el('remote-name-form').querySelector('button')!;button.disabled=true;void(async()=>{const {error}=await authClient()!.auth.updateUser({data:{player_name:name}});if(error)throw error;await enter();})().catch(e=>status(e.message)).finally(()=>{button.disabled=false;});};
el('remote-sign-out').onclick=()=>void(async()=>{const {error}=await authClient()!.auth.signOut({scope:'local'});if(error){status('Could not sign out. Try again.');return;}showLogin();signup=false;authMode();status('Signed out on this device.');})();
(el('remote-reset-form') as HTMLFormElement).onsubmit=e=>{e.preventDefault();const input=el('remote-new-password') as HTMLInputElement,button=el('remote-reset-form').querySelector('button')!;button.disabled=true;status('Saving your password…');void(async()=>{
 const {error}=await authClient()!.auth.updateUser({password:input.value});if(error)throw error;input.value='';sessionStorage.removeItem('pickle-password-reset');el('remote-password-reset').hidden=true;await enter();status('Password updated. Use your new password on either device.');
 })().catch(e=>status((e as Error).message)).finally(()=>{button.disabled=false;});};
try{await enter();}catch(e){status((e as Error).message);}
