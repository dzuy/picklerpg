import {courtName} from '../locations';
import {type CourtLocation} from '../locations';
import {loadScoringPreference,saveScoringPreference} from '../scoring-preference';
import {loadFlightGuide,saveFlightGuide} from '../flight-guide-preference';
import {showGameXp} from '../account-xp';
import {focusView,showViewDialog} from '../view-focus';
import {publicOrigin} from '../native-origin';
import {parseSoloLaunch} from '../solo-launch';
import {courtSelector} from '../court-selector';
import {shareIcon} from './share-icon';
import {invitationShare,showGameShare} from './game-share';
import {installGameListExit} from '../game-list-exit';
import {serveDotCount,updateServeIndicator} from '../serve-indicator';
import {atpWinner} from '../atp-celebration';
import {openPlayerDetails,playerDetailsOpen} from '../player-details';
import {thinkingOpponent} from './thinking';
import {AvatarThumbnails} from '../avatar-preview';
import {FriendSearch} from './friend-search';
import {strategyDetails,strategyStoryDetails} from './strategy-view';
import {rivalryData,rivalryHeadline,rivalryStats,seriesLine} from './rivalry-view';
import {RematchFlow} from './rematch-flow';
import './rivalry.css';
import {signInDialog} from './sign-in-dialog';
import {pendingInviteCard} from './pending-invite-card';
import {gameCardLineup} from '../game-card-lineup';
import {PlayerCreator} from '../player-creator';
import {addPlayerToSignedInAccount,CloudPlayerSync,PENDING_ACCOUNT_PLAYER_KEY} from '../cloud-players';
import {friendActionNeedsAccount,setupModeForAccount} from './guest-access';
import {initialLobbyPage} from '../app-navigation';
import {openGameSurface} from '../game-surface';
import '../game-surface.css';
import {hudButtonIcon} from '../hud-button';
import {TeamLobby} from './team-lobby';
import {lobbyTeam,type TeamDirectory,type LobbyTeam} from './team-directory';
import {renderOpenPlayGames} from '../open-play-cards';
import {guestStep,guestTargetArea,guestTargetAllowed} from './guest-onboarding';
import {shareMatch,shareChallenge,type FriendChallenge,createYourPlayer} from './friend-flow';
import {invitationCard} from './invitation-card';
import {TrashTalkControl} from './trash-talk-control';
import {sounds,installSoundSetting} from '../sound';
import {PlaybackSounds} from '../game-sounds';
const playbackSounds=new PlaybackSounds();
import {sendInvitationDraft} from './send-invitation';
import {mountTurnPrompt,showTurnPromptAfterInvite,disableDevicePush} from '../pwa';
import {invitationPreview} from './invitation-preview';
import '../style.css';
import '../gameplay-hud.css';
import './remote.css';
import './lobby.css';
import '../settings.css';
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
import {remoteRequest,RemoteError} from './api';
import {playbackDuration,samplePlayback,replayOutcome} from './playback';
import {RemoteSession} from './match-session';
import type {PublicMatch,RemoteConfig,TurnAnimation} from './protocol';
import {browserSessionStorage,browserStorage} from '../browser-storage';
document.body.dataset.screen='remote';
const root=document.querySelector<HTMLDivElement>('#app')!;
root.className='remote-app';
root.innerHTML=`<header class="remote-nav"><a id="remote-solo" class="remote-home-link" href="/?home=1" aria-label="Home" title="Home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/></svg></a><span class="open-play-nav-title">Open Play</span><a id="remote-lobby-roster" href="/?roster=1&amp;from=multiplayer">Roster ↗</a></header><section id="remote-login" class="remote-new-game" hidden><p class="remote-eyebrow">WELCOME TO THE COURT</p><h1>Create your account</h1><p id="remote-status" role="status" aria-live="polite" hidden></p><p id="remote-auth-copy">Use a different email on each device and choose a password of at least 6 characters. No confirmation email is needed for this playtest.</p><form id="remote-login-form"><label id="remote-name-label">Player name<input id="remote-player-name" autocomplete="nickname" maxlength="32" required></label><label id="remote-username-label">Username<input id="remote-username" autocomplete="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="e.g. bobsmith" required><small>Unique · 3–24 letters, numbers, or underscores.</small></label><label>Email<input id="remote-email" type="email" autocomplete="username" required></label><label>Password<input id="remote-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required></label><button class="remote-primary" id="remote-sign-in">Create account ↗</button></form><button id="remote-auth-mode" class="remote-quiet">Already registered? Sign in</button></section><section id="remote-name-setup" class="remote-new-game" hidden><h1>What should we call you?</h1><p>Your player name appears in games and the opponent list.</p><form id="remote-name-form"><label>Player name<input id="remote-existing-name" autocomplete="nickname" maxlength="32" required></label><button class="remote-primary">Save player name ↗</button></form></section><section id="remote-password-reset" class="remote-new-game" hidden><h1>Choose a new password</h1><p id="remote-reset-account"></p><p>For this playtest, use 6–128 characters. No capitals, numbers, or symbols required.</p><form id="remote-reset-form"><label>New password<input id="remote-new-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required></label><button class="remote-primary">Save password and play ↗</button></form></section><section id="remote-lobby" data-games-state="loading" hidden><div class="remote-lobby-layout"><section class="remote-match-list" aria-busy="true"><div class="remote-games-loading" role="status"><span>Loading your games…</span><button type="button" id="remote-games-retry" hidden>Try again</button></div><div class="remote-section-heading"><p class="remote-eyebrow">OPEN PLAY</p><h2>Your games</h2></div><div class="remote-filters" role="group" aria-label="Filter games"><button data-filter="active" aria-pressed="true">In play</button><button data-filter="turn" aria-pressed="false">Your turn</button><button data-filter="completed" aria-pressed="false">Finished</button><button data-filter="archived" aria-pressed="false">Archived</button></div><div id="remote-invitations"></div><div id="remote-games"></div><section id="remote-waiting" aria-label="Waiting invitations"><hr><div id="remote-waiting-games"></div><div id="remote-waiting-invitations"></div></section></section><section class="remote-new-game remote-start-card"><div class="remote-lobby-court" aria-hidden="true"><span></span></div><h2>There’s always a game.</h2><p>A fresh matchup. Your team. Let’s play.</p><a class="remote-primary open-play-start" href="/?newgame=1">Start a Game <span aria-hidden="true">↗</span></a><div class="open-play-private"><h3>Meet a friend on court</h3><p>Create a private match. Each of you manages a team.</p><button id="remote-start-setup" class="remote-primary">Invite a Friend</button></div></section></div></section><section id="remote-setup" class="remote-new-game" aria-label="Set up a game" hidden><header class="remote-setup-header"><a id="remote-cancel-setup" href="/?openplay=1">← Back to Play Menu</a><div class="remote-setup-heading"><h1>Play with a Friend</h1></div></header><div class="remote-setup-fields"><div id="remote-friend-name-field"><label for="remote-friend-name">Friend’s name</label><input id="remote-friend-name" autocomplete="off" maxlength="24" required placeholder="e.g. Bob"><small>No account needed. Share the game link with them.</small></div><label id="remote-opponent-field">Choose a friend<select id="remote-opponent"></select></label><label>Scoring<select id="remote-scoring"><option value="rally-doubles" selected>Rally scoring</option><option value="side-out-doubles">Side-out scoring</option></select></label><label>Points limit<select id="remote-target" required><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7" selected>7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option></select></label></div><section class="remote-setup-section"><h2>Choose Your Players</h2><div id="remote-create-team"></div></section><section class="remote-setup-section"><h2>Choose your court</h2><div class="court-selector">${courtSelector('forest','data-remote-court')}</div></section><div class="remote-setup-footer"><button id="remote-create" class="remote-primary">Start Game</button></div></section><section id="remote-invite" class="remote-new-game" hidden><button id="remote-invite-back" class="remote-quiet" aria-label="Close invitation">✕ Close</button><div class="remote-invite-heading"><p class="remote-eyebrow">GAME INVITATION</p><h1 id="remote-invite-title"></h1><p id="remote-invite-copy"></p></div><div id="remote-invite-preview"></div><h2 id="remote-accept-team-title">Choose your team</h2><div id="remote-accept-team"></div><div class="remote-invite-actions"><button id="remote-accept" class="remote-primary">Accept & start game ↗</button><button id="remote-decline" class="remote-quiet" hidden>Decline game</button><button id="remote-cancel-invite" class="remote-quiet" hidden>Cancel invitation</button><button id="remote-delete-invite" class="remote-quiet" hidden>Delete invitation</button></div></section><section id="remote-game" hidden><div id="remote-court"></div><div class="court-top"><div class="score" aria-label="Match score"><header class="remote-score-heading"><strong id="remote-score-matchup"></strong><span id="remote-score-format"></span></header><div class="score-row"><span id="remote-home-names"></span><b id="remote-home-score">0</b></div><div class="score-row score-row-away"><span id="remote-away-names"></span><b id="remote-away-score">0</b></div></div></div><nav class="remote-court-actions" aria-label="Match controls"><button id="remote-open-settings" class="gameplay-settings" aria-label="Game settings">${hudButtonIcon('settings')}</button><button id="remote-back" aria-label="Close game" title="Close game">${hudButtonIcon('close')}</button><button id="remote-replay" class="remote-replay" aria-label="Replay last move" title="Replay last move" disabled>${hudButtonIcon('replay')}</button></nav><div class="remote-move-banner" role="status" aria-live="polite"><p id="remote-move"></p><small id="remote-live-status"></small><button id="remote-retry" hidden>Retry saved turn</button></div><dialog id="game-settings" aria-labelledby="settings-title"><div class="settings-heading"><div><h2 id="settings-title">Game settings</h2><p id="remote-rules"></p></div><button id="close-settings" aria-label="Close settings">✕</button></div><label class="settings-toggle"><span>Game notifications<small>Notify me when it’s my turn in this game.</small></span><input id="remote-game-notifications" type="checkbox" role="switch" checked></label><p id="remote-notification-status" role="status"></p><label class="settings-toggle"><span>Flight guide<small>Show the ball path.</small></span><input id="remote-guides" type="checkbox" role="switch"></label><label class="settings-toggle"><span>Player names<small>Show names above players.</small></span><input id="remote-names" type="checkbox" role="switch" checked></label></dialog></section>`;
const el=(id:string)=>document.getElementById(id)!;
el('remote-friend-name-field').querySelector('small')!.textContent='Share the link—they can create their account when they join.';
const createStatus=document.createElement('p');createStatus.id='remote-create-status';createStatus.setAttribute('role','status');createStatus.setAttribute('aria-live','polite');el('remote-create').before(createStatus);
const inviteStatus=document.createElement('p');inviteStatus.id='remote-invite-status';inviteStatus.setAttribute('role','status');el('remote-accept').before(inviteStatus);
const claimPlayer=document.createElement('button');claimPlayer.className='remote-quiet';claimPlayer.textContent='Create your player';claimPlayer.hidden=true;claimPlayer.onclick=()=>void createYourPlayer(async()=>{location.assign('/?openplay=1&setup=1');}).catch(e=>status(e.message));el('game-settings').append(claimPlayer);
const reshare=document.createElement('button');reshare.className='remote-quiet';reshare.textContent='Share game';reshare.hidden=true;reshare.onclick=()=>{if(session)void shareMatch(session.state!.id,session.state!.friendState==='pending').catch(e=>status(e.message));};el('game-settings').append(reshare);
let session:RemoteSession|null=null,scene:CourtScene|undefined,account='',config:RemoteConfig|null=null;
let signup=true,accountEmail='',shownRoster='';
const settings=el('game-settings') as HTMLDialogElement;
let autoPlay=false,autoPlayDecision='';
const autoPlayLabel=document.createElement('label');autoPlayLabel.className='settings-toggle';
autoPlayLabel.innerHTML='<span>Auto-play my player · Temporary<small>For testing: automatically plays your team’s turns while this game is open. Your friend controls their own side.</small></span><input id="remote-auto-play" type="checkbox" role="switch">';
settings.append(autoPlayLabel);
const autoPlayInput=autoPlayLabel.querySelector('input')!;
autoPlayInput.onchange=()=>{autoPlay=autoPlayInput.checked;autoPlayDecision='';clearTarget();};

