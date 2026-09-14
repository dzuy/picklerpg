import '../style.css';
import '../gameplay-hud.css';
import './remote.css';
import {TeamPicker} from './team-picker';
import type {Invitation,InviteRequest} from './invitation-protocol';
import {moveCopy} from './move-copy';
import {authClient,matchCredentials} from '../auth-session';
import {CourtScene} from '../scene';
import {preloadAthletes} from '../athlete';
import {playerId} from '../player-design';
import {SLOTS} from '../engine/checkpoint';
import {CourtTargetPicker} from '../target-picker';
import {remoteTargeting} from './targeting';
import {targetLabel} from '../engine/shot-intent';
import type {GameState,RallyShot} from '../engine/model';
import {remoteRequest} from './api';
import {samplePlayback} from './playback';
import {RemoteSession} from './match-session';
import type {PublicMatch,RemoteConfig,TurnAnimation} from './protocol';
document.body.dataset.screen='remote';
const root=document.querySelector<HTMLDivElement>('#app')!;
root.className='remote-app';
root.innerHTML=`<header class="remote-nav"><a id="remote-solo" href="/">← Home</a><strong class="remote-brand">PICKLE<span>BASH</span></strong><button id="remote-sign-out" class="remote-quiet" hidden>Sign out</button><button id="remote-refresh" class="remote-quiet">Refresh</button></header><div class="remote-meta"><p id="remote-account"></p><p id="remote-status" role="status" aria-live="polite"></p></div><section id="remote-login" class="remote-new-game" hidden><p class="remote-eyebrow">WELCOME TO THE COURT</p><h1>Create your account</h1><p id="remote-auth-copy">Use a different email on each device and choose a password of at least 6 characters. No confirmation email is needed for this playtest.</p><form id="remote-login-form"><label id="remote-name-label">Player name<input id="remote-player-name" autocomplete="nickname" maxlength="32" required></label><label>Email<input id="remote-email" type="email" autocomplete="username" required></label><label>Password<input id="remote-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required></label><button class="remote-primary" id="remote-sign-in">Create account ↗</button></form><button id="remote-auth-mode" class="remote-quiet">Already registered? Sign in</button></section><section id="remote-name-setup" class="remote-new-game" hidden><h1>What should we call you?</h1><p>Your player name appears in games and the opponent list.</p><form id="remote-name-form"><label>Player name<input id="remote-existing-name" autocomplete="nickname" maxlength="32" required></label><button class="remote-primary">Save player name ↗</button></form></section><section id="remote-password-reset" class="remote-new-game" hidden><h1>Choose a new password</h1><p id="remote-reset-account"></p><p>For this playtest, use 6–128 characters. No capitals, numbers, or symbols required.</p><form id="remote-reset-form"><label>New password<input id="remote-new-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required></label><button class="remote-primary">Save password and play ↗</button></form></section><section id="remote-lobby" hidden><div class="remote-hero"><div><p class="remote-eyebrow">PLAY TOGETHER</p><h1>Your next rally<br>is waiting.</h1><p>Pick up a game. Take your shot. Come back for the next one.</p></div><div class="remote-hero-mark" aria-hidden="true">01<span>MORE GAME.</span></div></div><div class="remote-lobby-layout"><section class="remote-match-list"><div class="remote-section-heading"><h2>Your games</h2><span id="remote-game-count"></span></div><div class="remote-filters" role="group" aria-label="Filter games"><button data-filter="active" aria-pressed="true">In play</button><button data-filter="turn" aria-pressed="false">Your turn</button><button data-filter="completed" aria-pressed="false">Finished</button></div><div id="remote-invitations"></div><div id="remote-games"></div></section><section class="remote-new-game remote-start-card"><p class="remote-eyebrow">MEET ON COURT</p><h2>A new matchup?</h2><p>Invite another player and set up your next game.</p><button id="remote-start-setup" class="remote-primary">Start a game ↗</button></section></div></section><section id="remote-setup" class="remote-new-game" aria-label="Set up a game" hidden><button id="remote-cancel-setup" class="remote-quiet">← Your games</button><p class="remote-eyebrow">MEET ON COURT</p><h1>Set up your game</h1><p>Choose who to invite and how you want to score.</p><label>Invite a player<select id="remote-opponent"></select></label><label>Scoring<select id="remote-scoring"><option value="rally-doubles">Rally scoring</option><option value="side-out-doubles">Side-out scoring</option></select></label><h2>Choose your team</h2><div id="remote-create-team"></div><h2>Choose a location</h2><div class="remote-courts"><button type="button" aria-pressed="true"><img src="/assets/picklebash-select/locations/forest.jpg" alt=""><strong>The Forest ✓</strong></button><button disabled>The Beach · Coming soon</button><button disabled>The Mountaintop · Coming soon</button></div><div class="remote-setup-summary"><strong>Your match</strong><p id="remote-setup-summary"></p><p>First to 3 · Doubles · Equal skills</p><p>Each player controls their own team of two.</p></div><button id="remote-create" class="remote-primary">Send invitation ↗</button></section><section id="remote-invite" class="remote-new-game" hidden><button id="remote-invite-back" class="remote-quiet">← Your games</button><p class="remote-eyebrow">GAME INVITATION</p><h1 id="remote-invite-title"></h1><p id="remote-invite-copy"></p><div id="remote-accept-team"></div><button id="remote-accept" class="remote-primary">Accept & start game ↗</button><button id="remote-decline" class="remote-quiet" hidden>Decline game</button><button id="remote-cancel-invite" class="remote-quiet" hidden>Cancel invitation</button><button id="remote-delete-invite" class="remote-quiet" hidden>Delete invitation</button></section><section id="remote-game" hidden><div id="remote-court"></div><div class="court-top"><div class="score" aria-label="Match score"><div class="score-row"><span id="remote-home-names"></span><b id="remote-home-score">0</b></div><div class="score-row score-row-away"><span id="remote-away-names"></span><b id="remote-away-score">0</b></div></div></div><button id="remote-replay" class="remote-replay" aria-label="Replay last move" title="Replay last move" disabled>↻ Replay</button><button id="remote-open-settings" class="gameplay-settings" aria-label="Game settings"><img src="/assets/picklebash-gameplay-ui/hud/picklebash-settings-button.png" alt=""></button><button id="remote-back" class="remote-court-back">← Your games</button><div class="remote-move-banner" role="status" aria-live="polite"><p id="remote-move"></p><small id="remote-live-status"></small><button id="remote-retry" hidden>Retry saved turn</button></div><dialog id="game-settings" aria-labelledby="settings-title"><div class="settings-heading"><h2 id="settings-title">Game settings</h2><button id="close-settings" aria-label="Close settings">✕</button></div><p id="remote-settings-account"></p><h3>Current players</h3><div id="remote-lineup"></div><p>Teams are fixed for this game.</p><label class="settings-toggle"><span>Flight guide<small>Show the ball path.</small></span><input id="remote-guides" type="checkbox" role="switch"></label><label class="settings-toggle"><span>Player names<small>Show names above players.</small></span><input id="remote-names" type="checkbox" role="switch" checked></label><label class="settings-toggle"><span>Playback speed<small>Animation speed on this device.</small></span><select id="remote-speed"><option value="1">1× · Normal</option><option value="2">2×</option><option value="3">3×</option></select></label><button id="remote-reset-camera">Reset camera</button><p id="remote-rules"></p><details id="remote-shot-options"><summary>Shot list · default targets</summary><div id="remote-choices"></div></details></dialog></section>`;
const el=(id:string)=>document.getElementById(id)!;
let session:RemoteSession|null=null,scene:CourtScene|undefined,account='',config:RemoteConfig|null=null;
let signup=true,accountEmail='',shownRoster='';
const settings=el('game-settings') as HTMLDialogElement;
const gameEnd=document.createElement('dialog');gameEnd.id='game-end';gameEnd.setAttribute('aria-labelledby','game-end-title');gameEnd.innerHTML=`<div class="game-end-card"><div class="game-end-kicker">GAME COMPLETE</div><div class="game-end-emblem" aria-hidden="true">✦</div><p class="game-end-label">THE WINNERS</p><h1 id="game-end-title"></h1><p class="game-end-subtitle">A game worth playing. A win worth celebrating.</p><div class="game-end-score" aria-label="Final score"><div><strong id="game-end-home-score"></strong><span id="game-end-home-names"></span></div><span class="game-end-dash">–</span><div><strong id="game-end-away-score"></strong><span id="game-end-away-names"></span></div></div><p class="game-end-rule" id="remote-end-rule"></p><div class="game-end-actions"><button id="remote-end-back">← Your games</button></div></div>`;document.body.append(gameEnd);
gameEnd.addEventListener('cancel',e=>e.preventDefault());el('remote-end-back').onclick=()=>void lobby().catch(e=>status(e.message));
const GAME_END_PAUSE_MS=2500;
let gameEndReadyAt:number|null=null;
function syncGameEnd(){const s=session?.state;if(gameEnd.open)return;
 // Give the final landing and result banner time on screen, including after replay.
 if(!s||s.status!=='completed'||animation.length||el('remote-game').hidden||document.hidden||settings.open){gameEndReadyAt=null;return;}
 gameEndReadyAt??=performance.now()+GAME_END_PAUSE_MS;
 if(performance.now()<gameEndReadyAt)return;
 const home=['you','partner'] as const,away=['opponent-left','opponent-right'] as const,names=(ids:readonly (keyof PublicMatch['roster'])[])=>ids.map(id=>s.roster[id].name).join(' & ');
 el('game-end-title').textContent=`${names(s.score.home>s.score.away?home:away)} win!`;
 el('game-end-home-score').textContent=String(s.score.home);el('game-end-away-score').textContent=String(s.score.away);el('game-end-home-names').textContent=names(home);el('game-end-away-names').textContent=names(away);el('remote-end-rule').textContent=`FINAL SCORE · FIRST TO ${s.rules.target}`;
 if(!gameEnd.open){clearTarget();settings.close();gameEnd.showModal();}
}
function animationShot(segment:TurnAnimation,state:GameState):RallyShot{return {...presentation(state,segment.intent),contact:{...segment.path[0]},aimPoint:{...segment.path.at(-1)!},legs:segment.path.slice(1).map((to,i)=>({from:{...segment.path[i]},to:{...to},duration:segment.duration/(segment.path.length-1),arc:0}))}}

