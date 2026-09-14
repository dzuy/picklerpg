import '../style.css';
import './remote.css';
import {authClient,matchCredentials} from '../auth-session';
import {CourtScene} from '../scene';
import {preloadAthletes} from '../athlete';
import {newPlayer,parseLibrary,PLAYER_STORAGE_KEY,playerId} from '../player-design';
import {SLOTS} from '../engine/checkpoint';
import {isOpposingTarget} from '../engine/controllers';
import {targetLabel} from '../engine/shot-intent';
import type {GameState,RallyShot} from '../engine/model';
import {remoteRequest} from './api';
import {samplePlayback} from './playback';
import {RemoteSession} from './match-session';
import type {CreateRemoteMatch,PublicMatch,RemoteConfig,TurnAnimation} from './protocol';
document.body.dataset.screen='remote';
const root=document.querySelector<HTMLDivElement>('#app')!;
root.className='remote-app';
root.innerHTML=`<header class="remote-nav"><a id="remote-solo" href="/">← Home</a><strong class="remote-brand">PICKLE<span>BASH</span></strong><button id="remote-sign-out" class="remote-quiet" hidden>Sign out</button><button id="remote-refresh" class="remote-quiet">Refresh</button></header><div class="remote-meta"><p id="remote-account"></p><p id="remote-status" role="status" aria-live="polite"></p></div><section id="remote-login" class="remote-new-game" hidden><p class="remote-eyebrow">WELCOME TO THE COURT</p><h1>Sign in to play</h1><p>Use your playtest account on this device.</p><form id="remote-login-form"><label>Email<input id="remote-email" type="email" autocomplete="username" required></label><label>Password<input id="remote-password" type="password" autocomplete="current-password" required></label><button class="remote-primary" id="remote-sign-in">Sign in ↗</button></form></section><section id="remote-lobby"><div class="remote-hero"><div><p class="remote-eyebrow">PLAY TOGETHER</p><h1>Your next rally<br>is waiting.</h1><p>Pick up a game. Take your shot. Come back for the next one.</p></div><div class="remote-hero-mark" aria-hidden="true">01<span>MORE GAME.</span></div></div><div class="remote-lobby-layout"><section class="remote-match-list"><div class="remote-section-heading"><h2>Your games</h2><span id="remote-game-count"></span></div><div class="remote-filters" role="group" aria-label="Filter games"><button data-filter="active" aria-pressed="true">In play</button><button data-filter="turn" aria-pressed="false">Your turn</button><button data-filter="completed" aria-pressed="false">Finished</button></div><div id="remote-games"></div></section><section class="remote-new-game" aria-label="Start a game"><p class="remote-eyebrow">MEET ON COURT</p><h2>Start a game</h2><p>Two players. Two doubles teams.<br>A quick race to 3.</p><label>Play against<select id="remote-opponent"></select></label><label>Scoring<select id="remote-scoring"><option value="rally-doubles">Rally scoring</option><option value="side-out-doubles">Side-out scoring</option></select></label><p class="remote-small">Equal skills. Each player controls both teammates.</p><button id="remote-create" class="remote-primary">Let’s play ↗</button></section></div></section><section id="remote-game" hidden><div class="remote-heading"><button id="remote-back" class="remote-quiet">← Your games</button><h1 id="remote-score"></h1><strong id="remote-turn"></strong><button id="remote-skip" hidden>Skip animation</button></div><div id="remote-court"></div><p id="remote-result"></p><button id="remote-retry" hidden>Retry saved turn</button><p id="remote-aim">Tap the opposing court to aim, then choose a shot.</p><button id="remote-clear-target" hidden>Clear target</button><div id="remote-choices"></div></section>`;
const el=(id:string)=>document.getElementById(id)!;
let session:RemoteSession|null=null,scene:CourtScene|undefined,account='',config:RemoteConfig|null=null;
let target:{x:number;z:number}|null=null;
let games:PublicMatch[]=[],gameFilter='active';
let display:GameState|null=null,shot:RallyShot|null=null,shownVersion=-1,animation:TurnAnimation[]=[],animationStart=0;
function showLogin(){session?.dispose();session=null;account='';display=null;animation=[];el('remote-login').hidden=false;el('remote-lobby').hidden=true;el('remote-game').hidden=true;el('remote-sign-out').hidden=true;el('remote-account').textContent='';}
function status(message:string){el('remote-status').textContent=message;}
function presentation(state:GameState,intent= session?.state?.choices[0]?.intent):RallyShot {
 const actor=intent?.actor??state.currentHitter??'you',p=state.ball.position;
 return {actor,intent:intent??{schemaVersion:1,actor,type:'serve',target:{kind:'zone',zone:'middle',depth:'deep'},pace:'medium',shape:'arc',intendedNetClearance:.4,tacticalIntent:'sustain',aggression:.5,source:'menu'},title:'',description:'',cue:'',contact:{...p},aimPoint:{...p},legs:[{from:{...p},to:{...p},duration:1,arc:0}],positions:Object.fromEntries(state.players.map(p=>[p.id,p.position])) as RallyShot['positions']};
}
function choiceLabel(intent:PublicMatch['choices'][number]['intent']){
 const spin=intent.spin;const variant=spin?.vertical==='topspin'?'Topspin':spin?.vertical==='slice'?'Backspin':spin?.side&&spin.side!=='none'?'Sidespin':intent.intendedNetClearance>=2?'Lob':intent.pace==='fast'?'Fast':intent.pace==='soft'?'Soft':'';
 return `${variant&&variant.toLowerCase()!==intent.type?variant+' ':''}${intent.type}`;
}
function clearTarget(){target=null;scene?.setSelectedTarget(null);el('remote-clear-target').hidden=true;el('remote-aim').textContent='Tap the opposing court to aim, then choose a shot.';}
function render(){
 if(!session)return;const s=session.state;
 status(session.message||(session.busy?'Saving turn…':session.offline?'Offline · showing the last saved state.':'Moves are saved before animation.'));
 el('remote-retry').hidden=!session.pending;(el('remote-retry') as HTMLButtonElement).disabled=session.busy;
 if(!s)return;
 el('remote-score').textContent=`Team A ${s.score.home} — ${s.score.away} Team B`;
 el('remote-turn').textContent=s.status==='completed'?`Finished · Team ${s.score.home>s.score.away?'A':'B'} wins`:s.currentTeam===s.viewerTeam?'Your turn':'Waiting for your opponent';
 el('remote-result').textContent=s.result?`Last point: Team ${s.result.winner==='home'?'A':'B'} · ${s.result.reason.replaceAll('-',' ')}`:'';
 if(shownVersion!==s.version){
  const initial=shownVersion<0;clearTarget();shownVersion=s.version;display=structuredClone(s.display);shot=presentation(display);
  if(initial&&scene){scene.setViewTeam(s.viewerTeam);for(const id of SLOTS)scene.substitutePlayer(id,s.roster[id]);}
  animation=structuredClone(s.animation);animationStart=performance.now();el('remote-skip').hidden=!animation.length;
 }
 el('remote-aim').hidden=s.status!=='active'||s.currentTeam!==s.viewerTeam;
 const choices=el('remote-choices');choices.replaceChildren();
 for(const choice of s.choices){const b=document.createElement('button');b.textContent=`${choice.timing?`${choice.timing==='air'?'Volley':'After bounce'} · `:''}${choiceLabel(choice.intent)} · ${targetLabel(choice.intent.target)}`;b.disabled=session.busy||!!session.pending||session.offline;b.onclick=()=>{skip();void session?.submit(target?{...choice,intent:{...choice.intent,target:{kind:'point',...target}}}:choice).catch(e=>status(e.message));};choices.append(b);}
}
function skip(){animation=[];el('remote-skip').hidden=true;if(session?.state){display=structuredClone(session.state.display);shot=presentation(display);}}
async function open(id:string){
 (el('remote-solo') as HTMLAnchorElement).href=`/?returnMatch=${encodeURIComponent(id)}`;
 session?.dispose();shownVersion=-1;session=null;animation=[];display=null;shot=null;
 const credentials=await matchCredentials();if(account&&credentials.owner!==account)throw new Error('Account changed. Reload remote play.');account=credentials.owner;el('remote-account').textContent='● Connected · Private playtest';el('remote-login').hidden=true;el('remote-sign-out').hidden=false;
 el('remote-lobby').hidden=true;el('remote-game').hidden=false;
 const url=new URL(location.href);url.searchParams.set('match',id);history.replaceState(null,'',url);
 if(!scene){await preloadAthletes();scene=new CourtScene(el('remote-court'),()=>{});scene.setGuides(false);scene.onCourtTap=point=>{
   const s=session?.state;if(!s||s.status!=='active'||s.currentTeam!==s.viewerTeam||session!.busy||session!.pending||session!.offline)return false;
   if(!isOpposingTarget(point,s.viewerTeam)){status('Aim on the opposing side of the net.');return true;}
   skip();target={x:point.x,z:point.z};scene!.setSelectedTarget(target);el('remote-clear-target').hidden=false;el('remote-aim').textContent='Target selected. Choose a shot to send it.';return true;
  };}
 session=new RemoteSession(account,id,matchCredentials,remoteRequest,localStorage,render);render();await session.refresh();if(session.pending)await session.retry();
}
async function lobby(){
 (el('remote-solo') as HTMLAnchorElement).href='/';
 session?.dispose();session=null;animation=[];display=null;shot=null;el('remote-game').hidden=true;el('remote-lobby').hidden=false;
 const url=new URL(location.href);url.searchParams.delete('match');history.replaceState(null,'',url);
 const c=await matchCredentials();account=c.owner;config=await remoteRequest<RemoteConfig>(c.token,'/api/multiplayer/config');
 el('remote-account').textContent='● Connected · Private playtest';el('remote-login').hidden=true;el('remote-sign-out').hidden=false;
 const select=el('remote-opponent') as HTMLSelectElement;select.replaceChildren();for(const tester of config.testers){const option=document.createElement('option');option.value=tester.id;option.textContent=tester.name.replace('Tester ','Player ');select.append(option);}
 (el('remote-create') as HTMLButtonElement).disabled=!config.creationEnabled||!config.testers.length;
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
  const names=document.createElement('strong');const own=game.viewerTeam==='home'?['you','partner'] as const:['opponent-left','opponent-right'] as const;const other=game.viewerTeam==='home'?['opponent-left','opponent-right'] as const:['you','partner'] as const;names.textContent=`${game.roster[own[0]].name} & ${game.roster[own[1]].name}`;
  const opponents=document.createElement('span');opponents.className='remote-card-opponent';opponents.textContent=`vs ${game.roster[other[0]].name} & ${game.roster[other[1]].name}`;
  const score=document.createElement('span');score.className='remote-card-score';score.textContent=`${game.score[game.viewerTeam]} – ${game.score[game.viewerTeam==='home'?'away':'home']}`;
  const action=document.createElement('span');action.className='remote-card-action';action.textContent=done?'View result ↗':yours?'Take your shot ↗':'Open game ↗';
  const ref=document.createElement('span');ref.className='remote-card-ref';ref.textContent=`Game ${game.id.slice(0,8)} · ${game.rules.scoring==='rally-doubles'?'Rally':'Side-out'} · First to ${game.rules.target}`;
  card.append(badge,names,opponents,score,ref,action);card.onclick=()=>void open(game.id).catch(e=>status(e.message));container.append(card);
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
el('remote-create').onclick=()=>{const button=el('remote-create') as HTMLButtonElement;button.disabled=true;void create().catch(e=>status(e.message)).finally(()=>{button.disabled=!config?.creationEnabled;});};
el('remote-back').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-refresh').onclick=()=>void (session?session.refresh():lobby()).catch(e=>status(e.message));
el('remote-clear-target').onclick=clearTarget;
el('remote-retry').onclick=()=>void session?.retry();el('remote-skip').onclick=skip;
let renderFailed=false;
function frame(now:number){
 try{if(!renderFailed&&scene&&display&&shot&&!document.hidden){
  if(animation.length){const segment=animation[0],sample=samplePlayback(segment,now-animationStart),progress=sample.progress;
   display.ball.position=sample.position;display.players=sample.players;display.elapsed=progress*segment.duration;display.phase='flight';display.paused=false;display.simulationTime=now/1000;shot=presentation(display,segment.intent);
   if(progress===1){animation.shift();animationStart=now;if(!animation.length)skip();}
  }
  scene.render(display,now/1000,shot,animation.length?null:session?.state?.serveCall??null);
 }
 }catch(error){renderFailed=true;console.error('Remote court render failed',error);status('Court rendering failed. Reload to restore the saved match.');}
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);
setInterval(()=>{if(!document.hidden&&session&&!session.busy)void session.refresh();},5000);
window.addEventListener('focus',()=>{if(session)void session.refresh();});window.addEventListener('online',()=>{if(session)void session.refresh();});
authClient()?.auth.onAuthStateChange((_event,s)=>{if(account&&s?.user.id!==account){showLogin();status('Sign in to continue with this account.');}});
async function enter(){const client=authClient();if(!client){showLogin();status('Cloud accounts are not configured.');return;}const {data:{session:auth}}=await client.auth.getSession();if(!auth){showLogin();status('');return;}const matchId=new URLSearchParams(location.search).get('match');if(matchId&&/^[a-f0-9-]{36}$/i.test(matchId))await open(matchId);else await lobby();}
(el('remote-login-form') as HTMLFormElement).onsubmit=e=>{e.preventDefault();const button=el('remote-sign-in') as HTMLButtonElement;button.disabled=true;status('Signing in…');void(async()=>{const client=authClient();if(!client)throw Error('Cloud accounts are not configured.');const {error}=await client.auth.signInWithPassword({email:(el('remote-email') as HTMLInputElement).value.trim(),password:(el('remote-password') as HTMLInputElement).value});if(error)throw Error('Sign-in failed. Check your email and password.');(el('remote-password') as HTMLInputElement).value='';await enter();})().catch(e=>status(e.message)).finally(()=>{button.disabled=false;});};
el('remote-sign-out').onclick=()=>void(async()=>{const {error}=await authClient()!.auth.signOut({scope:'local'});if(error){status('Could not sign out. Try again.');return;}showLogin();status('Signed out on this device.');})();
try{await enter();}catch(e){status((e as Error).message);}