installSoundSetting(settings,{checkbox:true,before:el('remote-guides').closest('label')!});
const trashTalk=new TrashTalkControl(el('remote-game'),settings,matchCredentials,()=>clearTarget());
let settingsCloseTimer:ReturnType<typeof setTimeout>|undefined;
function openSettings(){
 clearTimeout(settingsCloseTimer);settingsCloseTimer=undefined;settings.classList.remove('is-closing');
 if(!settings.open)showViewDialog(settings);
}
function closeSettings(){
 if(!settings.open||settingsCloseTimer!==undefined)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){settings.close();return;}
 settings.classList.add('is-closing');
 settingsCloseTimer=setTimeout(()=>settings.close(),180);
}
settings.addEventListener('close',()=>{clearTimeout(settingsCloseTimer);settingsCloseTimer=undefined;settings.classList.remove('is-closing')});
settings.addEventListener('cancel',event=>{event.preventDefault();closeSettings()});

const gameEnd=document.createElement('dialog');gameEnd.id='game-end';gameEnd.setAttribute('aria-labelledby','game-end-title');gameEnd.innerHTML=`<div class="game-end-card"><div class="game-end-kicker">GAME COMPLETE</div><div class="game-end-emblem" aria-hidden="true">✦</div><p class="game-end-label">THE WINNERS</p><h1 id="game-end-title"></h1><p class="game-end-subtitle">A game worth playing. A win worth celebrating.</p><div class="game-end-score" aria-label="Final score"><div><strong id="game-end-home-score"></strong><span id="game-end-home-names"></span></div><span class="game-end-dash">–</span><div><strong id="game-end-away-score"></strong><span id="game-end-away-names"></span></div></div><div class="game-end-actions"><button id="remote-end-back">← Your games</button></div></div>`;document.body.append(gameEnd);
gameEnd.classList.add('rivalry-game-end');
const rivalryCompletion=document.createElement('section');rivalryCompletion.className='rivalry-completion';gameEnd.querySelector('.game-end-score')!.after(rivalryCompletion);
const rematchStatus=document.createElement('p');rematchStatus.className='rematch-status';rematchStatus.setAttribute('role','status');rivalryCompletion.after(rematchStatus);
const rematch=document.createElement('button');rematch.id='remote-rematch';rematch.className='rematch-primary';el('remote-end-back').before(rematch);
const rematchFlow=new RematchFlow(matchCredentials,remoteRequest,()=>{
 rematch.textContent=rematchFlow.busy?'Opening rematch…':rematchFlow.waiting?'Rematch requested':rematchFlow.closed?'Rematch closed':rematchFlow.status.status==='accepted'?'Open rematch':rematchFlow.status.status==='pending'?'Accept rematch':'Rematch';
 rematch.disabled=rematchFlow.busy||rematchFlow.waiting||rematchFlow.closed||!config?.creationEnabled||!session?.state?.accountIds?.[session.state.viewerTeam==='home'?'away':'home'];
 rematch.setAttribute('aria-busy',String(rematchFlow.busy));
 rematchStatus.textContent=rematchFlow.message||(rematchFlow.waiting?`Waiting for ${session?.state?opponentLabel(session.state):'your opponent'}. You’ll join when they accept.`:rematchFlow.status.status==='pending'?`${session?.state?opponentLabel(session.state):'Your opponent'} is ready for another game.`:'');
},async id=>{gameEnd.close();await open(id);});
rematch.onclick=()=>void rematchFlow.submit();
const gameXp=document.createElement('section');rivalryCompletion.after(gameXp);
// Temporarily hide the shot breakdown on the friends game end screen.
const shotSelections=document.createElement('section');shotSelections.hidden=true;gameXp.after(shotSelections);
let completionKey='';
function renderCompletion(s:PublicMatch){
 const opponent=opponentLabel(s),key=JSON.stringify([s.id,s.version,s.rivalry,s.strategy,s.strategyStory,opponent,s.endedEarly]);if(key===completionKey)return;completionKey=key;
 if(s.endedEarly){gameXp.dataset.xpGame='';gameXp.textContent='Incomplete game · 0 XP';}else void showGameXp(gameXp,s.id,()=>{gameEnd.close();openRoster()},'friends');
 const own=s.score[s.viewerTeam],other=s.score[s.viewerTeam==='home'?'away':'home'];
 gameEnd.querySelector('.game-end-kicker')!.textContent=`YOU VS ${opponent}`;
 const subtitle=gameEnd.querySelector<HTMLElement>('.game-end-subtitle')!;subtitle.textContent=s.endedEarly?'A player left this game.':'';subtitle.hidden=!s.endedEarly;
 const winnerSlots=s.score.home>s.score.away?['you','partner'] as const:['opponent-left','opponent-right'] as const;
 el('game-end-title').textContent=s.endedEarly?'Game ended':winnerSlots.map(id=>s.roster[id].name).join(' & ');
 gameEnd.querySelector('.game-end-label')!.textContent=s.endedEarly?'ENDED EARLY':'THE WINNERS';
 el('game-end-home-score').textContent=String(own);el('game-end-away-score').textContent=String(other);
 el('game-end-home-names').textContent='You';el('game-end-away-names').textContent=opponent;
 rivalryCompletion.replaceChildren();shotSelections.replaceChildren();const data=rivalryData(s.rivalry),summary=s.endedEarly?data?.current:data?.atCompletion;
 const headline=document.createElement('h2');headline.id='rivalry-headline';
 if(s.endedEarly)headline.textContent='Your rivalry record stays the same.';
 else if(summary){const selected=rivalryHeadline(summary,opponent);headline.textContent=selected.text;headline.dataset.storyKey=selected.key;}
 else headline.textContent='Another game, another chance.';
 rivalryCompletion.append(headline);
 if(summary){rivalryCompletion.append(rivalryStats(summary));if(!s.endedEarly&&data?.current&&data.current.games>summary.games){const note=document.createElement('p');note.className='rivalry-note';note.textContent='Record at the end of this game.';rivalryCompletion.append(note);}}
 else{const note=document.createElement('p');note.className='rivalry-note';note.textContent=s.endedEarly?'Early exits do not count toward wins or streaks.':'Your rivalry record is unavailable right now.';rivalryCompletion.append(note);}
 if(!s.endedEarly){const story=strategyStoryDetails(s.strategyStory,opponent);if(story)rivalryCompletion.append(story);shotSelections.append(strategyDetails(s.strategy));}
}
gameEnd.addEventListener('cancel',e=>e.preventDefault());el('remote-end-back').onclick=()=>void lobby().catch(e=>status(e.message));
const leaveGame=document.createElement('button');leaveGame.type='button';leaveGame.id='remote-leave-game';leaveGame.className='remote-quiet';leaveGame.textContent='Leave game';settings.append(leaveGame);
leaveGame.onclick=()=>{
 const id=session?.state?.id;if(!id)return;
 if(!window.confirm('Leave this game? This ends the game for both players and moves it to your archive.'))return;
 leaveGame.disabled=true;
 void(async()=>{const c=await matchCredentials();await remoteRequest(c.token,`/api/matches/${id}/leave`,{});settings.close();await lobby();teamLobby?.selectTab('games');status('');})().catch(e=>status(e.message)).finally(()=>{leaveGame.disabled=false;});
};
const GAME_END_PAUSE_MS=2500;
let gameEndReadyAt:number|null=null;
function syncGameEnd(){const s=session?.state;
 if(scene?.celebratingAtp||scene?.reactingToHit)return;
 if(gameEnd.open){if(s)renderCompletion(s);return;}
 // Preserve replay-first return: the final landing and pause finish before the result.
 if(replayActive()||!s||s.status!=='completed'||animation.length||session?.busy||session?.pending||el('remote-game').hidden||document.hidden||settings.open){gameEndReadyAt=null;if(replayActive()||!s||s.status!=='completed'||el('remote-game').hidden)scene?.cancelMatchCelebration();return;}
 if(!s.endedEarly&&scene&&!scene.finishMatch(s.id,s.score,s.viewerTeam,opponentLabel(s)))return;
 gameEndReadyAt??=performance.now()+(s.endedEarly?GAME_END_PAUSE_MS:0);
 if(performance.now()<gameEndReadyAt)return;
 renderCompletion(s);clearTarget();settings.close();showViewDialog(gameEnd);
 rematchFlow.reset(s.id,session!.owner);void rematchFlow.refresh();focusView(gameEnd);
}
function animationShot(segment:TurnAnimation,state:GameState):RallyShot{return {...presentation(state,segment.intent),contact:{...segment.path[0]},aimPoint:{...segment.path.at(-1)!},legs:segment.path.slice(1).map((to,i)=>({from:{...segment.path[i]},to:{...to},duration:segment.pathTimes?segment.pathTimes[i+1]-segment.pathTimes[i]:segment.duration/(segment.path.length-1),arc:0}))}}