let playbackSpeed=1,flightGuides=false,playerNames=true,playbackElapsed=0,lastFrame=0;
try{const saved=JSON.parse(localStorage.getItem('pickle-remote-view')??'null');if(saved){if([1,2,3].includes(saved.speed))playbackSpeed=saved.speed;flightGuides=saved.guides===true;playerNames=saved.names!==false}}catch{}
function saveView(){try{localStorage.setItem('pickle-remote-view',JSON.stringify({speed:playbackSpeed,guides:flightGuides,names:playerNames}))}catch{}}
function leaveCourt(){pointPauseRemaining=0;gameEndReadyAt=null;document.body.classList.remove('remote-playing');settings.close();gameEnd.close();scene?.setRetainedTrajectory(null);}
(el('remote-speed') as HTMLSelectElement).value=String(playbackSpeed);
(el('remote-guides') as HTMLInputElement).checked=flightGuides;
(el('remote-names') as HTMLInputElement).checked=playerNames;
el('remote-speed').onchange=()=>{playbackSpeed=Number((el('remote-speed') as HTMLSelectElement).value);saveView()};
el('remote-guides').onchange=()=>{flightGuides=(el('remote-guides') as HTMLInputElement).checked;scene?.setGuides(flightGuides);saveView()};
el('remote-names').onchange=()=>{playerNames=(el('remote-names') as HTMLInputElement).checked;scene?.setPlayerNames(playerNames);saveView()};
el('remote-reset-camera').onclick=()=>scene?.resetCamera();
el('remote-replay').onclick=()=>{
 const s=session?.state;if(!s?.animation.length||session?.busy||session?.pending)return;
 clearTarget();pointPauseRemaining=0;animation=structuredClone(s.animation);display=structuredClone(s.display);shot=presentation(display);playbackElapsed=0;animationStart=performance.now();lastFrame=animationStart;
};
el('remote-open-settings').onclick=()=>{clearTarget();settings.showModal()};
el('close-settings').onclick=()=>settings.close();