const playbackSpeed=1;let flightGuides=loadFlightGuide('friends'),playerNames=true,playbackElapsed=0,lastFrame=0;
try{const saved=JSON.parse(browserStorage.getItem('pickle-remote-view')??'null');if(saved){playerNames=saved.names!==false}}catch{}
function saveView(){browserStorage.setItem('pickle-remote-view',JSON.stringify({guides:flightGuides,names:playerNames}))}
function saveCameraView(){if(scene&&session?.state&&!el('remote-game').hidden)browserStorage.setItem(`pickle-camera:${session.owner}:${session.matchId}`,JSON.stringify(scene.cameraView()));}
window.addEventListener('pagehide',saveCameraView);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveCameraView();});
function leaveCourt(){rematchFlow.reset();completionKey='';saveCameraView();trashTalk.reset();endReplay();pointPauseRemaining=0;gameEndReadyAt=null;document.body.classList.remove('remote-playing');settings.close();gameEnd.close();scene?.setRetainedTrajectory(null);}
(el('remote-guides') as HTMLInputElement).checked=flightGuides;
(el('remote-names') as HTMLInputElement).checked=playerNames;
el('remote-guides').onchange=()=>{flightGuides=(el('remote-guides') as HTMLInputElement).checked;scene?.setGuides(flightGuides);saveFlightGuide(flightGuides);saveView()};
el('remote-names').onchange=()=>{playerNames=(el('remote-names') as HTMLInputElement).checked;scene?.setPlayerNames(playerNames);saveView()};
const replayOverlay=document.createElement('section');replayOverlay.id='replay-overlay';replayOverlay.hidden=true;replayOverlay.setAttribute('aria-label','Move replay');
replayOverlay.innerHTML='<div class="replay-player"><button id="replay-toggle" class="replay-toggle" aria-label="Pause replay">Ⅱ</button><div class="replay-track"><div><strong>Replay</strong><output id="replay-time"></output></div><input id="replay-position" type="range" min="0" max="0" value="0" step="0.01" aria-label="Replay timeline"></div><button id="close-replay" aria-label="Exit replay" title="Exit replay">✕</button></div>';
el('remote-game').append(replayOverlay);
let replaySegments:TurnAnimation[]=[] ,replayTime=0,replayPlaying=false;
const replayActive=()=>!replayOverlay.hidden;
let replayResult:import('../engine/model').PointResult|null=null;
const replayDuration=()=>replayOutcome(replaySegments,replayResult,replayTime).duration;
function endReplay(){scene?.setReplayBodyHit(undefined);replayResult=null;replayOverlay.hidden=true;replayPlaying=false;replaySegments=[];document.body.classList.remove('remote-replaying');}
function drawReplay(){
 if(!display||!replaySegments.length)return;
 let time=replayTime,segment=replaySegments[replaySegments.length-1];
 for(const candidate of replaySegments){segment=candidate;if(time<=playbackDuration(candidate)||candidate===replaySegments.at(-1))break;time-=playbackDuration(candidate);}
 scene?.setReplayBodyHit(replayOutcome(replaySegments,replayResult,replayTime).bodyHit);
 const sample=samplePlayback(segment,time*1000);
 display.ball.position=sample.position;display.players=sample.players;display.elapsed=sample.progress*segment.duration;display.phase='flight';display.paused=!replayPlaying;shot=animationShot(segment,display);
 const duration=replayDuration(),format=(value:number)=>`${Math.floor(value/60)}:${(value%60).toFixed(2).padStart(5,'0')}`;
 const slider=el('replay-position') as HTMLInputElement;slider.max=String(duration);slider.value=String(replayTime);
 el('replay-time').textContent=`${format(replayTime)} / ${format(duration)}`;
 el('replay-toggle').textContent=replayPlaying?'Ⅱ':'▶';el('replay-toggle').setAttribute('aria-label',replayPlaying?'Pause replay':'Play replay');
}
function toggleReplay(){if(replayTime>=replayDuration())replayTime=0;replayPlaying=!replayPlaying;drawReplay();}
el('replay-toggle').onclick=toggleReplay;
el('replay-position').oninput=event=>{replayPlaying=false;replayTime=Number((event.target as HTMLInputElement).value);drawReplay();};
el('close-replay').onclick=()=>{endReplay();skip();render();focusView();};
replayOverlay.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();el('close-replay').click();}else if(event.code==='Space'&&event.target instanceof HTMLInputElement){event.preventDefault();toggleReplay();}};
el('remote-replay').onclick=()=>{
 const s=session?.state;if(!s?.animation.length||session?.busy||session?.pending)return;
 clearTarget();pointPauseRemaining=0;animation=[];replaySegments=structuredClone(s.animation);replayResult=structuredClone(s.result);display=structuredClone(s.display);replayTime=0;replayPlaying=true;replayOverlay.hidden=false;document.body.classList.add('remote-replaying');lastFrame=performance.now();scene?.setRetainedTrajectory(null);drawReplay();focusView();
};
const gameNotifications=el('remote-game-notifications') as HTMLInputElement;
let savingNotifications=false;
gameNotifications.onchange=()=>{const current=session;if(!current?.state)return;const muted=!gameNotifications.checked;savingNotifications=true;gameNotifications.disabled=true;el('remote-notification-status').textContent='Saving…';
 void(async()=>{const c=await matchCredentials();if(c.owner!==current.owner)throw Error('Account changed. Reopen this game.');await remoteRequest(c.token,`/api/matches/${current.matchId}/notifications`,{muted});if(current.state)current.state.notificationsMuted=muted;if(session===current)el('remote-notification-status').textContent=muted?'Notifications off for this game.':'Notifications on for this game.';})().catch(e=>{if(session===current){gameNotifications.checked=!current.state?.notificationsMuted;el('remote-notification-status').textContent=e.message;}}).finally(()=>{savingNotifications=false;gameNotifications.disabled=false;});
};
el('remote-open-settings').onclick=()=>{clearTarget();openSettings()};
el('close-settings').onclick=closeSettings;
let settingsPointerOutside=false;
const outsideSettings=(event:MouseEvent)=>{const r=settings.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
settings.addEventListener('pointerdown',event=>{settingsPointerOutside=event.target===settings&&outsideSettings(event)});
settings.addEventListener('click',event=>{if(settingsPointerOutside&&event.target===settings&&outsideSettings(event))closeSettings();settingsPointerOutside=false;});

let targetPicker:CourtTargetPicker|undefined;
let guestPlayer=false;
const guestGuide=document.createElement('div');guestGuide.className='guest-guide';guestGuide.hidden=true;guestGuide.setAttribute('role','status');guestGuide.setAttribute('aria-live','polite');
const guestTitle=document.createElement('strong'),guestCopy=document.createElement('span');guestGuide.append(guestTitle,guestCopy);el('remote-game').append(guestGuide);
const guestArea=document.createElementNS('http://www.w3.org/2000/svg','svg');guestArea.classList.add('guest-target-area');guestArea.setAttribute('aria-hidden','true');
const guestPolygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');guestArea.append(guestPolygon);el('remote-game').append(guestArea);
function syncGuestGuide(){
 const s=session?.state??null,step=guestStep(s,guestPlayer);
 const visible=!!step&&!el('remote-game').hidden&&!settings.open&&!gameEnd.open&&!replayActive()&&!animation.length&&!pointPauseRemaining&&!session?.busy&&!session?.pending;
 guestGuide.hidden=!visible;el('remote-game').classList.toggle('guest-guided',visible);
 claimPlayer.hidden=!guestPlayer||!!step;
 guestArea.style.display=visible&&step!=='wait'&&!targetPicker?.active?'block':'none';
 if(!visible||!s||!step)return;
 const title=step==='serve'?'Your serve':step==='wait'?`${opponentLabel(s)}'s turn`:'Your turn';
 const copy=step==='wait'?"We'll let you know when it's your turn again.":targetPicker?.active?'':step==='serve'?'Tap in the highlighted box to serve':'Tap where you want to hit';
 if(guestTitle.textContent!==title)guestTitle.textContent=title;
 if(guestCopy.textContent!==copy)guestCopy.textContent=copy;
 if(step!=='wait'&&scene){
  const a=guestTargetArea(s,step);
  guestPolygon.setAttribute('points',[[a.minX,a.minZ],[a.maxX,a.minZ],[a.maxX,a.maxZ],[a.minX,a.maxZ]].map(([x,z])=>{const p=scene!.projectTarget({x,z});return `${p.x},${p.y}`}).join(' '));
 }
}

let games:PublicMatch[]=[],gameFilter='active',invitations:Invitation[]=[],selectedInvite:Invitation|null=null;let createTeam:TeamPicker|undefined,acceptTeam:TeamPicker|undefined,accepting=false;
let display:GameState|null=null,shot:RallyShot|null=null,shownVersion=-1,animation:TurnAnimation[]=[],animationStart=0;
let pointPauseRemaining=0;
const pointCelebrating=()=>!!session?.state?.result&&(animation.length>0||pointPauseRemaining>0);
function showLogin(){selectedInvite=null;el('remote-invite').hidden=true;leaveCourt();el('remote-setup').hidden=true;el('remote-password-reset').hidden=true;clearTarget();session?.dispose();session=null;account='';display=null;animation=[];el('remote-name-setup').hidden=true;el('remote-login').hidden=false;el('remote-lobby').hidden=true;el('remote-game').hidden=true;}
function opponentName(s:PublicMatch){const id=s.accountIds?.[s.viewerTeam==='home'?'away':'home'];return teamDirectory?.teams.find(t=>t.id===id)?.manager?.trim()||config?.testers.find(t=>t.id===id)?.name?.trim()||(s.viewerTeam==='home'?s.invitedName?.trim():undefined);}
function opponentLabel(s:PublicMatch){return opponentName(s)??'Opponent';}
function status(message:string){
 createStatus.textContent=el('remote-setup').hidden?'':message;
 inviteStatus.textContent=el('remote-invite').hidden?'':message;
 const accountPanel=['remote-login','remote-name-setup','remote-password-reset'].map(id=>el(id)).find(panel=>!panel.hidden);
 const accountStatus=el('remote-status');
 accountStatus.textContent=accountPanel?message:'';accountStatus.hidden=!accountPanel||!message;
 if(accountPanel)accountPanel.append(accountStatus);
 el('remote-live-status').textContent=message;
 if(message)document.querySelector<HTMLElement>('.remote-move-banner')!.hidden=false;
}
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
 if(!savingNotifications)gameNotifications.checked=!session?.state?.notificationsMuted;
 trashTalk.update(session?.state??null,session?.owner??'');
 if(!session){return;}const s=session.state;
 status(session.busy?'':session.message||(session.offline?'Offline · showing the last saved state.':''));
 el('remote-retry').hidden=!session.pending||session.busy;(el('remote-retry') as HTMLButtonElement).disabled=session.busy;
 (el('remote-replay') as HTMLButtonElement).disabled=!s?.animation.length||session.busy||!!session.pending;
 if(!s){display=null;animation=[];shot=null;clearTarget();return;}
 const lastFlight=!s.result&&!session.busy&&!session.pending?s.animation.at(-1):undefined;scene?.setRetainedTrajectory(lastFlight&&!replayActive()?animationShot(lastFlight,s.display):null);

 const own=s.viewerTeam==='home'?['you','partner'] as const:['opponent-left','opponent-right'] as const,other=s.viewerTeam==='home'?['opponent-left','opponent-right'] as const:['you','partner'] as const;
 el('remote-score-matchup').textContent=`${config?.selfName?.trim()||teamDirectory?.self.manager||'You'} vs ${opponentLabel(s)}`;
 el('remote-score-format').textContent=`${s.rules.scoring==='rally-doubles'?'Rally':'Side-out'} to ${s.rules.target} · Win by ${s.rules.winBy}`;
 el('remote-home-names').textContent=own.map(id=>s.roster[id].name).join(' & ');el('remote-away-names').textContent=other.map(id=>s.roster[id].name).join(' & ');
 el('remote-home-score').textContent=String(s.score[s.viewerTeam]);el('remote-away-score').textContent=String(s.score[s.viewerTeam==='home'?'away':'home']);
 const serverNumber=s.rules.scoring==='rally-doubles'?1:s.serverNumber??(/[-–]2$/.test(s.serveCall)?2:1);
 updateServeIndicator(el('remote-home-score').closest<HTMLElement>('.score-row')!,serveDotCount(s.viewerTeam,s.server,serverNumber,s.status==='completed'));
 updateServeIndicator(el('remote-away-score').closest<HTMLElement>('.score-row')!,serveDotCount(s.viewerTeam==='home'?'away':'home',s.server,serverNumber,s.status==='completed'));
 const lastActor=s.animation.at(-1)?.actor;
 const ownMove=!!lastActor&&s.display.players.find(p=>p.id===lastActor)?.team===s.viewerTeam;
 const selection=session.selectionCommentary?.version===s.version?session.selectionCommentary.text:null;
 const hideCommentary=session.busy||!!session.pending;
 el('remote-move').hidden=hideCommentary;
 el('remote-move').textContent=hideCommentary?'':ownMove&&!s.result&&selection?selection:moveCopy(s);
 document.querySelector<HTMLElement>('.remote-move-banner')!.hidden=hideCommentary&&!el('remote-live-status').textContent&&el('remote-retry').hidden;reshare.hidden=false;if(session?.state?.friendState==='pending')el('remote-move').textContent=`Waiting for ${session?.state?.invitedName} to join…`;else if(s.friendState==='cancelled')el('remote-move').textContent='This challenge is no longer available.';
 el('remote-rules').textContent=`${s.rules.scoring==='rally-doubles'?'Rally scoring':'Side-out scoring'} · First to ${s.rules.target}`;
 if(shownVersion!==s.version){
  const initial=shownVersion<0;endReplay();clearTarget();shownVersion=s.version;display=structuredClone(s.display);shot=presentation(display);
  if(initial&&scene){scene.setViewTeam(s.viewerTeam);scene.setLocation(s.court??'forest');scene.resetCamera();try{const saved=browserStorage.getItem(`pickle-camera:${session.owner}:${s.id}`);if(saved)scene.restoreCameraView(JSON.parse(saved));}catch{/* Ignore obsolete camera data. */}}
  pointPauseRemaining=0;animation=structuredClone(s.animation);animationStart=performance.now();playbackElapsed=0;lastFrame=animationStart;
 }
 if(!replayActive()&&!animation.length&&display&&!pointPauseRemaining)shot=presentation(display);
 const rosterKey=JSON.stringify(s.roster);if(scene&&shownRoster!==rosterKey){for(const id of SLOTS)scene.substitutePlayer(id,s.roster[id]);shownRoster=rosterKey;}
 targetPicker?.sync(!settings.open&&!trashTalk.isOpen&&!pointCelebrating()&&!replayActive());
}
function skip(){endReplay();pointPauseRemaining=0;animation=[];if(session?.state){display=structuredClone(session.state.display);shot=presentation(display);}syncGameEnd();}
async function open(id:string){autoPlay=false;autoPlayDecision='';autoPlayInput.checked=false;rematchFlow.reset();completionKey='';gameEnd.close();gameEndReadyAt=null;saveCameraView();trashTalk.reset();selectedInvite=null;el('remote-invite').hidden=true;
 (el('remote-solo') as HTMLAnchorElement).href=`/?home=1&returnMatch=${encodeURIComponent(id)}`;
 clearTarget();session?.dispose();shownVersion=-1;shownRoster='';session=null;animation=[];display=null;shot=null;
 const credentials=await matchCredentials();if(account&&credentials.owner!==account)throw new Error('Account changed. Reload remote play.');account=credentials.owner;guestPlayer=!!(await authClient()?.auth.getSession())?.data.session?.user.is_anonymous;config=await remoteRequest<RemoteConfig>(credentials.token,'/api/multiplayer/config');el('remote-login').hidden=true;
 el('remote-setup').hidden=true;el('remote-lobby').hidden=true;el('remote-game').hidden=false;document.body.classList.add('remote-playing');
 const url=new URL(location.href);url.searchParams.delete('invite');url.searchParams.set('match',id);history.replaceState(null,'',url);
 if(!scene){await preloadAthletes();scene=new CourtScene(el('remote-court'),id=>{const state=session?.state,player=state?.roster[id];if(!state||!player)return;clearTarget();const team=state.display.players.find(p=>p.id===id)?.team;openPlayerDetails(player,team===state.viewerTeam?'Your team':'Opponent','',document.activeElement instanceof HTMLElement?document.activeElement:undefined);});scene.setGuides(flightGuides);scene.setPlayerNames(playerNames);targetPicker=new CourtTargetPicker(remoteTargeting(()=>session,skip,status,()=>!pointCelebrating()&&!replayActive()&&(!guestStep(session?.state??null,guestPlayer)||!animation.length),point=>!session?.state||guestTargetAllowed(session.state,guestStep(session.state,guestPlayer),point)),scene);}

 session=new RemoteSession(account,id,matchCredentials,remoteRequest,browserStorage,render);render();await session.refresh();if(session.state&&!session.offline)browserStorage.setItem(`pickle-remote:${account}:${id}:opened`,'1');if(session.pending)await session.retry();
}
let teamDirectory:TeamDirectory|null=null;
let teamLobby:TeamLobby|null=null;
let roster:PlayerCreator|null=null;
let anonymousAccount=true;
function accountRequired(action:()=>void=()=>{}){
 void (async()=>{
  const auth=(await authClient()?.auth.getSession())?.data.session;
  if(auth&&!friendActionNeedsAccount(!!auth.user.is_anonymous)){action();return;}
  const complete=async()=>{await enter();action();};
  await createYourPlayer(async()=>{location.assign('/?openplay=1&setup=1');},{onSignIn:complete});
 })().catch(error=>status((error as Error).message));
}
function openRoster(){
 if(!roster){
  const sync=new CloudPlayerSync(state=>roster?.setCloudStatus(state),state=>{roster?.setCreatorName(state.playerName);roster?.setTeamName(state.teamName)});
  roster=new PlayerCreator(()=>location.assign('/?openplay=1&setup=1'),()=>{},(library,change)=>sync.save(library,change));
  const ready=sync.connect(roster.playerLibrary).then(library=>{roster!.applyCloudLibrary(library);const id=new URLSearchParams(location.search).get('editPlayer');if(id){const player=library.players.find(p=>p.id===id);if(player)roster!.editPlayer(player);}});
  roster.loadHistory=async()=>{await ready;return (await sync.history()).matches};
  roster.saveTeamName=name=>sync.saveTeamName(name);
  roster.beforeSave=async player=>{
   await ready;const auth=(await authClient()?.auth.getSession())?.data.session;if(auth&&!auth.user.is_anonymous)return true;
   browserSessionStorage.setItem(PENDING_ACCOUNT_PLAYER_KEY,JSON.stringify(player));let switching=false;
   const created=await createYourPlayer(async()=>{}, {playerName:player.name,onSignInSelected:()=>{switching=true},onSignIn:async()=>{
    switching=true;const pending=browserSessionStorage.getItem(PENDING_ACCOUNT_PLAYER_KEY);if(!pending)throw new Error('Your new player could not be found. Return to the editor and save again.');
    const destination=new URL('/?openplay=1&importplayer=1',location.origin);history.replaceState(null,'',destination);
    await addPlayerToSignedInAccount(JSON.parse(pending));browserSessionStorage.removeItem(PENDING_ACCOUNT_PLAYER_KEY);location.assign('/?openplay=1');
   }});
   if(created)browserSessionStorage.removeItem(PENDING_ACCOUNT_PLAYER_KEY);else if(!switching)browserSessionStorage.removeItem(PENDING_ACCOUNT_PLAYER_KEY);return created;
  };
  roster.navigate=(page,href)=>{
   roster!.dialog.close();
   if(page==='home'){location.assign(href);return;}
   teamLobby?.selectTab(page);
  };
  roster.dialog.addEventListener('cancel',event=>{event.preventDefault();roster!.navigate!('games','/?openplay=1')});
 }
 roster.open();
}

function renderTeamLobby(){
 const gamesPanel=el('remote-lobby').querySelector<HTMLElement>('.remote-match-list')!;
 el('remote-lobby').querySelector('.team-lobby')?.remove();
 root.parentElement?.querySelector(':scope > .lobby-bottom-nav')?.remove();
 const data=teamDirectory??{self:lobbyTeam('', 'You', {}),teams:[],friends:[]};
 const view=new TeamLobby(data,{signOut:signOutAccount,authenticate:(createAccount)=>{if(!createAccount){signInDialog(async()=>{await enter();teamLobby?.selectTab('profile');status('');});return;}if(createAccount){void createYourPlayer(async()=>{location.assign('/?openplay=1&setup=1');}).catch(e=>status(e.message));return;}},roster:openRoster,create:()=>el('remote-start-setup').click(),invite:()=>accountRequired(()=>challengeTeam()),challenge:challengeTeam,changed:value=>{teamDirectory=value},enabled:!!config?.creationEnabled,games:gamesPanel,rivalryFor:(opponent)=>{const records=games.filter(g=>g.accountIds?.[g.viewerTeam==='home'?'away':'home']===opponent).map(g=>rivalryData(g.rivalry)).filter((r):r is NonNullable<typeof r>=>!!r);return records.sort((a,b)=>(b.current?.games??0)-(a.current?.games??0))[0];}});
 teamLobby=view;el('remote-lobby').prepend(view.element);root.after(view.navigation);
 if(initialLobbyPage()==='roster'&&!roster?.dialog.open)openRoster();
}
let setupMode:'friends'|'solo'='friends';
let soloOpponents:TeamPicker|undefined;
const setupSection=el('remote-setup'),setupFields=setupSection.querySelector<HTMLElement>('.remote-setup-fields')!,ownSection=el('remote-create-team').closest('section')!;
const opponentSection=document.createElement('section');opponentSection.className='remote-setup-section unified-opponents';
opponentSection.innerHTML=`<div class="unified-opponents-heading"><h2>Opponents</h2><button type="button" id="setup-shuffle" aria-label="Shuffle opponents" title="Shuffle opponents" hidden>⤨</button><label class="setup-solo-toggle"><input type="checkbox" id="setup-solo-toggle" aria-controls="setup-friends-panel setup-solo-panel"><span>Play solo game</span></label></div><div id="setup-friends-panel"></div><div id="setup-solo-panel" hidden><div id="remote-solo-opponents"></div></div>`;
const friendField=el('remote-friend-name-field');opponentSection.querySelector('#setup-friends-panel')!.append(friendField);
ownSection.after(opponentSection);
ownSection.classList.add('setup-section-card');ownSection.querySelector('h2')!.textContent='My Players';
opponentSection.classList.add('setup-section-card');
const courtSection=setupSection.querySelector('.court-selector')!.closest('section')!;
const settingsCard=document.createElement('section');settingsCard.className='setup-section-card unified-settings-card';
const settingsHeading=document.createElement('h2');settingsHeading.id='unified-settings-title';settingsHeading.textContent='Game Settings';settingsCard.setAttribute('aria-labelledby',settingsHeading.id);
opponentSection.after(settingsCard);settingsCard.append(settingsHeading,courtSection,setupFields);
const courtHeading=document.createElement('h3');courtHeading.textContent='Choose your court';courtSection.querySelector('h2')!.replaceWith(courtHeading);
function updateSetupAction(){const button=el('remote-create') as HTMLButtonElement;button.textContent=setupMode==='solo'?'Start Game':'Create Invitation';button.disabled=setupMode==='friends'&&!inviteByLink&&!!account&&!config?.creationEnabled;}
function selectSetupMode(mode:'friends'|'solo'){
 setupMode=mode;
 (el('setup-solo-toggle') as HTMLInputElement).checked=mode==='solo';
 el('setup-friends-panel').hidden=mode==='solo';el('setup-solo-panel').hidden=mode!=='solo';
 el('setup-shuffle').hidden=mode!=='solo';
 if(mode==='solo'){
  soloOpponents??=new TeamPicker(el('remote-solo-opponents'),undefined,undefined,false,true);
  void soloOpponents.shuffle().catch(e=>status(e.message));
 }
 updateSetupAction();
}
el('setup-solo-toggle').onchange=()=>{const mode=(el('setup-solo-toggle') as HTMLInputElement).checked?'solo':'friends';if(mode==='friends'&&anonymousAccount){selectSetupMode('solo');accountRequired(()=>challengeTeam());return;}selectSetupMode(mode);};
el('setup-shuffle').onclick=()=>void soloOpponents?.shuffle().catch(e=>status(e.message));
let inviteByLink=false;
let friendSearchPortraits:AvatarThumbnails|undefined;
const friendSearch=new FriendSearch(el('remote-friend-name') as HTMLInputElement,()=>teamDirectory?.teams??[],team=>{
 inviteByLink=!team;
 const select=el('remote-opponent') as HTMLSelectElement;
 select.disabled=!!team;
 if(team){if(!Array.from(select.options).some(option=>option.value===team.id))select.add(new Option(team.manager,team.id));select.value=team.id;}else select.value='';
 updateSetupAction();
},team=>{friendSearchPortraits??=new AvatarThumbnails(128);return friendSearchPortraits.get(team.avatar,'face');});