let targetPicker:CourtTargetPicker|undefined;
let games:PublicMatch[]=[],gameFilter='active',invitations:Invitation[]=[],selectedInvite:Invitation|null=null;let createTeam:TeamPicker|undefined,acceptTeam:TeamPicker|undefined,accepting=false;
let display:GameState|null=null,shot:RallyShot|null=null,shownVersion=-1,animation:TurnAnimation[]=[],animationStart=0;
let pointPauseRemaining=0;
const pointCelebrating=()=>!!session?.state?.result&&(animation.length>0||pointPauseRemaining>0);
function showLogin(){selectedInvite=null;el('remote-invite').hidden=true;leaveCourt();el('remote-setup').hidden=true;el('remote-password-reset').hidden=true;clearTarget();session?.dispose();session=null;account='';display=null;animation=[];el('remote-name-setup').hidden=true;el('remote-login').hidden=false;el('remote-lobby').hidden=true;el('remote-game').hidden=true;el('remote-sign-out').hidden=true;el('remote-account').textContent='';}
function accountLabel(){const name=config?.selfName??'Signed in';return accountEmail&&name!==accountEmail?`${name} · ${accountEmail}`:name;}
function opponentLabel(s:PublicMatch){const id=s.accountIds?.[s.viewerTeam==='home'?'away':'home'];return config?.testers.find(t=>t.id===id)?.name??'Opponent';}
function status(message:string){el('remote-status').textContent=message;el('remote-live-status').textContent=message;if(message)document.querySelector<HTMLElement>('.remote-move-banner')!.hidden=false;}
function presentation(state:GameState,intent= session?.state?.choices[0]?.intent):RallyShot {
 const actor=session?.state?.serving&&!intent?session.state.server:intent?.actor??state.currentHitter??'you',p=state.ball.position;
 return {actor,intent:intent??{schemaVersion:1,actor,type:session?.state?.serving?'serve':'return',target:{kind:'zone',zone:'middle',depth:'deep'},pace:'medium',shape:'arc',intendedNetClearance:.4,tacticalIntent:'sustain',aggression:.5,source:'menu'},title:'',description:'',cue:'',contact:{...p},aimPoint:{...p},legs:[{from:{...p},to:{...p},duration:1,arc:0}],positions:Object.fromEntries(state.players.map(p=>[p.id,p.position])) as RallyShot['positions']};
}
function choiceLabel(intent:PublicMatch['choices'][number]['intent']){
 const spin=intent.spin;const variant=spin?.vertical==='topspin'?'Topspin':spin?.vertical==='slice'?'Backspin':spin?.side&&spin.side!=='none'?'Sidespin':intent.intendedNetClearance>=2?'Lob':intent.pace==='fast'?'Fast':intent.pace==='soft'?'Soft':'';
 return `${variant&&variant.toLowerCase()!==intent.type?variant+' ':''}${intent.type}`;
}
function clearTarget(){targetPicker?.clear();}
function render(){
 if(!session)return;const s=session.state;
 status(session.busy?'':session.message||(session.offline?'Offline · showing the last saved state.':''));
 el('remote-retry').hidden=!session.pending||session.busy;(el('remote-retry') as HTMLButtonElement).disabled=session.busy;
 (el('remote-replay') as HTMLButtonElement).disabled=!s?.animation.length||session.busy||!!session.pending;
 if(!s)return;
 const lastFlight=!s.result&&!session.busy&&!session.pending?s.animation.at(-1):undefined;scene?.setRetainedTrajectory(lastFlight?animationShot(lastFlight,s.display):null);
 el('remote-account').textContent=`Signed in as ${accountLabel()} · You control Team ${s.viewerTeam==='home'?'A':'B'}`;
 const own=s.viewerTeam==='home'?['you','partner'] as const:['opponent-left','opponent-right'] as const,other=s.viewerTeam==='home'?['opponent-left','opponent-right'] as const:['you','partner'] as const;
 el('remote-home-names').textContent=own.map(id=>s.roster[id].name).join(' & ');el('remote-away-names').textContent=other.map(id=>s.roster[id].name).join(' & ');
 el('remote-home-score').textContent=String(s.score[s.viewerTeam]);el('remote-away-score').textContent=String(s.score[s.viewerTeam==='home'?'away':'home']);
 const lastActor=s.animation.at(-1)?.actor;
 const ownMove=!!lastActor&&s.display.players.find(p=>p.id===lastActor)?.team===s.viewerTeam;
 const hideCommentary=session.busy||!!session.pending||(ownMove&&!s.result);
 el('remote-move').hidden=hideCommentary;
 el('remote-move').textContent=hideCommentary?'':moveCopy(s);
 document.querySelector<HTMLElement>('.remote-move-banner')!.hidden=hideCommentary&&!el('remote-live-status').textContent&&el('remote-retry').hidden;el('remote-settings-account').textContent=`Signed in as ${accountLabel()}`;
 el('remote-rules').textContent=`${s.rules.scoring==='rally-doubles'?'Rally scoring':'Side-out scoring'} · First to ${s.rules.target}`;
 const lineup=el('remote-lineup');lineup.replaceChildren();for(const [label,ids] of [['Your team',own],['Opponents',other]] as const){const row=document.createElement('p');row.textContent=`${label}: ${ids.map(id=>s.roster[id].name).join(' & ')}`;lineup.append(row);}
 if(shownVersion!==s.version){
  const initial=shownVersion<0;clearTarget();shownVersion=s.version;display=structuredClone(s.display);shot=presentation(display);
  if(initial&&scene)scene.setViewTeam(s.viewerTeam);
  pointPauseRemaining=0;animation=structuredClone(s.animation);animationStart=performance.now();playbackElapsed=0;lastFrame=animationStart;
 }
 if(!animation.length&&display&&!pointPauseRemaining)shot=presentation(display);
 const rosterKey=JSON.stringify(s.roster);if(scene&&shownRoster!==rosterKey){for(const id of SLOTS)scene.substitutePlayer(id,s.roster[id]);shownRoster=rosterKey;}
 el('remote-shot-options').hidden=!s.choices.length;
 targetPicker?.sync(!settings.open&&!pointCelebrating());
 const choices=el('remote-choices');choices.replaceChildren();
 for(const choice of s.choices){const b=document.createElement('button');b.textContent=`${choice.timing?`${choice.timing==='air'?'Volley':'After bounce'} · `:''}${choiceLabel(choice.intent)} · ${targetLabel(choice.intent.target)}`;b.disabled=session.busy||!!session.pending||session.offline||pointCelebrating();b.onclick=()=>{settings.close();clearTarget();skip();void session?.submit(choice).catch(e=>status(e.message));};choices.append(b);}
}
function skip(){pointPauseRemaining=0;animation=[];if(session?.state){display=structuredClone(session.state.display);shot=presentation(display);}syncGameEnd();}
async function open(id:string){selectedInvite=null;el('remote-invite').hidden=true;
 (el('remote-solo') as HTMLAnchorElement).href=`/?returnMatch=${encodeURIComponent(id)}`;
 clearTarget();session?.dispose();shownVersion=-1;shownRoster='';session=null;animation=[];display=null;shot=null;
 const credentials=await matchCredentials();if(account&&credentials.owner!==account)throw new Error('Account changed. Reload remote play.');account=credentials.owner;config=await remoteRequest<RemoteConfig>(credentials.token,'/api/multiplayer/config');el('remote-account').textContent=`Signed in as ${accountLabel()}`;el('remote-login').hidden=true;el('remote-sign-out').hidden=false;
 el('remote-setup').hidden=true;el('remote-lobby').hidden=true;el('remote-game').hidden=false;document.body.classList.add('remote-playing');
 const url=new URL(location.href);url.searchParams.delete('invite');url.searchParams.set('match',id);history.replaceState(null,'',url);
 if(!scene){await preloadAthletes();scene=new CourtScene(el('remote-court'),()=>{});scene.setGuides(flightGuides);scene.setPlayerNames(playerNames);targetPicker=new CourtTargetPicker(remoteTargeting(()=>session,skip,status,()=>!pointCelebrating()),scene);}

 session=new RemoteSession(account,id,matchCredentials,remoteRequest,localStorage,render);render();await session.refresh();if(session.state&&!session.offline){try{localStorage.setItem(`pickle-remote:${account}:${id}:opened`,'1')}catch{}}if(session.pending)await session.retry();
}
async function lobby(){selectedInvite=null;el('remote-invite').hidden=true;leaveCourt();
 (el('remote-solo') as HTMLAnchorElement).href='/';
 clearTarget();session?.dispose();session=null;animation=[];display=null;shot=null;el('remote-setup').hidden=true;el('remote-game').hidden=true;el('remote-lobby').hidden=false;
 const url=new URL(location.href);url.searchParams.delete('match');url.searchParams.delete('invite');history.replaceState(null,'',url);
 const c=await matchCredentials();account=c.owner;config=await remoteRequest<RemoteConfig>(c.token,'/api/multiplayer/config');
 el('remote-account').textContent=`Signed in as ${accountLabel()}`;el('remote-login').hidden=true;el('remote-sign-out').hidden=false;
 const select=el('remote-opponent') as HTMLSelectElement;select.replaceChildren();for(const tester of config.testers){const option=document.createElement('option');option.value=tester.id;option.textContent=tester.name.replace('Tester ','Player ');select.append(option);}
 for(const id of ['remote-create','remote-start-setup'])(el(id) as HTMLButtonElement).disabled=!config.creationEnabled||!config.testers.length;
 await refreshLobbyCards();
 status(config.creationEnabled?'':'New games are unavailable for this account. You can still open your existing games.');
}
async function refreshLobbyCards(){const c=await matchCredentials();[games,invitations]=await Promise.all([remoteRequest<PublicMatch[]>(c.token,'/api/matches'),remoteRequest<Invitation[]>(c.token,'/api/invitations')]);renderGames();renderInvitations();}
function renderInvitations(){const host=el('remote-invitations');host.replaceChildren();if(gameFilter==='completed')return;for(const invite of invitations){const incoming=invite.recipientId===account;if(gameFilter==='turn'&&(!incoming||invite.status!=='pending'))continue;const card=document.createElement('button');card.className='remote-game-card';const badge=document.createElement('span');badge.className='remote-badge ready';badge.textContent=invite.status==='declined'?'DECLINED':incoming?'NEW GAME · INVITATION':'INVITATION SENT';const title=document.createElement('strong');title.textContent=invite.status==='declined'?`${invite.recipientName} declined`:incoming?`${invite.creatorName} invited you`:`Waiting for ${invite.recipientName}`;const copy=document.createElement('span');copy.className='remote-card-opponent';copy.textContent=invite.status==='declined'?'Open to delete this invitation.':incoming?'Choose your team and accept. You serve first.':'The game starts when they select their team and accept.';const details=document.createElement('span');details.className='remote-card-created';details.textContent=`The Forest · ${new Date(invite.createdAt).toLocaleString()}`;card.append(badge,title,copy,details);card.onclick=()=>void showInvitation(invite.id).catch(e=>status(e.message));host.append(card);}}
async function showInvitation(id:string){const c=await matchCredentials();const invite=await remoteRequest<Invitation>(c.token,`/api/invitations/${id}`);if(invite.status==='accepted'&&invite.matchId){await open(invite.matchId);return;}selectedInvite=invite;el('remote-lobby').hidden=true;el('remote-setup').hidden=true;el('remote-invite').hidden=false;const url=new URL(location.href);url.searchParams.set('invite',id);url.searchParams.delete('match');history.replaceState(null,'',url);const incoming=invite.recipientId===account;
 el('remote-invite-title').textContent=incoming?`Play against ${invite.creatorName}`:`Waiting for ${invite.recipientName}`;
 el('remote-invite-copy').textContent=`${invite.creatorName} chose ${invite.team.map(p=>p.name).join(' & ')}. The Forest · ${invite.scoring==='rally-doubles'?'Rally':'Side-out'} scoring · First to 3. ${incoming?'Choose your player and partner. Your team serves first.':'Your opponent will choose their team before the game starts.'}`;
 const pending=invite.status==='pending';
 el('remote-accept-team').hidden=!incoming||!pending;el('remote-accept').hidden=!incoming||!pending;el('remote-decline').hidden=!incoming||!pending;el('remote-cancel-invite').hidden=incoming||!pending;el('remote-delete-invite').hidden=incoming||invite.status!=='declined';
 if(!pending){el('remote-invite-title').textContent=invite.status==='declined'?`${invite.recipientName} declined the game`:'Invitation cancelled';el('remote-invite-copy').textContent=invite.status==='declined'?'This game will not start. The sender can delete this invitation.':'This invitation is no longer available.';}
 if(incoming&&pending)acceptTeam=new TeamPicker(el('remote-accept-team'));status('');}