function challengeTeam(team?:LobbyTeam){
 if(team&&anonymousAccount){accountRequired(()=>challengeTeam(team));return;}
 const preference=loadScoringPreference();
 (el('remote-scoring') as HTMLSelectElement).value=preference.scoring;
 const target=el('remote-target') as HTMLSelectElement;
 if(!Array.from(target.options).some(option=>option.value===String(preference.target)))target.add(new Option(String(preference.target),String(preference.target)));
 target.value=String(preference.target);
 friendSearch.reset(team);
 el('remote-lobby').hidden=true;el('remote-setup').hidden=false;
 const heading=el('remote-setup').querySelector('h1')!;heading.textContent='Set Up a Game';selectSetupMode(setupModeForAccount(anonymousAccount));
 el('remote-opponent-field').hidden=true;
 el('remote-friend-name-field').hidden=false;
 updateSetupAction();
 createTeam=new TeamPicker(el('remote-create-team'),undefined,undefined,true);focusView();
}
function gamesLoadState(state:'loading'|'ready'|'error'){
 el('remote-lobby').dataset.gamesState=state;
 if(state!=='ready')el('remote-games').querySelector('.remote-empty')?.remove();
 el('remote-lobby').querySelector('.remote-match-list')!.setAttribute('aria-busy',String(state==='loading'));
 el('remote-lobby').querySelector('.remote-games-loading span')!.textContent=state==='error'?'Your games could not be loaded.':'Loading your games…';
 el('remote-games-retry').hidden=state!=='error';
}
el('remote-games-retry').onclick=()=>void lobby().catch(e=>status(e.message));
async function lobby(){gamesLoadState('loading');try{el('remote-start-setup').onclick=()=>challengeTeam();existingPlayer.onclick=()=>{if(anonymousAccount){accountRequired(()=>teamLobby?.selectTab('friends'));return;}teamLobby?.selectTab('friends');};selectedInvite=null;el('remote-invite').hidden=true;leaveCourt();
 (el('remote-solo') as HTMLAnchorElement).href='/?home=1';
 clearTarget();session?.dispose();session=null;animation=[];display=null;shot=null;el('remote-setup').hidden=true;el('remote-game').hidden=true;el('remote-lobby').hidden=false;
 const url=new URL(location.href);url.searchParams.delete('match');url.searchParams.delete('invite');history.replaceState(null,'',url);
 const c=await matchCredentials();account=c.owner;renderGames();renderTeamLobby();config=await remoteRequest<RemoteConfig>(c.token,'/api/multiplayer/config');
 el('remote-login').hidden=true;
 const select=el('remote-opponent') as HTMLSelectElement;select.replaceChildren();for(const tester of config.testers){const option=document.createElement('option');option.value=tester.id;option.textContent=tester.name.replace('Tester ','Player ');select.append(option);}
 (el('remote-create') as HTMLButtonElement).disabled=!config.creationEnabled||!config.testers.length;(el('remote-start-setup') as HTMLButtonElement).disabled=false;
 await refreshLobbyCards();
 try{teamDirectory=await remoteRequest<TeamDirectory>(c.token,'/api/multiplayer/teams');renderTeamLobby();renderGames();renderInvitations();}catch(e){renderTeamLobby();status((e as Error).message);return;}
 status('');
 }catch(error){gamesLoadState('error');throw error;}
}
mountTurnPrompt(root);
async function refreshLobbyCards(){
 if(accepting||!account||!config)return;
 const owner=account,c=await matchCredentials();
 try{
  const loaded=await Promise.all([remoteRequest<PublicMatch[]>(c.token,'/api/matches'),remoteRequest<Invitation[]>(c.token,'/api/invitations')]);
  if(account!==owner)return;
  [games,invitations]=loaded;gamesLoadState('ready');renderGames();renderInvitations();
 }catch(error){if(account===owner&&el('remote-lobby').dataset.gamesState!=='ready')gamesLoadState('error');throw error;}
}
function renderInvitations(){const host=el('remote-invitations'),waiting=el('remote-waiting-invitations');host.replaceChildren();waiting.replaceChildren();if(gameFilter==='completed'||gameFilter==='archived')return;for(const invite of invitations){const incoming=invite.recipientId===account;if(gameFilter==='turn'&&(!incoming||invite.status!=='pending'))continue;const card=invitationCard(invite,incoming,(invite.recipientId===teamDirectory?.self.id?teamDirectory.self:teamDirectory?.teams.find(team=>team.id===invite.recipientId))?.avatar);card.onclick=()=>void showInvitation(invite.id).catch(e=>status(e.message));if(invite.status==='declined'&&!incoming){
 const entry=document.createElement('div');entry.className='remote-declined-entry';
 const trash=document.createElement('button');trash.type='button';trash.className='remote-invite-trash';trash.title='Remove declined invitation';trash.setAttribute('aria-label',`Remove declined invitation to ${invite.recipientName}`);
 trash.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
 trash.onclick=()=>{if(accepting)return;accepting=true;trash.disabled=true;void(async()=>{const c=await matchCredentials();if(c.owner!==account)throw Error('Account changed. Reload and try again.');await remoteRequest(c.token,`/api/invitations/${invite.id}/delete`,{});invitations=invitations.filter(i=>i.id!==invite.id);renderInvitations();status('Declined invitation removed.');})().catch(e=>status(e.message)).finally(()=>{accepting=false;trash.disabled=false;});};
 entry.append(card,trash);host.append(entry);
 }else (invite.status==='pending'&&!incoming?waiting:host).append(invite.status==='pending'?pendingInviteCard(card,async()=>new URL(`/?openplay=1&invite=${encodeURIComponent(invite.id)}`,publicOrigin()).href,invite.recipientName,incoming?{accept:()=>respondToInvite(invite.id,'accept'),decline:()=>respondToInvite(invite.id,'decline')}:undefined,()=>{showGameShare(invitationShare(invite));}):card);}}