for(const [buttonId,action] of [['remote-decline','decline'],['remote-cancel-invite','cancel'],['remote-delete-invite','delete']] as const){el(buttonId).onclick=()=>{if(!selectedInvite||accepting)return;accepting=true;const id=selectedInvite.id;for(const key of ['remote-accept','remote-decline','remote-cancel-invite','remote-delete-invite'])(el(key) as HTMLButtonElement).disabled=true;void(async()=>{const c=await matchCredentials();await remoteRequest<Invitation>(c.token,`/api/invitations/${id}/${action}`,{});await lobby();status(action==='decline'?'Game declined.':action==='cancel'?'Invitation cancelled.':'Invitation deleted.');})().catch(e=>status(e.message)).finally(()=>{accepting=false;for(const key of ['remote-accept','remote-decline','remote-cancel-invite','remote-delete-invite'])(el(key) as HTMLButtonElement).disabled=false;});};}
 el('remote-invite-back').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-accept').onclick=()=>{if(!selectedInvite||!acceptTeam||accepting)return;accepting=true;const id=selectedInvite.id,button=el('remote-accept') as HTMLButtonElement;button.disabled=true;const key=`pickle-remote:${account}:${id}:accept`;void(async()=>{const c=await matchCredentials();const saved=localStorage.getItem(key),request=saved?JSON.parse(saved):{team:acceptTeam!.team};localStorage.setItem(key,JSON.stringify(request));const game=await remoteRequest<PublicMatch>(c.token,`/api/invitations/${id}/accept`,request);localStorage.removeItem(key);await open(game.id)})().catch(e=>status(e.message)).finally(()=>{accepting=false;button.disabled=false});};