async function respondToInvite(id:string,action:'accept'|'decline'){
 if(accepting)return;accepting=true;
 try{
  const c=await matchCredentials();if(c.owner!==account)throw Error('Account changed. Reload and try again.');
  if(action==='decline'){
   await remoteRequest(c.token,`/api/invitations/${id}/decline`,{});
   invitations=invitations.filter(i=>i.id!==id);renderInvitations();return;
  }
  const key=`pickle-remote:${account}:${id}:accept`,saved=browserStorage.getItem(key);
  const request=saved?JSON.parse(saved):{team:await new TeamPicker(document.createElement('div'),undefined,teamDirectory?.self.players).freshTeam()};
  browserStorage.setItem(key,JSON.stringify(request));
  const game=await remoteRequest<PublicMatch>(c.token,`/api/invitations/${id}/accept`,request);
  browserStorage.removeItem(key);invitations=invitations.filter(i=>i.id!==id);await open(game.id);
 }finally{accepting=false;}
}
async function showInvitation(id:string){const c=await matchCredentials();const invite=await remoteRequest<Invitation>(c.token,`/api/invitations/${id}`);if(invite.status==='accepted'&&invite.matchId){await open(invite.matchId);return;}selectedInvite=invite;el('remote-lobby').hidden=true;el('remote-setup').hidden=true;el('remote-invite').hidden=false;const url=new URL(location.href);url.searchParams.set('invite',id);url.searchParams.delete('match');history.replaceState(null,'',url);const incoming=invite.recipientId===account;
 el('remote-invite-title').textContent=incoming?`Play against ${invite.creatorName}`:`Waiting for ${invite.recipientName}`;
 el('remote-invite-copy').textContent=`${invite.creatorName} chose ${invite.team.map(p=>p.name).join(' & ')}. ${courtName(invite.court)} · ${invite.scoring==='rally-doubles'?'Rally':'Side-out'} scoring · First to ${invite.target??3}. ${incoming?'Choose your player and partner. Your team serves first.':'Your opponent will choose their team before the game starts.'}`;
 el('remote-invite-preview').replaceChildren(invitationPreview(invite));
 const pending=invite.status==='pending';
 el('remote-accept-team-title').hidden=!incoming||!pending;
 el('remote-accept-team').hidden=!incoming||!pending;el('remote-accept').hidden=!incoming||!pending;el('remote-decline').hidden=!incoming||!pending;el('remote-cancel-invite').hidden=incoming||!pending;el('remote-delete-invite').hidden=incoming||invite.status!=='declined';
 if(!pending){el('remote-invite-title').textContent=invite.status==='declined'?`${invite.recipientName} declined the game`:'Invitation cancelled';el('remote-invite-copy').textContent=invite.status==='declined'?'This game will not start. The sender can delete this invitation.':'This invitation is no longer available.';}
 if(incoming&&pending)acceptTeam=new TeamPicker(el('remote-accept-team'),undefined,teamDirectory?.self.players);status('');}
for(const [buttonId,action] of [['remote-decline','decline'],['remote-cancel-invite','cancel'],['remote-delete-invite','delete']] as const){el(buttonId).onclick=()=>{if(!selectedInvite||accepting)return;accepting=true;const id=selectedInvite.id;for(const key of ['remote-accept','remote-decline','remote-cancel-invite','remote-delete-invite'])(el(key) as HTMLButtonElement).disabled=true;void(async()=>{const c=await matchCredentials();await remoteRequest<Invitation>(c.token,`/api/invitations/${id}/${action}`,{});await lobby();status(action==='decline'?'Game declined.':action==='cancel'?'Invitation cancelled.':'Invitation deleted.');})().catch(e=>status(e.message)).finally(()=>{accepting=false;for(const key of ['remote-accept','remote-decline','remote-cancel-invite','remote-delete-invite'])(el(key) as HTMLButtonElement).disabled=false;});};}
 el('remote-invite-back').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-accept').onclick=()=>{if(!selectedInvite||!acceptTeam||accepting)return;accepting=true;const id=selectedInvite.id,button=el('remote-accept') as HTMLButtonElement;button.disabled=true;button.textContent='Starting game…';status('Preparing your team…');const key=`pickle-remote:${account}:${id}:accept`;void(async()=>{const c=await matchCredentials();const saved=browserStorage.getItem(key),request=saved?JSON.parse(saved):{team:await acceptTeam!.freshTeam()};browserStorage.setItem(key,JSON.stringify(request));const game=await remoteRequest<PublicMatch>(c.token,`/api/invitations/${id}/accept`,request);browserStorage.removeItem(key);await open(game.id)})().catch(e=>status(e.message)).finally(()=>{accepting=false;button.disabled=false;button.textContent='Accept & start game ↗'});};
async function archiveGame(id:string,archived:boolean){const c=await matchCredentials();await remoteRequest(c.token,`/api/matches/${id}/archive`,{archived});if(settings.open)settings.close();await lobby();status(archived?'':'Game restored to your list.');}
window.addEventListener('game-surface-closed',()=>{
 if(!el('remote-setup').hidden&&setupMode==='solo')returnToGameList();
 void refreshLobbyCards().catch(e=>status(e.message));
});
function renderGames(){
 const container=el('remote-games'),waiting=el('remote-waiting-games');container.replaceChildren();waiting.replaceChildren();
 const localCount=renderOpenPlayGames(container,account||'local',gameFilter,renderGames,status);
 const visible=games.filter(g=>g.friendState!=='cancelled').filter(g=>gameFilter==='archived'?g.archived:!g.archived&&(gameFilter==='completed'?g.status==='completed':g.status==='active'&&(gameFilter!=='turn'||g.currentTeam===g.viewerTeam))).sort((a,b)=>Number(b.currentTeam===b.viewerTeam)-Number(a.currentTeam===a.viewerTeam));
 const hasVisibleInvitation=gameFilter==='active'?invitations.length>0:gameFilter==='turn'&&invitations.some(i=>i.recipientId===account&&i.status==='pending');
 if(el('remote-lobby').dataset.gamesState==='ready'&&!visible.length&&!localCount&&!hasVisibleInvitation){const empty=document.createElement('div');empty.className='remote-empty';const active=gameFilter==='active';empty.classList.toggle('remote-empty-game',active);if(active){const art=document.createElement('img');art.className='remote-empty-scene';art.src='/images/forest-court.png';art.alt='Pickleball court in the forest';empty.append(art);const eyebrow=document.createElement('span');eyebrow.className='remote-empty-eyebrow';eyebrow.textContent='YOUR GAMES';empty.append(eyebrow);}const title=document.createElement('h3');title.textContent=gameFilter==='archived'?'No archived games.':gameFilter==='turn'?'You’re all caught up.':gameFilter==='completed'?'The first finish is ahead.':'No active games yet';const copy=document.createElement('p');copy.textContent=gameFilter==='archived'?'Games you archive will appear here. You can restore them anytime.':gameFilter==='turn'?'Your opponents are up. Check back for your next shot.':gameFilter==='completed'?'Completed games will be waiting here.':'Create a game to get started. Your active games will appear here.';empty.append(title,copy);if(active){const create=document.createElement('button');create.type='button';create.className='remote-primary remote-empty-create';create.textContent='Create a New Game';create.onclick=()=>challengeTeam();empty.append(create);}container.append(empty);}
 for(const game of visible){
  const card=document.createElement('button');card.className='remote-game-card has-player-faces';const yours=game.currentTeam===game.viewerTeam,done=game.status==='completed';card.dataset.state=done?'finished':yours?'ready':'waiting';card.classList.toggle('is-your-turn',!done&&yours&&!game.archived&&game.friendState!=='pending'&&game.friendState!=='cancelled');
  const badge=document.createElement('span');badge.className='remote-badge '+(done?'finished':yours?'ready':'waiting');badge.textContent=game.friendState==='pending'?`Waiting for ${game.invitedName}`:game.friendState==='cancelled'?'Challenge cancelled':done?(game.endedEarly?'Ended':'Finished'):yours?'Your turn':opponentName(game)?`${opponentName(game)}'s Turn`:'Their turn';
  const own=game.viewerTeam==='home'?['you','partner'] as const:['opponent-left','opponent-right'] as const;
  const away=game.viewerTeam==='home'?['opponent-left','opponent-right'] as const:['you','partner'] as const;
  const lineup=gameCardLineup(own.map(id=>game.roster[id]),away.map(id=>game.roster[id]));
  const score=document.createElement('span');score.className='remote-card-score';score.setAttribute('aria-label','Score, your team first');score.textContent=`${game.score[game.viewerTeam]} – ${game.score[game.viewerTeam==='home'?'away':'home']}`;
  const action=document.createElement('span');action.className='remote-card-action';action.textContent=done?'View result ↗':yours?'Take your shot ↗':'Open game ↗';
  const ref=document.createElement('span');ref.className='remote-card-ref';ref.textContent=`${courtName(game.court)} · ${game.rules.scoring==='rally-doubles'?'Rally':'Side-out'} · First to ${game.rules.target}`;
  const created=document.createElement('time');created.className='remote-card-created';
  if(game.createdAt&&Number.isFinite(Date.parse(game.createdAt))){created.dateTime=game.createdAt;created.textContent=`Created ${new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(game.createdAt))}`;created.title=new Intl.DateTimeFormat(undefined,{dateStyle:'full',timeStyle:'long'}).format(new Date(game.createdAt));}
  const heading=document.createElement('span');heading.className='remote-card-heading';
  const opponent=document.createElement('strong');opponent.className='remote-card-username';opponent.textContent=`vs ${opponentLabel(game)}`;
  heading.append(opponent,badge);
  card.append(heading,lineup,score);if(created.textContent)card.append(created);const rivalry=rivalryData(game.rivalry);if(rivalry?.current){const line=document.createElement('span');line.className='remote-card-rivalry';const together=document.createElement('span');together.textContent=`${rivalry.current.games} ${rivalry.current.games===1?'game':'games'} together`;const series=document.createElement('span');series.textContent=seriesLine(rivalry.current);line.append(together,series);card.append(line);}card.append(ref,action);card.onclick=()=>void (game.friendState==='pending'?shareMatch(game.id,true):open(game.id)).catch(e=>status(e.message));const entry=document.createElement('div');entry.className='remote-game-entry';
  if(!done&&!game.archived&&game.friendState!=='pending')installGameListExit(card,{
   title:'Leave this game?',message:'This ends the game for both players and moves it to your archive.',action:'Leave game',
   confirm:async()=>{const c=await matchCredentials();await remoteRequest(c.token,`/api/matches/${game.id}/leave`,{});await refreshLobbyCards();}
  });
  const share=document.createElement('button');share.type='button';share.className='remote-quiet remote-share-action';share.innerHTML=shareIcon;share.title='Share game';share.setAttribute('aria-label',`Share game vs ${opponentLabel(game)}`);share.onclick=()=>{share.disabled=true;void shareMatch(game.id,game.friendState==='pending').catch(e=>status(e.message)).finally(()=>{share.disabled=false;});};
  const archive=document.createElement('button');archive.className='remote-quiet remote-archive-action';archive.textContent=game.archived?'Restore game':'Archive game';archive.setAttribute('aria-label',`${game.archived?'Restore':'Archive'} game vs ${opponentLabel(game)}`);archive.title='Only changes your game list';archive.onclick=()=>{archive.disabled=true;void archiveGame(game.id,!game.archived).catch(e=>{status(e.message);archive.disabled=false})};entry.append(game.friendState==='pending'?pendingInviteCard(card,async()=>{const c=await matchCredentials();const challenge=await remoteRequest<{token:string}>(c.token,`/api/multiplayer/challenge-for-match/${game.id}`);return new URL(`/challenge/${challenge.token}`,publicOrigin()).href;},game.invitedName??'your friend',undefined,()=>shareMatch(game.id,true)):card,...(game.friendState==='pending'?[]:[share]),archive);(game.friendState==='pending'?waiting:container).append(entry);
 }
}
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]')))button.onclick=()=>{gameFilter=button.dataset.filter!;for(const sibling of Array.from(document.querySelectorAll('[data-filter]')))sibling.setAttribute('aria-pressed',String(sibling===button));renderGames();renderInvitations();};
async function create(){
 if(!createTeam)throw Error('Choose your team.');
 if(setupMode==='solo'){
  if(!soloOpponents)throw Error('Choose your opponents.');
  const [team,opponents]=await Promise.all([createTeam.freshTeam(),soloOpponents.freshTeam()]);
  const setup=parseSoloLaunch({players:{you:team[0],partner:team[1],'opponent-left':opponents[0],'opponent-right':opponents[1]},court:selectedCourt,target:Number((el('remote-target') as HTMLSelectElement).value),scoring:(el('remote-scoring') as HTMLSelectElement).value});
  openGameSurface('/?newgame=1&configured=1',setup);status('');return;
 }
 const c=await matchCredentials();if(c.owner!==account)throw Error('Account changed. Reload remote play.');
 if(inviteByLink){
  const name=(el('remote-friend-name') as HTMLInputElement).value.trim();if(!name)throw Error('Enter your friend’s name.');
  const selection={name,team:await createTeam.freshTeam(),court:selectedCourt,target:Number((el('remote-target') as HTMLSelectElement).value),scoring:(el('remote-scoring') as HTMLSelectElement).value as InviteRequest['scoring']};
  const key=`pickle-friend-setup:${account}`,saved=browserStorage.getItem(key);
  let draft={...selection,requestId:playerId()};
  try{const previous=JSON.parse(saved??'null');if(previous){const {requestId,...chosen}=previous;if(JSON.stringify(chosen)===JSON.stringify(selection))draft=previous;}}catch{/* Replace malformed drafts. */}
  browserStorage.setItem(key,JSON.stringify(draft));
  const challenge=await remoteRequest<FriendChallenge>(c.token,'/api/multiplayer/challenges',draft);
  saveScoringPreference(draft);
  browserStorage.removeItem(key);status('');await lobby();teamLobby?.selectTab('games');shareChallenge(challenge).addEventListener('close',showTurnPromptAfterInvite,{once:true});return;
 }
 const key=`pickle-remote:${account}:invitation:${(el('remote-opponent') as HTMLSelectElement).value}`;
 const freshRequest=async():Promise<InviteRequest>=>({requestId:playerId(),opponentId:(el('remote-opponent') as HTMLSelectElement).value,team:await createTeam!.freshTeam(),court:selectedCourt,target:Number((el('remote-target') as HTMLSelectElement).value),scoring:(el('remote-scoring') as HTMLSelectElement).value as InviteRequest['scoring']});
 let sentInvitation:Invitation|null=null;
 await sendInvitationDraft(browserStorage.getItem(key),freshRequest,value=>{if(value===null)browserStorage.removeItem(key);else browserStorage.setItem(key,value)},async request=>{const invitation=await remoteRequest<Invitation>(c.token,'/api/invitations',request);saveScoringPreference({scoring:invitation.scoring,target:invitation.target??(invitation.scoring==='rally-doubles'?7:5)});sentInvitation=invitation;return invitation;});
 status('');
 const sent=sentInvitation as Invitation|null;
 if(sent?.status==='accepted'&&sent.matchId){await open(sent.matchId);showGameShare(invitationShare(sent)).addEventListener('close',showTurnPromptAfterInvite,{once:true});return;}
 await lobby();teamLobby?.selectTab('games');if(sent)showGameShare(invitationShare(sent)).addEventListener('close',showTurnPromptAfterInvite,{once:true});
}
let selectedCourt:CourtLocation='forest';
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-remote-court]')))button.onclick=()=>{selectedCourt=button.dataset.remoteCourt as typeof selectedCourt;for(const other of Array.from(document.querySelectorAll('[data-remote-court]')))other.setAttribute('aria-pressed',String(other===button));};
const existingPlayer=document.createElement('button');existingPlayer.className='remote-quiet';existingPlayer.textContent='Invite an existing player';el('remote-start-setup').after(existingPlayer);
el('remote-start-setup').textContent='Create a Game';el('remote-start-setup').onclick=()=>challengeTeam();
existingPlayer.onclick=()=>{if(anonymousAccount){accountRequired(()=>teamLobby?.selectTab('friends'));return;}teamLobby?.selectTab('friends');};
function returnToGameList(){
 const url=new URL(location.href);url.searchParams.delete('setup');history.replaceState(null,'',url);
 if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
 el('remote-setup').hidden=true;el('remote-lobby').hidden=false;
 teamLobby?.selectTab('games');status('');
 window.scrollTo({top:0,behavior:'instant'});
 focusView();
}
el('remote-cancel-setup').onclick=event=>{event.preventDefault();returnToGameList();};
el('remote-create').onclick=()=>{
 if(setupMode==='friends'&&anonymousAccount){accountRequired(()=>challengeTeam());return;}
 const button=el('remote-create') as HTMLButtonElement;
 if(button.disabled||!(el('remote-target') as HTMLSelectElement).reportValidity()||(setupMode==='friends'&&inviteByLink&&!(el('remote-friend-name') as HTMLInputElement).reportValidity()))return;
 const submit=async()=>{button.disabled=true;button.textContent=setupMode==='solo'?'Starting game…':'Creating invitation…';button.setAttribute('aria-busy','true');try{await create();}catch(e){status((e as Error).message);}finally{updateSetupAction();button.removeAttribute('aria-busy');}};
 if(setupMode==='friends'&&!account){signInDialog(async()=>{const c=await matchCredentials();account=c.owner;config=await remoteRequest<RemoteConfig>(c.token,'/api/multiplayer/config');await submit();});return;}
 void submit();
};
el('remote-back').onclick=()=>void lobby().catch(e=>status(e.message));
el('remote-retry').onclick=()=>void session?.retry();
let renderFailed=false;
function frame(now:number){
 try{if(!renderFailed&&scene&&display&&shot&&!document.hidden&&!el('remote-game').hidden){
  if(pointPauseRemaining>0){pointPauseRemaining=Math.max(0,pointPauseRemaining-Math.max(0,Math.min(now-lastFrame,100)));if(!pointPauseRemaining){skip();render();}}
  if(replayActive()){if(replayPlaying){replayTime=Math.min(replayDuration(),replayTime+Math.max(0,Math.min(now-lastFrame,100))/1000*playbackSpeed);if(replayTime>=replayDuration())replayPlaying=false;}drawReplay();}
  else if(animation.length){playbackElapsed+=Math.max(0,Math.min(now-lastFrame,100))*playbackSpeed;const segment=animation[0],sample=samplePlayback(segment,playbackElapsed),progress=sample.progress;
   playbackSounds.update(segment,progress,cue=>sounds.play(cue));
   display.ball.position=sample.position;display.players=sample.players;display.elapsed=progress*segment.duration;display.phase='flight';display.paused=false;display.simulationTime=now/1000;shot=animationShot(segment,display);
   if(progress===1){animation.shift();animationStart=now;playbackElapsed=0;if(!animation.length){const result=session?.state?.result;const atpTeam=atpWinner(segment.intent,result,display.players);if(atpTeam)scene.celebrateAtp(atpTeam,now/1000);if(result){if(result.reason==='body-hit'&&result.playerId)scene.reactToHit(result.playerId,sample.position.y,now/1000);if(result.reason==='net')sounds.play('net');sounds.play(result.winner===session!.state!.viewerTeam?(session!.state!.status==='completed'?'match-win':'point-win'):'point-loss');}if(session?.state?.result&&session.state.status==='active'){pointPauseRemaining=3000;display.paused=true;clearTarget();}else skip();}}
  }
  scene.setNextHitter(session?.state?.status==='active'&&!pointCelebrating()&&!replayActive()?session.state.nextHitter??null:null);
  scene.render(display,now/1000,shot,session?.state?.status==='active'&&!replayActive()&&!pointCelebrating()?session.state.serveCall:null,thinkingOpponent(session?.state??null,!!animation.length||replayActive()||pointCelebrating()||settings.open||gameEnd.open||trashTalk.isOpen));document.getElementById('match-loading')?.remove();trashTalk.frame(scene,display,replayActive()?replayTime:null,!el('remote-game').hidden&&!settings.open&&!gameEnd.open);targetPicker?.sync(!el('remote-game').hidden&&!settings.open&&!trashTalk.isOpen&&!gameEnd.open&&!pointCelebrating()&&!replayActive());
 }
 }catch(error){renderFailed=true;document.getElementById('match-loading')?.remove();console.error('Remote court render failed',error);status('Court rendering failed. Reload to restore the saved match.');}
 syncGuestGuide();syncGameEnd();lastFrame=now;requestAnimationFrame(frame);
}requestAnimationFrame(frame);
// Use the ordinary session submission path so ownership, retries and XP stay unchanged.
setInterval(()=>{
 const current=session,s=current?.state;
 if(!autoPlay||playerDetailsOpen()||document.hidden||el('remote-game').hidden||settings.open||gameEnd.open||trashTalk.isOpen||replayActive()||animation.length||pointPauseRemaining||pointCelebrating()||!current||current.busy||current.pending||current.offline||!s||s.status!=='active'||s.currentTeam!==s.viewerTeam||s.friendState==='pending'||s.friendState==='cancelled'||!s.choices.length)return;
 const decision=`${s.id}:${s.version}:${s.decisionId}`;
 if(autoPlayDecision===decision)return;
 autoPlayDecision=decision;clearTarget();
 void current.submit(s.choices[0]).catch(error=>{
  if(session!==current)return;
  autoPlay=false;autoPlayInput.checked=false;status(`Auto-play paused: ${(error as Error).message}`);
 });
},700);
const LIVE_MATCH_POLL_MS=1000,OTHER_POLL_MS=5000;
let lastOtherPoll=Date.now();
setInterval(()=>{
 if(document.hidden)return;
 const now=Date.now(),otherDue=now-lastOtherPoll>=OTHER_POLL_MS;
 if(otherDue)lastOtherPoll=now;
 if(gameEnd.open&&otherDue)void rematchFlow.refresh();
 if(session){
  const waitingForFriend=session.state?.status==='active'&&session.state.friendState!=='cancelled'&&session.state.currentTeam!==session.state.viewerTeam;
  if(!session.busy&&(waitingForFriend||otherDue))void session.refresh();
 }
 else if(otherDue&&!el('remote-lobby').hidden)void refreshLobbyCards().catch(e=>status(e.message));
 else if(otherDue&&selectedInvite&&!accepting){const id=selectedInvite.id;void matchCredentials().then(c=>remoteRequest<Invitation>(c.token,`/api/invitations/${id}`)).then(i=>{if(selectedInvite?.id===id){if(i.status==='accepted'&&i.matchId)return open(i.matchId);if(i.status!==selectedInvite.status)return showInvitation(id);}}).catch(e=>status(e.message));}
},LIVE_MATCH_POLL_MS);
window.addEventListener('focus',()=>{if(session)void session.refresh();});window.addEventListener('online',()=>{if(session)void session.refresh();});
authClient()?.auth.onAuthStateChange((_event,s)=>{claimPlayer.hidden=!s?.user.is_anonymous;if(account&&s?.user.id!==account){showOpenLobby('',s?'loading':'ready');status('');}});
function showOpenLobby(owner='',state:'loading'|'ready'='ready'){
 gamesLoadState(state);
 showLogin();account=owner;accountEmail='';config=null;el('remote-login').hidden=true;el('remote-lobby').hidden=false;games=[];invitations=[];renderGames();renderInvitations();
 const privateSetup=()=>accountRequired(()=>teamLobby?.selectTab('friends'));
 el('remote-start-setup').onclick=()=>challengeTeam();existingPlayer.onclick=privateSetup;teamDirectory=null;renderTeamLobby();
}
async function enter(){const client=authClient();if(!client){showOpenLobby();if(new URLSearchParams(location.search).has('setup'))challengeTeam();return;}
 const recovery=new URLSearchParams(location.hash.slice(1));
 if(recovery.get('type')==='recovery'&&recovery.get('token_hash')){
  const token_hash=recovery.get('token_hash')!;const clean=new URL(location.href);clean.hash='';clean.searchParams.delete('match');history.replaceState(null,'',clean);
  browserSessionStorage.removeItem('pickle-password-reset');showLogin();status('Checking your reset link…');
  const {error}=await client.auth.verifyOtp({token_hash,type:'recovery'});if(error){status('This reset link has expired or was already used. Request a new one.');return;}
  browserStorage.setItem('pickle-email-accounts-v1','1');browserSessionStorage.setItem('pickle-password-reset','1');
 }
 if(browserSessionStorage.getItem('pickle-password-reset')){
  const {data:{session:auth}}=await client.auth.getSession();showLogin();
  if(!auth){browserSessionStorage.removeItem('pickle-password-reset');status('Your reset session expired. Request a new reset link.');return;}
  el('remote-login').hidden=true;el('remote-password-reset').hidden=false;el('remote-reset-account').textContent=`Resetting password for ${auth.user.email??'your account'}`;status('');return;
 }
 browserStorage.setItem('pickle-email-accounts-v1','1');
 const fragment=new URLSearchParams(location.hash.slice(1));if(fragment.has('error')){await client.auth.signOut({scope:'local'});showLogin();status('That sign-in link failed. Use your email and password below.');return;}
 let {data:{session:auth}}=await client.auth.getSession();
 if(!auth){const signedIn=await client.auth.signInAnonymously();if(signedIn.error)throw signedIn.error;auth=signedIn.data.session;}
 if(!auth)throw new Error('Guest play is unavailable right now. Please refresh and try again.');
 const route=new URL(location.href);if(route.searchParams.has('importplayer')){const pending=browserSessionStorage.getItem(PENDING_ACCOUNT_PLAYER_KEY);if(pending){status('Adding your new player to this account…');await addPlayerToSignedInAccount(JSON.parse(pending));browserSessionStorage.removeItem(PENDING_ACCOUNT_PLAYER_KEY);}route.searchParams.delete('importplayer');history.replaceState(null,'',route);}
 anonymousAccount=!!auth.user.is_anonymous;claimPlayer.hidden=!auth.user.is_anonymous;accountEmail=auth.user.email??'';el('remote-name-setup').hidden=true;const inviteId=new URLSearchParams(location.search).get('invite');if(inviteId&&/^[a-f0-9-]{36}$/i.test(inviteId)){await lobby();await showInvitation(inviteId);return;}const matchId=new URLSearchParams(location.search).get('match');if(matchId&&/^[a-f0-9-]{36}$/i.test(matchId))await open(matchId);else{await lobby();if(new URLSearchParams(location.search).has('setup'))challengeTeam();}}