function renderGames(){
 const container=el('remote-games');container.replaceChildren();
 const active=games.filter(g=>g.status==='active');el('remote-game-count').textContent=`${active.length} in play`;
 const visible=games.filter(g=>gameFilter==='completed'?g.status==='completed':g.status==='active'&&(gameFilter!=='turn'||g.currentTeam===g.viewerTeam)).sort((a,b)=>Number(b.currentTeam===b.viewerTeam)-Number(a.currentTeam===a.viewerTeam));
 if(!visible.length){const empty=document.createElement('div');empty.className='remote-empty';const title=document.createElement('h3');title.textContent=gameFilter==='turn'?'You’re all caught up.':gameFilter==='completed'?'The first finish is ahead.':'A fresh court awaits.';const copy=document.createElement('p');copy.textContent=gameFilter==='turn'?'Your opponents are up. Check back for your next shot.':gameFilter==='completed'?'Completed games will be waiting here.':'Choose a player and start your first game.';empty.append(title,copy);container.append(empty);}
 for(const game of visible){
  const card=document.createElement('button');card.className='remote-game-card';const yours=game.currentTeam===game.viewerTeam,done=game.status==='completed';
  const badge=document.createElement('span');badge.className='remote-badge '+(done?'finished':yours?'ready':'waiting');badge.textContent=done?'Finished':yours?'Your turn':'Their turn';
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
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]')))button.onclick=()=>{gameFilter=button.dataset.filter!;for(const sibling of Array.from(document.querySelectorAll('[data-filter]')))sibling.setAttribute('aria-pressed',String(sibling===button));renderGames();renderInvitations();};
async function create(){
 const c=await matchCredentials();if(c.owner!==account)throw Error('Account changed. Reload remote play.');if(!createTeam)throw Error('Choose your team.');
 const key=`pickle-remote:${account}:invitation`;const saved=localStorage.getItem(key);const request:InviteRequest=saved?JSON.parse(saved):{requestId:playerId(),opponentId:(el('remote-opponent') as HTMLSelectElement).value,team:createTeam.team,court:'forest',scoring:(el('remote-scoring') as HTMLSelectElement).value as InviteRequest['scoring']};localStorage.setItem(key,JSON.stringify(request));
 await remoteRequest<Invitation>(c.token,'/api/invitations',request);localStorage.removeItem(key);await lobby();status('Invitation sent. Your opponent will choose their team and serve first.');
}
function setupSummary(){const select=el('remote-opponent') as HTMLSelectElement;el('remote-setup-summary').textContent=`${config?.selfName??'You'} vs ${select.selectedOptions[0]?.textContent??'Choose a player'}`;}
el('remote-start-setup').onclick=()=>{el('remote-lobby').hidden=true;el('remote-setup').hidden=false;createTeam=new TeamPicker(el('remote-create-team'));setupSummary();el('remote-opponent').focus();};
el('remote-opponent').onchange=setupSummary;
el('remote-cancel-setup').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-create').onclick=()=>{const button=el('remote-create') as HTMLButtonElement;button.disabled=true;void create().catch(e=>status(e.message)).finally(()=>{button.disabled=!config?.creationEnabled||!config.testers.length;});};
el('remote-back').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-refresh').onclick=()=>void (session?session.refresh():selectedInvite?showInvitation(selectedInvite.id):lobby()).catch(e=>status(e.message));
el('remote-retry').onclick=()=>void session?.retry();
let renderFailed=false;
function frame(now:number){
 try{if(!renderFailed&&scene&&display&&shot&&!document.hidden){
  if(pointPauseRemaining>0){pointPauseRemaining=Math.max(0,pointPauseRemaining-Math.max(0,Math.min(now-lastFrame,100)));if(!pointPauseRemaining){skip();render();}}
  if(animation.length){playbackElapsed+=Math.max(0,Math.min(now-lastFrame,100))*playbackSpeed;const segment=animation[0],sample=samplePlayback(segment,playbackElapsed),progress=sample.progress;
   display.ball.position=sample.position;display.players=sample.players;display.elapsed=progress*segment.duration;display.phase='flight';display.paused=false;display.simulationTime=now/1000;shot=animationShot(segment,display);
   if(progress===1){animation.shift();animationStart=now;playbackElapsed=0;if(!animation.length){if(session?.state?.result&&session.state.status==='active'){pointPauseRemaining=3000;display.paused=true;clearTarget();}else skip();}}
  }
  scene.setNextHitter(session?.state?.status==='active'&&!pointCelebrating()?session.state.nextHitter??null:null);
  scene.render(display,now/1000,shot,null);targetPicker?.sync(!el('remote-game').hidden&&!settings.open&&!gameEnd.open&&!pointCelebrating());
 }
 }catch(error){renderFailed=true;console.error('Remote court render failed',error);status('Court rendering failed. Reload to restore the saved match.');}
 syncGameEnd();lastFrame=now;requestAnimationFrame(frame);
}requestAnimationFrame(frame);
setInterval(()=>{if(document.hidden)return;if(session&&!session.busy)void session.refresh();else if(!el('remote-lobby').hidden)void refreshLobbyCards().catch(e=>status(e.message));else if(selectedInvite&&!accepting){const id=selectedInvite.id;void matchCredentials().then(c=>remoteRequest<Invitation>(c.token,`/api/invitations/${id}`)).then(i=>{if(selectedInvite?.id===id){if(i.status==='accepted'&&i.matchId)return open(i.matchId);if(i.status!==selectedInvite.status)return showInvitation(id);}}).catch(e=>status(e.message));}},5000);
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
 const {data:{session:auth}}=await client.auth.getSession();if(!auth){showLogin();status('');return;}accountEmail=auth.user.email??'';if(!auth.user.user_metadata?.player_name){showLogin();el('remote-login').hidden=true;el('remote-name-setup').hidden=false;status(`Signed in as ${accountEmail}`);return;}el('remote-name-setup').hidden=true;const inviteId=new URLSearchParams(location.search).get('invite');if(inviteId&&/^[a-f0-9-]{36}$/i.test(inviteId)){await lobby();await showInvitation(inviteId);return;}const matchId=new URLSearchParams(location.search).get('match');if(matchId&&/^[a-f0-9-]{36}$/i.test(matchId))await open(matchId);else await lobby();}
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