function authMode(){el('remote-auth-copy').textContent=signup?'Choose a player name, use a different email on each device, and choose a password of at least 6 characters. No confirmation email is needed.':'Sign in with the email and password you registered on this device.';el('remote-name-label').hidden=!signup;el('remote-username-label').hidden=!signup;(el('remote-username') as HTMLInputElement).required=signup;(el('remote-player-name') as HTMLInputElement).required=signup;el('remote-login').querySelector('h1')!.textContent=signup?'Create your account':'Welcome back';el('remote-sign-in').textContent=signup?'Create account ↗':'Sign in ↗';el('remote-auth-mode').textContent=signup?'Already registered? Sign in':'New here? Create an account';(el('remote-password') as HTMLInputElement).autocomplete=signup?'new-password':'current-password';(el('remote-password') as HTMLInputElement).minLength=signup?6:1;}
el('remote-auth-mode').onclick=()=>{signup=!signup;authMode();status('');};
(el('remote-login-form') as HTMLFormElement).onsubmit=e=>{e.preventDefault();const button=el('remote-sign-in') as HTMLButtonElement;button.disabled=true;status(signup?'Creating account…':'Signing in…');void(async()=>{const client=authClient();if(!client)throw Error('Cloud accounts are not configured.');const credentials={email:(el('remote-email') as HTMLInputElement).value.trim(),password:(el('remote-password') as HTMLInputElement).value};
 if(signup)await remoteRequest('', '/api/multiplayer/register',{...credentials,username:(el('remote-username') as HTMLInputElement).value.trim(),playerName:(el('remote-player-name') as HTMLInputElement).value.trim()});
 const {error}=await client.auth.signInWithPassword(credentials);if(error)throw Error(error.status===400?'Sign-in failed. Check your email and password.':error.message);(el('remote-password') as HTMLInputElement).value='';const clean=new URL(location.href);clean.hash='';if(signup){clean.search='?openplay=1&setup=1';}history.replaceState(null,'',clean);await enter();})().catch(e=>status(e.message)).finally(()=>{button.disabled=false;});};
(el('remote-name-form') as HTMLFormElement).onsubmit=e=>{e.preventDefault();const name=(el('remote-existing-name') as HTMLInputElement).value.trim().replace(/\s+/g,' ');if(!name||name.length>32){status('Enter a player name of 1–32 characters.');return;}const button=el('remote-name-form').querySelector('button')!;button.disabled=true;void(async()=>{const {error}=await authClient()!.auth.updateUser({data:{player_name:name}});if(error)throw error;await enter();})().catch(e=>status(e.message)).finally(()=>{button.disabled=false;});};
async function signOutAccount(){
 await disableDevicePush();const {error}=await authClient()!.auth.signOut({scope:'local'});if(error)throw error;
 showOpenLobby();
 status('Signed out on this device.');
}
(el('remote-reset-form') as HTMLFormElement).onsubmit=e=>{e.preventDefault();const input=el('remote-new-password') as HTMLInputElement,button=el('remote-reset-form').querySelector('button')!;button.disabled=true;status('Saving your password…');void(async()=>{
 const {error}=await authClient()!.auth.updateUser({password:input.value});if(error)throw error;input.value='';browserSessionStorage.removeItem('pickle-password-reset');el('remote-password-reset').hidden=true;await enter();status('Password updated. Use your new password on either device.');
 })().catch(e=>status((e as Error).message)).finally(()=>{button.disabled=false;});};
try{await enter();}catch(e){
 if(e instanceof RemoteError&&e.status===401){
  await authClient()?.auth.signOut({scope:'local'});showOpenLobby();status('');
 }else status((e as Error).message);
}
// Keep the initial cover until the first court frame, but never obscure login or errors.
if(!display||renderFailed)document.getElementById('match-loading')?.remove();
