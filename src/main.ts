import {loadScoringPreference,saveScoringPreference} from './scoring-preference';
import {loadFlightGuide,saveFlightGuide} from './flight-guide-preference';
import {showGameXp} from './account-xp';
import {quickSolo} from './quick-solo';
import {authClient} from './auth-session';
import {communityPlayers} from './community-players';
import {TeamPicker} from './multiplayer/team-picker';
import {focusView,showViewDialog} from './view-focus';
import {parseSoloLaunch} from './solo-launch';
import {serveDotCount,updateServeIndicator} from './serve-indicator';
import {closeGameSurface} from './game-surface';
import {hudButtonIcon} from './hud-button';
import {TrashTalkControl} from './multiplayer/trash-talk-control';
import {LocalReactions} from './local-reactions';
import {sounds,installSoundSetting} from './sound';
import {RallySounds} from './game-sounds';
const rallySounds=new RallySounds();
import type {ScoringMode} from './engine/scoring';
import {teamLabel} from './engine/controllers';
import {OpenPlayStore} from './persistence/open-play-store';
import {openPlayerDetails,playerDetailsOpen} from './player-details';
import {MatchSetup} from './match-setup';
import {randomLineup} from './random-lineup';
import {describePointResult} from './point-result';
import {TargetPicker} from './target-picker';
import {LOOKS} from './player-looks';
import {newPlayer,type DesignedPlayer} from './player-design';
import {AvatarThumbnails} from './avatar-preview';
import {localRecognition} from './local-voice';
import {VoiceInput,browserRecognition,voiceCommand,voiceContactReady} from './voice';
import {PlayerCreator} from './player-creator';
import {createYourPlayer} from './multiplayer/friend-flow';
import {addPlayerToSignedInAccount,CloudPlayerSync,PENDING_ACCOUNT_PLAYER_KEY,type CloudAccountState} from './cloud-players';
import {installAccountControls} from './account-panel';
import {summarizeSkills} from './player-skill-summary';
import {PATTERNS} from './engine/patterns';
import {PERSONALITIES} from './engine/opponent-brain';
import {PLAYER_PROFILES,ARCHETYPES} from './engine/player-profiles';
import {Match} from './match';
import {SHOT_FAMILIES} from './engine/shot-families';
import type {PlayerId,ShotType} from './engine/model';
import {SHOT_INTENT_SCHEMA,targetLabel} from './engine/shot-intent';
import './style.css';
import './gameplay-hud.css';
import './settings.css';
import {CourtScene} from './scene';
import {preloadAthletes} from './athlete';
import {browserSessionStorage,browserStorage} from './browser-storage';
const app=document.querySelector<HTMLDivElement>('#app')!;
const rosterRoute=new URLSearchParams(location.search);
const directRoster=rosterRoute.get('roster')==='1';
const directGame=rosterRoute.has('game')||rosterRoute.get('newgame')==='1';
let onStartScreen=true;
document.body.dataset.screen='start';
const startScreen=document.createElement('main');startScreen.id='start-screen';startScreen.setAttribute('aria-labelledby','start-title');
startScreen.innerHTML=`<h1 id="start-title" class="start-accessible-title">PickleBash</h1><div class="start-stage"><img class="start-background" src="/images/start/daylight-court.png" alt="" fetchpriority="high"><img class="start-logo" src="/images/start/picklebash-logo.png" alt="" fetchpriority="high"><nav class="start-actions" aria-label="Main menu"><button id="start-multiplayer" aria-label="Play With Friends!"><span>Play With Friends!</span><span aria-hidden="true">↗</span></button><button id="start-quick-solo" type="button"><span>Quick Solo Match</span><span aria-hidden="true">↗</span></button><button id="start-create-player" type="button"><span>Create Your Player</span><span aria-hidden="true">↗</span></button></nav><p class="start-loading" role="status">Getting the court ready…</p></div>`;
startScreen.hidden=directRoster||directGame;
document.body.append(startScreen);
const rosterLoading=document.createElement('div');
rosterLoading.className='roster-route-loading';rosterLoading.hidden=!directRoster&&!directGame;
rosterLoading.setAttribute('role','status');rosterLoading.textContent=directGame?'Getting your game ready…':'Loading your roster…';
document.body.append(rosterLoading);


app.innerHTML=`
<header class="header"><a class="brand" href="/" aria-label="Pickle RPG home"><span class="brand-ball">⠿</span> PICKLE<span>RPG</span></a><button id="back-to-lobby" class="header-lobby" type="button" aria-label="Open match lobby"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20v-7l8-7 8 7v7"/><path d="M8 20v-5h8v5M8 8V4h3v2"/></svg><span>Lobby</span></button><button id="open-settings" class="header-icon" aria-label="Settings" title="Settings" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.2 3-.6 2.2-1.5.9L4.9 6 2.8 9.6l1.6 1.6v1.7l-1.6 1.6 2.1 3.6 2.2-.2 1.5.9.6 2.2h4.2l.6-2.2 1.5-.9 2.2.2 2.1-3.6-1.6-1.6v-1.7l1.6-1.6L17.7 6l-2.2.1-1.5-.9-.6-2.2Z"/><circle cx="11.3" cy="12" r="3"/></svg></button></header>
<main><section class="play-section">
<div class="court-wrap"><div id="court"></div><div class="court-top"><div class="score" aria-label="Match score"><span id="solo-score-rules" class="solo-score-rules" hidden></span><div class="score-row score-row-home"><span>YOU &amp; FINN</span><b id="score-home">0</b></div><div class="score-row score-row-away"><span>JULES &amp; RIO</span><b id="score-away">0</b></div></div></div><div id="court-result" class="court-result" role="status" aria-live="assertive" hidden><strong id="court-result-title"></strong><div class="result-actions"><button id="open-replay" type="button" aria-controls="replay-overlay">▶ Replay</button><button id="next-point" type="button">Next point ↗</button></div><div id="point-countdown" aria-live="off"></div></div><div class="court-bottom"><span>20 × 44 FT <span class="small-dot">·</span> REGULATION COURT</span><span class="team-key"><i></i> YOUR TEAM <i></i> OPPONENTS</span></div></div>


<div class="rally-strip"><div class="eyebrow">THE PATTERN <span>01 / PRESSURE THE MIDDLE</span></div><ol id="timeline">${['Serve','Deep return','Drive middle','High block','Overhead Smash'].map((s,i)=>`<li data-step="${i}"><span class="step-number">${i+1}</span><span>${s}</span></li>`).join('')}</ol></div>
</section><aside><button id="back-to-play" class="back-to-play">← Back to play</button><div class="aside-heading"><span class="eyebrow">PATTERN 01</span><span class="difficulty">INTERMEDIATE +</span></div><h2>Pressure.<br>Pop-up.<br><em>Put-away.</em></h2><p class="pattern-description">Create a weak ball through the middle. Recognize your chance to finish.</p><div class="aside-divider"></div><div id="decision" aria-live="polite"></div><div class="coach"><span class="coach-icon">✳</span><div><div class="eyebrow">COURT SENSE</div><p id="cue"></p></div></div><div class="aside-foot"><span class="script-dot"></span> Scripted opponents <span>·</span> Automatic positioning</div><section id="match-panel" hidden></section></aside></main><footer><span>READ THE COURT. MAKE THE CALL.</span><span><kbd>Space</kbd> play shot / pause <kbd>R</kbd> restart</span></footer><dialog id="game-settings" aria-labelledby="settings-title"><div class="settings-heading"><div><h2 id="settings-title">Game settings</h2><p id="local-rules"></p></div><button id="close-settings" aria-label="Close settings">✕</button></div><section class="settings-lineup" aria-labelledby="settings-lineup-title"><h3 id="settings-lineup-title">Current Players</h3><div id="settings-player-slots"></div></section><label class="settings-toggle" for="guides"><span>Flight guide<small>Show the ball path.</small></span><span class="settings-switch-control"><strong id="guides-state">On</strong><input id="guides" type="checkbox" role="switch" checked></span></label><label class="settings-toggle" for="show-player-names"><span>Player names<small>Show names above players.</small></span><span class="settings-switch-control"><strong id="show-player-names-state">On</strong><input id="show-player-names" type="checkbox" role="switch" checked></span></label><label class="settings-toggle" for="result-timer"><span>Result window timer<small>Automatically continue after 10 seconds at normal speed.</small></span><span class="settings-switch-control"><strong id="result-timer-state">On</strong><input id="result-timer" type="checkbox" role="switch" checked></span></label><section class="settings-account" aria-labelledby="settings-account-title"><div class="settings-account-heading"><h3 id="settings-account-title">Account</h3><span id="account-badge">Connecting…</span></div><p id="account-copy">Connecting your cloud saves…</p><form id="account-form" novalidate><label for="account-email">Email</label><input id="account-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required><div class="settings-account-actions"><button id="protect-progress" type="submit">Protect progress</button><button id="account-sign-in" type="button">Sign in instead</button></div></form><p id="account-status" role="status" aria-live="polite"></p></section></dialog>`;
document.querySelector('#game-settings .settings-lineup')!.insertAdjacentHTML('afterend','<button id="restart" class="settings-restart">Restart current game <span aria-hidden="true">↻</span></button><label class="settings-toggle" for="partner-autonomy"><span>Partner auto-play<small>Let your partner choose their own shots when the ball comes to them.</small></span><span class="settings-switch-control"><strong id="partner-autonomy-state">Off</strong><input id="partner-autonomy" type="checkbox" role="switch"></span></label>');
await preloadAthletes();
const match=new Match();match.partnerAutonomy=true;match.randomizeSeedOnReset=true;let scene:CourtScene;
try{scene=new CourtScene(document.querySelector('#court')!,id=>openPlayerDrawer(id))}catch(error){document.querySelector('#court')!.innerHTML='<div class="webgl-error"><h2>3D rendering is unavailable</h2><p>Enable hardware acceleration in your browser, then reload to play.</p></div>';throw error}
function applyCourtLocation(court:'forest'|'venice'|'arizona'){
 scene.setLocation(court);document.body.dataset.location=court;
 browserStorage.setItem('picklebash-location-v1',court);
}
let savedCourt:'forest'|'venice'|'arizona'='forest';const savedLocation=browserStorage.getItem('picklebash-location-v1');if(savedLocation==='venice'||savedLocation==='arizona')savedCourt=savedLocation;
applyCourtLocation(savedCourt);
const byId=(id:string)=>document.getElementById(id)!;
 const gamesLink=document.createElement('a');gamesLink.className='open-play-games-link';gamesLink.href='/?openplay=1';gamesLink.onclick=event=>{event.preventDefault();closeGameSurface();};gamesLink.setAttribute('aria-label','Close game');gamesLink.title='Close game';gamesLink.innerHTML=hudButtonIcon('close');document.querySelector('.court-wrap')!.append(gamesLink);
 const turnBanner=document.createElement('p');turnBanner.id='local-turn-banner';turnBanner.setAttribute('role','status');turnBanner.hidden=true;document.querySelector('.court-wrap')!.append(turnBanner);
const speed=1;let guides=loadFlightGuide('solo'),showPlayerNames=true,resultTimer=true,cameraDistance=50,lastUI='';
const voicePanel=document.createElement('section');voicePanel.className='voice-controls';
voicePanel.innerHTML=`<div class="voice-actions"><span id="voice-mic-dock" hidden><button id="voice-speak" type="button" aria-label="Speak a shot" title="Speak a shot" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg></button></span><label><input id="voice-handsfree" type="checkbox"> Hands-free</label></div><p id="voice-status" role="status"></p><div id="voice-recovery" hidden><label>Game address <input id="voice-address" readonly aria-label="Game address"></label><button id="voice-copy-address" type="button">Copy game address</button><span id="voice-copy-status" role="status"></span></div><p id="voice-partner-status"></p>`;
document.querySelector('.court-wrap')!.insertAdjacentElement('afterend',voicePanel);
const voiceSpeak=byId('voice-speak') as HTMLButtonElement;
const voiceHandsFreeInput=byId('voice-handsfree') as HTMLInputElement,voiceHandsFreeLabel=voiceHandsFreeInput.parentElement!;
voiceHandsFreeLabel.className='voice-handsfree-toggle';
let wasListening=false;
const unlockChime=()=>sounds.unlock();
const listeningChime=()=>sounds.play('listen');
const voiceStatusText=byId('voice-status'),voiceFeedback=document.createElement('div'),voiceMeter=document.createElement('meter'),voiceThinking=document.createElement('span');
voiceFeedback.className='voice-feedback';
voiceMeter.min=0;voiceMeter.max=1;voiceMeter.value=0;voiceMeter.hidden=true;voiceMeter.setAttribute('aria-label','Microphone input level');
voiceThinking.className='voice-thinking';voiceThinking.hidden=true;voiceThinking.setAttribute('role','status');voiceThinking.setAttribute('aria-label','Thinking');voiceThinking.innerHTML='<i></i><i></i><i></i>';
voiceStatusText.before(voiceFeedback);voiceFeedback.append(voiceStatusText,voiceMeter,voiceThinking);
let voiceShotText='',voiceSubmittedShot:Match['shot']|null=null;
let voiceHandsFree=false,voiceAttempt:string|null=null,voiceContextKey='',voiceEngine=match.engine;
const voiceToken=()=>`${match.point}:${match.variation}:${match.state.shotIndex}:${match.state.phase}:${match.state.currentHitter}`;
const setVoiceFocus=(enabled:boolean)=>{if(document.body.classList.contains('voice-focus')===enabled)return;document.body.classList.toggle('voice-focus',enabled);window.dispatchEvent(new Event('resize'))};
const voiceStatus=(message:string)=>{const listening=voice.phase==='listening';if(listening&&!wasListening)listeningChime();wasListening=listening;byId('voice-recovery').hidden=!['network','service-not-allowed'].includes(voice.failure??'');if(voice.failure){voiceHandsFree=false;voiceHandsFreeInput.checked=false}voiceStatusText.textContent=voice.active?(voice.phase==='listening'?'Listening…':''):message;voiceFeedback.hidden=!voiceStatusText.textContent;const label=voice.phase==='listening'?'Finish recording':voice.active?'Cancel voice':'Speak a shot';voiceSpeak.setAttribute('aria-label',label);voiceSpeak.title=label;voiceSpeak.setAttribute('aria-pressed',String(voice.active))};
const localFactory=localRecognition(),browserFactory=browserRecognition();
const voiceFactory=localFactory??browserFactory;
const voice=new VoiceInput(voiceFactory,()=>({engine:match.engine,key:voiceToken(),target:'jules'}),async(text,context)=>{
 const captured=context as {engine:Match['engine'];key:string;target:'jules'|'rio'};
 if(settingsDialog.open||creator.dialog.open||match.replayIndex!==null||captured.engine!==match.engine||captured.key!==voiceToken()){voiceStatus('The contact changed. Say your command again.');return}
 try{
  const command=voiceCommand(text,captured.target);voiceStatus('');
  if(command.kind==='partner'){match.instructPartner(command.call);byId('voice-partner-status').textContent=match.partnerStatus}
  else if(command.kind==='control'){
   if(command.action==='next'){if(match.state.phase!=='complete')throw new Error('Finish this point before starting the next.');match.scoring.winner?match.reset():match.nextPoint()}
   if(command.action==='pause')match.state.paused=true;
   if(command.action==='resume')match.state.paused=false;
   if(command.action==='stop'){voiceHandsFree=false;voiceHandsFreeInput.checked=false}
   if(command.action==='menus')setVoiceFocus(false);
   if(command.action==='focus')setVoiceFocus(true);
  }else{
   if(match.customBusy)throw new Error('Still interpreting your last shot.');
   if(match.state.paused&&!match.receptionDecision)throw new Error('Say “resume” before calling your shot.');
   voiceShotText=command.text;match.customDraft=command.text;lastUI='';updateUI();
   if(match.receptionDecision)await match.queueReceptionCommand(command.text,'voice');else await match.submitCommand(command.text,'voice');
   if(match.state.phase==='flight')voiceSubmittedShot=match.shot;
   voiceStatus('');
  }
 }catch(error){voiceStatus((error as Error).message)}
 lastUI='';updateUI();voiceAttempt=null;
},voiceStatus,level=>{voiceMeter.value=level},(text,context)=>{
 const captured=context as {engine:Match['engine'];key:string};
 if(captured.engine!==match.engine||captured.key!==voiceToken())return;
 match.customDraft=text;
 const input=document.getElementById('custom-command') as HTMLInputElement|null;if(input)input.value=text;
});
(byId('voice-address') as HTMLInputElement).value=window.location.href;
byId('voice-copy-address').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(window.location.href);byId('voice-copy-status').textContent=' Copied. Paste into Chrome’s address bar.'}catch{(byId('voice-address') as HTMLInputElement).select();byId('voice-copy-status').textContent=' Select and copy the address above.'}});
if(!voice.supported){voiceSpeak.disabled=true;voiceHandsFreeInput.disabled=true;voiceStatus('Speech recognition is unavailable in this browser. Use the custom shot box, or a browser with SpeechRecognition support.')}
voiceSpeak.addEventListener('click',()=>{unlockChime();if(voice.phase==='listening'){voice.finish();return}if(voice.active){voice.stop();voiceHandsFree=false;voiceHandsFreeInput.checked=false;voiceStatus('')}else{match.customStatus='';lastUI='';updateUI();voiceAttempt=voiceContextKey;voice.start()}});
voiceHandsFreeInput.addEventListener('change',event=>{unlockChime();voiceHandsFree=(event.target as HTMLInputElement).checked;if(voiceHandsFree){voiceAttempt=voiceContextKey;voice.start()}else{voice.stop();voiceStatus('')}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){voice.stop();voiceHandsFree=false;voiceHandsFreeInput.checked=false;setVoiceFocus(false);voiceStatus('')}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){voice.stop();voiceHandsFree=false;voiceHandsFreeInput.checked=false;voiceStatus('')}});
function syncVoice(){
 if(match.isLocalHuman){voice.stop();voicePanel.hidden=true;voiceSpeak.hidden=true;voiceHandsFreeLabel.hidden=true;return;}
 voicePanel.hidden=false;voiceSpeak.hidden=false;voiceHandsFreeLabel.hidden=false;
 voicePanel.hidden=false;
 const dock=byId('voice-mic-dock'),focused=document.body.classList.contains('voice-focus');
 const inputRow=document.querySelector('.custom-input-row');
 const micParent=!focused&&inputRow?inputRow:dock;
 if(voiceSpeak.parentElement!==micParent){if(micParent===inputRow)inputRow!.insertBefore(voiceSpeak,byId('submit-command'));else dock.append(voiceSpeak)}
 dock.hidden=!focused;
 const feedbackParent=!focused&&inputRow?inputRow.parentElement!:voicePanel;
 if(voiceFeedback.parentElement!==feedbackParent){if(feedbackParent===voicePanel)voicePanel.prepend(voiceFeedback);else feedbackParent.insertBefore(voiceFeedback,inputRow)}
 const composer=document.querySelector('.custom-composer');
 const toggleParent=!focused&&composer?composer:voicePanel;
 if(voiceHandsFreeLabel.parentElement!==toggleParent)toggleParent.append(voiceHandsFreeLabel);
 const key=voiceToken();const changed=voiceContextKey!==key||voiceEngine!==match.engine;if(voiceEngine!==match.engine)voiceAttempt=null;voiceEngine=match.engine;
 const blocked=match.playerAutonomy||settingsDialog.open||creator.dialog.open||reactions.isOpen||playerDetailsOpen()||match.replayIndex!==null||document.hidden;
 if(blocked){if(voice.active){voice.stop();voiceStatus('')}voiceHandsFree=false;voiceHandsFreeInput.checked=false}
 else if(changed&&voice.active){voice.stop();voiceStatus('')}
 voiceMeter.hidden=voice.phase!=='listening'||!localFactory;
 voiceThinking.hidden=voice.phase!=='transcribing'&&!match.customBusy;
 voiceStatusText.hidden=!voiceThinking.hidden;
 voiceFeedback.hidden=voiceMeter.hidden&&voiceThinking.hidden&&!voiceStatusText.textContent;
 voiceContextKey=key;
 if(!blocked&&voiceHandsFree&&!voice.active&&!match.customBusy&&!match.thinking&&(match.manualReceptionDecision||voiceContactReady(match.state,match.partnerAutonomy))&&voiceAttempt!==key){voiceAttempt=key;voice.start()}
}

let creator!:PlayerCreator,cloudAccountState:CloudAccountState={kind:'connecting'};
const cloudPlayers=new CloudPlayerSync(state=>creator.setCloudStatus(state),state=>{cloudAccountState=state;creator?.setCreatorName(state.playerName);creator?.setTeamName(state.teamName);renderAccount()});
const accountControls=installAccountControls(cloudPlayers,()=>creator.playerLibrary.players);

creator=new PlayerCreator(player=>{
 if(match.isLocalHuman)return;
 match.practice=null;match.setPlayerDesign(player);scene.setPlayerDesign(player);
 syncRosterNames();
 if(onStartScreen){location.assign('/?openplay=1&setup=1');return;}
 lastUI='';updateUI();
},id=>{if(match.isLocalHuman)return;for(const slot of courtSlots)if(match.getPlayerDesign(slot)?.id===id){match.substitutePlayer(slot,null);scene.substitutePlayer(slot,null)}syncRosterNames()},(library,change)=>cloudPlayers.save(library,change));
// Shot selection lives on the court through the targeting wheel.
const savedPlayer=creator.activePlayer;
creator.loadHistory=async()=>{await accountControls.retry();return (await cloudPlayers.history()).matches};
if(savedPlayer){match.setPlayerDesign(savedPlayer);scene.setPlayerDesign(savedPlayer);document.querySelector('.score-row-home > span')!.textContent=`${savedPlayer.name} & FINN`}
creator.saveTeamName=name=>cloudPlayers.saveTeamName(name);
const cloudReady=cloudPlayers.connect(creator.playerLibrary).then(library=>{creator.applyCloudLibrary(library);void accountControls.retry().catch(()=>{})});
const pendingPlayerKey=PENDING_ACCOUNT_PLAYER_KEY;
let playerOnboarding=false;
creator.beforeSave=async player=>{
 await cloudReady;
 if(cloudAccountState.kind==='authenticated')return true;
 browserSessionStorage.setItem(pendingPlayerKey,JSON.stringify(player));
 let switchingAccount=false;
 const created=await createYourPlayer(async()=>{}, {playerName:player.name,onSignInSelected:()=>{switchingAccount=true},onSignIn:async()=>{
  switchingAccount=true;const pending=browserSessionStorage.getItem(pendingPlayerKey);if(!pending)throw new Error('Your new player could not be found. Return to the designer and save again.');
  const destination=new URL('/?openplay=1&importplayer=1',location.origin);history.replaceState(null,'',destination);
  await addPlayerToSignedInAccount(JSON.parse(pending));browserSessionStorage.removeItem(pendingPlayerKey);location.assign('/?openplay=1');
 }});
 if(created)browserSessionStorage.removeItem(pendingPlayerKey);
 else if(!switchingAccount)browserSessionStorage.removeItem(pendingPlayerKey);
 return created;
};
creator.afterSave=()=>{
 if(!playerOnboarding)return false;
 playerOnboarding=false;browserSessionStorage.removeItem(pendingPlayerKey);location.assign('/?openplay=1&setup=1');return true;
};
creator.dialog.addEventListener('close',()=>{creator.activateOnSave=false;if(playerOnboarding){playerOnboarding=false;browserSessionStorage.removeItem(pendingPlayerKey)}});
// Keep navigation and player management in Settings; the court gets only the HUD.
const settingsActions=document.createElement('section');settingsActions.className='settings-game-actions';
settingsActions.setAttribute('aria-label','Game actions');
settingsActions.innerHTML='<button type="button" class="settings-restart" id="open-player-design" aria-haspopup="dialog">Player Designer</button>';
byId('game-settings').querySelector('.settings-heading')!.after(settingsActions);
settingsActions.append(byId('restart'),byId('back-to-lobby'));
byId('back-to-lobby').className='settings-restart';byId('back-to-lobby').textContent='Your games';
const courtHost=document.querySelector('.court-wrap')!;
byId('open-settings').className='gameplay-settings';
byId('open-settings').innerHTML=hudButtonIcon('settings');
courtHost.append(byId('open-settings'));
for(const corner of ['top-left']){
 const decor=document.createElement('img');decor.className=`gameplay-corner gameplay-corner-${corner}`;
 decor.src=`/assets/picklebash-gameplay-ui/corners/picklebash-corner-${corner}-overlay.png`;
 decor.alt='';decor.draggable=false;decor.setAttribute('aria-hidden','true');courtHost.append(decor);
}
for(const {slot,archetype,player} of randomLineup()){match.lineup[slot]=archetype;match.substitutePlayer(slot,player);scene.substitutePlayer(slot,player)}
match.reset();syncRosterNames();
byId('open-player-design').addEventListener('click',()=>creator.open());
if(new URLSearchParams(location.search).get('design')==='1')creator.open();
creator.dialog.addEventListener('close',()=>focusView());
const escapeText=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

let activePanel='play';
function showPanel(panel:string){activePanel=panel;document.body.dataset.panel=panel;document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===panel)))}
document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b=>b.addEventListener('click',()=>{showPanel(b.dataset.panel!);(byId('game-settings') as HTMLDialogElement).close();focusView()}));
byId('back-to-play').addEventListener('click',()=>{showPanel('play');focusView()});
document.body.classList.add('match-mode');byId('match-panel').hidden=false;byId('restart').title='Restart the game (R)';byId('restart').setAttribute('aria-label','Restart Game');showPanel('play');


function submit(){if(targetPicker.active)return;if(match.isLocalHuman&&match.receptionDecision){const choice=match.receptionOptions[0];if(choice)match.chooseReceptionIntent(choice);return;}if(match.humanContact){match.submitIntent(match.availableIntents[0]);updateUI()}}
function reset(){if(match.isLocalHuman)return;voice.stop();voiceAttempt=null;match.reset();lastUI='';updateUI()}
function pause(){if(match.receptionDecision)return;if(match.state.phase==='flight'){match.state.paused=!match.state.paused;lastUI='';updateUI()}}
byId('restart').addEventListener('click',()=>{reset();closeSettings()});
const settingsDialog=byId('game-settings') as HTMLDialogElement;
installSoundSetting(settingsDialog,{checkbox:true});
const endedGames=new WeakSet<object>();
const endGameButton=document.createElement('button');endGameButton.type='button';endGameButton.className='settings-restart';endGameButton.textContent='End game';endGameButton.id='end-current-game';settingsDialog.append(endGameButton);
endGameButton.addEventListener('click',()=>{
 if(!match.scoring.winner){try{localStore?.end(match.matchId)}catch(error){reportSaveError(error);return}endedGames.add(match.scoring);}
 voice.stop();match.state.paused=true;match.stopReplay();
 if(settingsCloseTimer)window.clearTimeout(settingsCloseTimer);
 settingsDialog.close();settingsDialog.classList.remove('is-closing');syncGameEnd();
});
const replayOverlay=document.createElement('section');replayOverlay.id='replay-overlay';replayOverlay.hidden=true;replayOverlay.setAttribute('aria-label','Point replay');
replayOverlay.innerHTML='<div class="replay-player"><button id="replay-toggle" class="replay-toggle" aria-label="Pause point replay">Ⅱ</button><div class="replay-track"><div><strong>Replay</strong><output id="replay-time">0:00 / 0:00</output></div><input id="replay-position" type="range" min="0" max="0" value="0" step="0.01" aria-label="Replay timeline"></div><button id="close-replay" aria-label="Exit replay" title="Exit replay">✕</button></div>';
document.querySelector('.court-wrap')!.append(replayOverlay);
function closeReplay(){replayOverlay.hidden=true;match.stopReplay();lastUI='';updateUI();byId('court-result').hidden=!!match.scoring.winner;if(match.scoring.winner)syncGameEnd();else focusView()}
byId('close-replay').addEventListener('click',closeReplay);
byId('replay-toggle').addEventListener('click',()=>{match.replayPlaying?match.pauseReplay():match.resumeReplay()});
byId('replay-position').addEventListener('input',event=>{match.scrubReplayTime(Number((event.target as HTMLInputElement).value))});
replayOverlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeReplay()}else if(event.code==='Space'&&event.target instanceof HTMLInputElement){event.preventDefault();match.replayPlaying?match.pauseReplay():match.resumeReplay()}});

let profilePortraits:AvatarThumbnails|undefined;
let settingsCloseTimer:number|undefined;
function openPlayerDrawer(id:PlayerId){
 const player=match.state.players.find(candidate=>candidate.id===id);if(!player)return;
 targetPicker.clear();
 const design=match.getPlayerDesign(id);
 openPlayerDetails({... (design??newPlayer()),name:playerNames()[id],appearance:scene.getPlayerAppearance(id),skills:player.skills,handedness:player.handedness},player.team==='home'?'Your team':'Opponent','',document.activeElement instanceof HTMLElement?document.activeElement:undefined);
}
const courtSlots:PlayerId[]=['you','partner','opponent-left','opponent-right'];
const slotLabels:Record<PlayerId,string>={you:'You',partner:'Partner','opponent-left':'Left-side opponent','opponent-right':'Right-side opponent'};
function playerNames():Record<PlayerId,string>{return {you:match.getPlayerDesign('you')?.name??'You',partner:match.getPlayerDesign('partner')?.name??'Finn','opponent-left':match.getPlayerDesign('opponent-left')?.name??'Jules','opponent-right':match.getPlayerDesign('opponent-right')?.name??'Rio'}}
function syncRosterNames(){const names=playerNames();document.querySelector('.score-row-home > span')!.textContent=`${names.you} & ${names.partner}`;document.querySelector('.score-row-away > span')!.textContent=`${names['opponent-left']} & ${names['opponent-right']}`}
const selectableArchetypes=['banger','dinker','lobber','allCourt'] as const;
function playerArchetype(player:DesignedPlayer){return selectableArchetypes.reduce((best,key)=>{const distance=Object.keys(player.skills).reduce((sum,skill)=>{const delta=player.skills[skill as keyof typeof player.skills]-ARCHETYPES[key].skills[skill as keyof typeof player.skills];return sum+delta*delta},0);return distance<best.distance?{key,distance}:best},{key:'allCourt' as typeof selectableArchetypes[number],distance:Infinity}).key}
function playerOptionLabel(player:DesignedPlayer,archetype:keyof typeof ARCHETYPES=playerArchetype(player)){return `${player.name} • ${ARCHETYPES[archetype].name} • ${summarizeSkills(player.skills).estimatedDupr.toFixed(2)}`}
function renderSettingsPlayers(){
 const host=byId('settings-player-slots');host.replaceChildren();
 const saved=creator.savedPlayers;
 const presets:DesignedPlayer[]=LOOKS.map((look,index)=>({...newPlayer(`preset-${index}`),name:look.name,appearance:{...look.appearance},skills:{...look.skills}}));
 const names=playerNames();
 for(const id of courtSlots){
  const row=document.createElement('div');row.className='settings-player-slot';
  const portrait=document.createElement('img');portrait.alt=`${names[id]} portrait`;
  try{profilePortraits??=new AvatarThumbnails(512);portrait.src=profilePortraits.get(scene.getPlayerAppearance(id),'profile')}catch{portrait.hidden=true}
  const controls=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select');
  label.htmlFor=`substitute-${id}`;label.textContent=slotLabels[id];select.id=label.htmlFor;select.setAttribute('aria-label',`Player for ${slotLabels[id]}`);select.disabled=match.isLocalHuman;
  const current=match.getPlayerDesign(id),choices=new Map<string,DesignedPlayer>();
  if(id==='you')select.add(new Option('Default · You',''));
  for(const player of saved){choices.set(player.id,player);select.add(new Option(playerOptionLabel(player),player.id))}
  const startingGroup=document.createElement('optgroup');startingGroup.label='Starting lineup';
  for(const preset of presets){const player=current?.name===preset.name&&!saved.some(savedPlayer=>savedPlayer.id===current.id)?current:preset;const archetype=player===current&&match.lineup[id]?match.lineup[id]!:playerArchetype(player);choices.set(player.id,player);startingGroup.append(new Option(playerOptionLabel(player,archetype),player.id))}
  select.append(startingGroup);
  select.value=current?.id??'';
  select.addEventListener('change',()=>{
   const selected=choices.get(select.value)??null;
   if((match.getPlayerDesign(id)?.id??'')===(selected?.id??''))return;
   match.lineup[id]=selected?playerArchetype(selected):undefined;match.substitutePlayer(id,selected);scene.substitutePlayer(id,selected);
   const updatedNames=playerNames();syncRosterNames();
   lastUI='';updateUI();
   portrait.alt=`${updatedNames[id]} portrait`;
   try{portrait.src=profilePortraits!.get(scene.getPlayerAppearance(id),'profile');portrait.hidden=false}catch{portrait.hidden=true}
  });
  if(id==='you'||id==='partner')controls.append(label);
  controls.append(select);row.append(portrait,controls);host.append(row);
 }
}
function renderAccount(){
 const signOut=document.getElementById('account-sign-out'),resend=document.getElementById('account-resend');
 if(signOut)signOut.hidden=cloudAccountState.kind!=='authenticated';if(resend)resend.hidden=cloudAccountState.kind!=='pending';
 const badge=byId('account-badge'),copy=byId('account-copy'),form=byId('account-form') as HTMLFormElement,status=byId('account-status');
 const email=(byId('account-email') as HTMLInputElement),protect=byId('protect-progress') as HTMLButtonElement,signIn=byId('account-sign-in') as HTMLButtonElement;
 form.hidden=cloudAccountState.kind==='authenticated'||cloudAccountState.kind==='unavailable';protect.disabled=signIn.disabled=cloudAccountState.kind==='connecting';
 if(cloudAccountState.email&&!email.value)email.value=cloudAccountState.email;
 if(cloudAccountState.kind==='authenticated'){badge.textContent='Protected';copy.textContent=`Signed in as ${cloudAccountState.email??'your account'}. Your players are available across devices.`;status.textContent='';return}
 if(cloudAccountState.kind==='pending'){badge.textContent='Check email';copy.textContent='Open the link we sent to finish protecting or restoring your progress.';status.textContent=cloudAccountState.email?`Email sent to ${cloudAccountState.email}.`:'';return}
 if(cloudAccountState.kind==='unavailable'){badge.textContent='Local only';copy.textContent='Cloud accounts are unavailable. Your players are still saved on this device.';status.textContent='';return}
 if(cloudAccountState.kind==='connecting'){badge.textContent='Connecting…';copy.textContent='Connecting your cloud saves…';status.textContent='';return}
 badge.textContent='Guest';copy.textContent='Your players are saved in the cloud on this device. Add an email so you can recover them anywhere.';status.textContent='';
}
let lastAccountMode:'protect'|'sign-in'='protect',resendAfter=0;
document.getElementById('account-resend')!.addEventListener('click',async()=>{
 const status=byId('account-status');if(Date.now()<resendAfter){status.textContent='Please wait a minute before requesting another link.';return}
 try{await cloudPlayers.resendLink(cloudAccountState.email??(byId('account-email') as HTMLInputElement).value,lastAccountMode);resendAfter=Date.now()+60000;status.textContent='A new link has been requested. Check your inbox and spam folder.'}catch(error){status.textContent=(error as Error).message}
});
async function submitAccount(mode:'protect'|'sign-in'){
 const input=byId('account-email') as HTMLInputElement,protect=byId('protect-progress') as HTMLButtonElement,signIn=byId('account-sign-in') as HTMLButtonElement,status=byId('account-status');
 if(!input.reportValidity())return;if(Date.now()<resendAfter){status.textContent='Please wait a minute before requesting another link.';return}lastAccountMode=mode;resendAfter=Date.now()+60000;protect.disabled=signIn.disabled=true;status.textContent='Sending a secure link…';
 try{if(mode==='protect')await cloudPlayers.protectProgress(input.value);else await cloudPlayers.sendSignInLink(input.value)}catch(error){status.textContent=(error as Error).message;protect.disabled=signIn.disabled=false}
}
(byId('account-form') as HTMLFormElement).addEventListener('submit',event=>{event.preventDefault();void submitAccount('protect')});
byId('account-sign-in').addEventListener('click',()=>void submitAccount('sign-in'));
function openSettings(){renderSettingsPlayers();renderAccount();const rules=match.scoring.rules;byId('local-rules').textContent=`${rules.scoring==='rally-doubles'?'Rally':'Side-out'} scoring · First to ${rules.target}`;if(settingsCloseTimer)window.clearTimeout(settingsCloseTimer);settingsDialog.classList.remove('is-closing');if(!settingsDialog.open)showViewDialog(settingsDialog)}
function closeSettings(){if(!settingsDialog.open||settingsDialog.classList.contains('is-closing'))return;settingsDialog.classList.add('is-closing');const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;settingsCloseTimer=window.setTimeout(()=>{settingsDialog.close();settingsDialog.classList.remove('is-closing');settingsCloseTimer=undefined},delay)}
byId('open-settings').addEventListener('click',openSettings);
byId('close-settings').addEventListener('click',closeSettings);
settingsDialog.addEventListener('click',event=>{if(event.target===settingsDialog)closeSettings()});
settingsDialog.addEventListener('cancel',event=>{event.preventDefault();closeSettings()});
let scoringPreference:ScoringMode='rally-doubles';
try{const saved=JSON.parse(browserStorage.getItem('pickle-rpg-controls-v1')??'null');if(saved&&typeof saved==='object'){if(saved.scoringPreference==='side-out-doubles'||saved.scoringPreference==='rally-doubles')scoringPreference=saved.scoringPreference;if(typeof saved.showPlayerNames==='boolean')showPlayerNames=saved.showPlayerNames;if(typeof saved.resultTimer==='boolean')resultTimer=saved.resultTimer;if(typeof saved.partnerAutonomy==='boolean')match.partnerAutonomy=saved.partnerAutonomy;if(typeof saved.cameraDistance==='number'&&Number.isFinite(saved.cameraDistance)&&saved.cameraDistance>=0&&saved.cameraDistance<=100)cameraDistance=saved.cameraDistance}}catch{/* Invalid saved settings leave defaults in place. */}
document.querySelector('label[for="partner-autonomy"]')!.insertAdjacentHTML('afterend','<label class="settings-toggle" for="scoring-preference"><span>Scoring rules<small>Saved for new games. Rally awards every rally; side-out awards only the serving team.</small><small id="active-scoring-rules"></small></span><select id="scoring-preference" aria-label="Scoring rules for new games"><option value="rally-doubles">Rally</option><option value="side-out-doubles">Side-out</option></select></label>');
function setScoringPreference(value:ScoringMode){scoringPreference=value;match.scoringPreference=value;(byId('scoring-preference') as HTMLSelectElement).value=value;saveControls();}
match.scoringPreference=scoringPreference;(byId('scoring-preference') as HTMLSelectElement).value=scoringPreference;
byId('scoring-preference').addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;if(value==='rally-doubles'||value==='side-out-doubles')setScoringPreference(value);});
(byId('guides') as HTMLInputElement).checked=guides;byId('guides-state').textContent=guides?'On':'Off';(byId('partner-autonomy') as HTMLInputElement).checked=match.partnerAutonomy;byId('partner-autonomy-state').textContent=match.partnerAutonomy?'On':'Off';scene.setGuides(guides);
(byId('show-player-names') as HTMLInputElement).checked=showPlayerNames;byId('show-player-names-state').textContent=showPlayerNames?'On':'Off';scene.setPlayerNames(showPlayerNames);
byId('show-player-names').addEventListener('change',e=>{showPlayerNames=(e.target as HTMLInputElement).checked;byId('show-player-names-state').textContent=showPlayerNames?'On':'Off';scene.setPlayerNames(showPlayerNames);saveControls()});
(byId('result-timer') as HTMLInputElement).checked=resultTimer;byId('result-timer-state').textContent=resultTimer?'On':'Off';
byId('result-timer').addEventListener('change',e=>{resultTimer=(e.target as HTMLInputElement).checked;byId('result-timer-state').textContent=resultTimer?'On':'Off';resultElapsed=0;resultExpired=false;saveControls()});
document.querySelector('label[for="partner-autonomy"]')!.insertAdjacentHTML('beforebegin','<label class="settings-toggle" for="player-autonomy"><span>Auto-play my player · Temporary<small>For testing: choose shots and continue points automatically. Also turns on partner auto-play.</small></span><span class="settings-switch-control"><strong id="player-autonomy-state">Off</strong><input id="player-autonomy" type="checkbox" role="switch"></span></label>');
try{match.playerAutonomy=JSON.parse(browserStorage.getItem('pickle-rpg-controls-v1')??'null')?.playerAutonomy===true}catch{/* Keep manual play by default. */}
(byId('player-autonomy') as HTMLInputElement).checked=match.playerAutonomy;byId('player-autonomy-state').textContent=match.playerAutonomy?'On':'Off';
byId('player-autonomy').addEventListener('change',e=>{match.playerAutonomy=(e.target as HTMLInputElement).checked;if(match.playerAutonomy){match.partnerAutonomy=true;(byId('partner-autonomy') as HTMLInputElement).checked=true;byId('partner-autonomy-state').textContent='On';voice.stop();targetPicker.clear()}byId('player-autonomy-state').textContent=match.playerAutonomy?'On':'Off';lastUI='';saveControls();updateUI()});
function saveControls(){browserStorage.setItem('pickle-rpg-controls-v1',JSON.stringify({scoringPreference,guides,showPlayerNames,resultTimer,cameraDistance,playerAutonomy:match.playerAutonomy,partnerAutonomy:match.partnerAutonomy}))}
scene.setCamera(100-cameraDistance);
byId('guides').addEventListener('change',e=>{guides=(e.target as HTMLInputElement).checked;byId('guides-state').textContent=guides?'On':'Off';scene.setGuides(guides);saveFlightGuide(guides);saveControls()});
byId('partner-autonomy').addEventListener('change',e=>{match.partnerAutonomy=(e.target as HTMLInputElement).checked;byId('partner-autonomy-state').textContent=match.partnerAutonomy?'On':'Off';lastUI='';saveControls();updateUI()});
document.addEventListener('keydown',event=>{if(onStartScreen||settingsDialog.open||creator.dialog.open||gameEnd.open||scene.celebratingMatch)return;if(match.replayIndex!==null){if(event.key==='Escape'){event.preventDefault();closeReplay()}else if(event.code==='Space'&&!(event.target instanceof HTMLElement&&event.target.closest('button,input'))){event.preventDefault();match.replayPlaying?match.pauseReplay():match.resumeReplay()}return;}if(event.target instanceof HTMLElement&&event.target.closest('button, input, select, textarea, a'))return;if(event.code==='Space'){event.preventDefault();match.state.phase==='decision'||match.isLocalHuman&&match.receptionDecision?submit():match.state.phase==='complete'?(!match.scoring.winner?(match.nextPoint(),lastUI='',updateUI()):reset()):pause()}if(event.key.toLowerCase()==='r')reset()});
function updateUI(){updateMatchUI()}

function pointResultCopy(){
 const result=match.state.result,replayAtEnd=match.replayIndex===match.replayFrames.length-1&&!match.replayPlaying;if(match.state.phase!=='complete'||!result||match.replayIndex!==null&&!replayAtEnd)return null;
 return describePointResult(result,match.shot,id=>match.getPlayerDesign(id)?.name??({you:'You',partner:'Finn','opponent-left':'Jules','opponent-right':'Rio'}[id]));
}
function clock(seconds:number){const whole=Math.max(0,Math.round(seconds));return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`}
function analysisCards(){
 const seen=new Set<number>();
 return match.replayFrames.map((frame,index)=>{
  if(frame.phase!=='flight'||seen.has(frame.shotIndex))return '';seen.add(frame.shotIndex);
  const shot=match.replayShots[index];if(!shot)return '';
  const actor=match.getPlayerDesign(shot.actor)?.name??({you:'You',partner:'Finn','opponent-left':'Jules','opponent-right':'Rio'}[shot.actor]);
  const elapsed=(frame.simulationTime-(match.replayFrames[0]?.simulationTime??0))/1.5;
  return `<button class="analysis-shot replay-event" data-shot-index="${frame.shotIndex}" data-replay-frame="${index}"><header><span>${clock(elapsed)} · ${escapeText(actor)}</span><strong>${SHOT_FAMILIES[shot.intent.type].name}</strong></header><span class="replay-event-detail">${targetLabel(shot.intent.target)}</span></button>`;
 }).join('')||'<p class="analysis-empty">No shots recorded for this point.</p>';
}

function updateMatchUI(){
 const rules=match.scoring.rules;
 byId('active-scoring-rules').textContent=`Current game: ${rules.scoring==='rally-doubles'?'Rally':'Side-out'} · first to ${rules.target}${rules.winBy>1?', win by '+rules.winBy:''}`;
 const scoreRules=byId('solo-score-rules');scoreRules.textContent=`${rules.scoring==='rally-doubles'?'Rally':'Side-out'} to ${rules.target} · Win by ${rules.winBy}`;scoreRules.hidden=match.isLocalHuman||!!match.practice;scoreRules.parentElement!.classList.toggle('has-rules',!scoreRules.hidden);
 document.body.classList.toggle('local-human-mode',match.isLocalHuman);
 const team=match.decisionTeam;
 if(match.isLocalHuman&&team)scene.setViewTeam(team);else if(!match.isLocalHuman)scene.setViewTeam('home');
 const banner=byId('local-turn-banner');banner.hidden=match.replayIndex!==null||match.state.phase==='complete';
 banner.textContent=match.isLocalHuman?(team?`${teamLabel(team)} · ${match.receptionDecision?'choose timing and shot':playerNames()[match.state.currentHitter!]+', choose your shot'}`:match.state.phase==='complete'?(match.scoring.winner?'Match complete':'Point over'):'Shot in play…'):(match.manualReceptionDecision||match.humanContact?`${match.shot.intent.type==='serve'?'Your serve':'Your turn'} · Tap the court to aim`:'Shot in play…');
 if(match.selectionCommentary?.engine===match.engine&&match.selectionCommentary.index===match.state.shotIndex&&match.state.phase!=='complete'&&!match.humanContact&&!match.manualReceptionDecision)banner.textContent=match.selectionCommentary.text;
 for(const id of ['restart','open-player-design','partner-autonomy','player-autonomy','result-timer']){const el=byId(id) as HTMLInputElement|HTMLButtonElement;el.disabled=match.isLocalHuman;}
 const s=match.state,score=match.scoring,key=`match:${match.mode}:${match.point}:${s.phase}:${s.shotIndex}:${s.paused}:${match.receptionDecision}:${score.call}:${score.winner}:${match.brainStatus}:${match.thinking}:${match.practice}:${match.variation}:${match.customBusy}:${match.customStatus}:${match.replayIndex===null?'live':match.replayPlaying?'replaying':'scrubbing'}`;if(key===lastUI)return;lastUI=key;
 byId('score-home').textContent=String(score.score.home);byId('score-away').textContent=String(score.score.away);
 for(const team of ['home','away'] as const)updateServeIndicator(byId(`score-${team}`).closest<HTMLElement>('.score-row')!,serveDotCount(team,score.server,score.serverNumber,!!score.winner||match.replayIndex!==null));
 const receptionDecision=match.manualReceptionDecision,playerDecision=match.humanContact;
 const courtResult=pointResultCopy();if(courtResult)byId('court-result-title').textContent=courtResult.title;
 
 byId('match-panel').innerHTML=`<section class="match-settings"><h3>Make it your game.</h3><div class="eyebrow">${match.practice?'PATTERN PRACTICE · UNSCORED':`FREE PLAY · ${score.rules.scoring==='rally-doubles'?'RALLY':'SIDE-OUT'} SCORING`}</div><label for="practice-pattern">Practice focus</label><select id="practice-pattern"><option value="">Free play · no lesson</option>${PATTERNS.map(p=>`<option value="${p.id}" ${match.practice===p.id?'selected':''}>${p.name}</option>`).join('')}</select><button id="start-pattern">Start selected practice / game</button>${match.practice?`<p>${PATTERNS.find(p=>p.id===match.practice)!.cue} · Variation ${match.variation+1}</p>`:''}<h2>${score.score.home} : ${score.score.away}</h2>${match.practice?'<p>Mid-rally practice · opening bounces already satisfied.</p>':`<p>Serve call <strong>${score.call}</strong> · ${score.server==='you'?'You':score.server==='partner'?'Finn':score.server==='opponent-left'?'Jules':'Rio'} serving</p>`}<details><summary>Opponent brain</summary><label for="brain-mode">Decision engine</label><select id="brain-mode"><option value="local" ${match.brainMode==='local'?'selected':''}>Local adaptive</option><option value="llm" ${match.brainMode==='llm'?'selected':''}>LLM strategy · instant shots</option></select><label for="brain-personality">Personality</label><select id="brain-personality">${PERSONALITIES.map(p=>`<option ${match.personality===p?'selected':''}>${p}</option>`).join('')}</select><label for="brain-iq">Tactical intelligence</label><select id="brain-iq">${[.2,.5,.9].map(n=>`<option value="${n}" ${Math.abs(match.intelligence-n)<.11?'selected':''}>${n===.2?'Basic':n===.5?'Aware':'Adaptive'}</option>`).join('')}</select><button id="apply-brain">Apply for next opponent contact</button><p id="brain-status">${match.brainStatus}</p><p>Observed ${match.memory.summary().samples} recent team shots. Physical ratings are unchanged.</p></details><details><summary>Choose archetypes · starts a new game</summary>${Object.entries(PLAYER_PROFILES).map(([id,p])=>`<label for="profile-${id}">${p.name}</label><select id="profile-${id}" ${match.getPlayerDesign(id as PlayerId)?'disabled':''}><option value="">${match.getPlayerDesign(id as PlayerId)?'Selected player skills':'Original profile'}</option>${Object.entries(ARCHETYPES).map(([key,a])=>`<option value="${key}" ${match.lineup[id as keyof typeof PLAYER_PROFILES]===key?'selected':''}>${a.name}</option>`).join('')}</select>`).join('')}<button id="apply-lineup" class="shot-button">Start game with these profiles</button></details><p class="guided-note">${match.partnerAutonomy?'Your contacts wait for you; Finn chooses his own shots.':'Every team contact waits for your choice.'}</p><details><summary>Player skills · 0–100</summary>${Object.entries(PLAYER_PROFILES).map(([id,base])=>{const custom=match.getPlayerDesign(id as PlayerId);const p={...base,...(match.lineup[id as keyof typeof PLAYER_PROFILES]?ARCHETYPES[match.lineup[id as keyof typeof PLAYER_PROFILES]!]:{}),name:custom?escapeText(custom.name):base.name,...(custom?{skills:custom.skills,description:'Your saved Player Design skills.'}:{})};return `<h3>${p.name}</h3><p>${p.description}</p><dl class="player-skills">${Object.entries(p.skills).map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>`}).join('')}<p class="guided-note">Prototype attributes, not DUPR ratings. Shot skills affect execution; movement affects reach; hands affects fast volleys.</p></details></section>`;
 if(!match.isLocalHuman&&(playerDecision||receptionDecision)){
 byId('match-panel').insertAdjacentHTML('beforeend',`<section class="match-play custom-composer"><div class="shot-composer-heading"><span class="shot-composer-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg></span><div><h4>Call your shot</h4><p>Or describe your shot with voice.</p></div></div><label class="sr-only" for="custom-command">Call your own shot</label><p id="custom-status" role="status"></p><div id="custom-quick"></div><div class="custom-input-row"><input id="custom-command" maxlength="300" placeholder="Call your shot…" aria-label="Call your own shot"><button id="submit-command" class="custom-send" aria-label="Send custom shot" title="Send custom shot" ${match.customBusy?'disabled':''}><span aria-hidden="true">↑</span></button></div></section>`);
 byId('custom-status').textContent=match.customBusy?'':match.customStatus;
 (byId('custom-command') as HTMLInputElement).value=match.customDraft;
 const sendCustom=()=>{const text=(byId('custom-command') as HTMLInputElement).value;if(receptionDecision)void match.queueReceptionCommand(text).catch(e=>{match.customStatus=e.message;lastUI='';updateUI()});else void match.submitCommand(text).catch(e=>{match.customStatus=e.message});lastUI='';updateUI()};
 byId('custom-command').addEventListener('input',e=>match.customDraft=(e.target as HTMLInputElement).value);
 byId('custom-command').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendCustom()}});
 byId('submit-command').addEventListener('click',sendCustom);
 for(const [text,count] of [...match.customCounts].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,5)){const button=document.createElement('button');button.textContent=`${text} (${count})`;button.addEventListener('click',()=>{if(receptionDecision)void match.queueReceptionCommand(text).catch(e=>{match.customStatus=e.message;lastUI='';updateUI()});else void match.submitCommand(text).catch(e=>{match.customStatus=e.message});lastUI='';updateUI()});byId('custom-quick').append(button)}
 }
 if(!playerDecision&&s.phase==='flight'&&match.shot===voiceSubmittedShot){
  byId('match-panel').insertAdjacentHTML('beforeend','<section class="match-play custom-composer"><input id="custom-command" aria-label="Call your own shot" readonly></section>');
  (byId('custom-command') as HTMLInputElement).value=voiceShotText;
 }

 byId('match-panel').insertAdjacentHTML('beforeend',`<section class="match-insights"><h3>Your session</h3><p>Patterns you’re learning to recognize.</p><details open><summary>Pattern exposure · this session</summary>${PATTERNS.map(p=>{const rows=match.records.filter(r=>r.pattern===p.id);return `<p>${p.name}: ${rows.length} decisions · ${rows.filter(r=>r.label==='Good choice').length} recognized · ${rows.filter(r=>r.label==='Risky'||r.label==='Better target available').length} review flags</p>`}).join('')}<p>Heuristic coaching, not a definitive grade. Records remain in this session only.</p></details></section>`);
 byId('start-pattern').addEventListener('click',()=>{showPanel('play');match.startPractice((byId('practice-pattern') as HTMLSelectElement).value as typeof match.practice||null);lastUI='';updateUI()});
 byId('apply-brain').addEventListener('click',()=>{match.brainMode=(byId('brain-mode') as HTMLSelectElement).value as typeof match.brainMode;match.personality=(byId('brain-personality') as HTMLSelectElement).value as typeof match.personality;match.intelligence=Number((byId('brain-iq') as HTMLSelectElement).value);lastUI='';updateUI()});
 byId('apply-lineup').addEventListener('click',()=>{for(const id of Object.keys(PLAYER_PROFILES) as (keyof typeof PLAYER_PROFILES)[]){const value=(byId(`profile-${id}`) as HTMLSelectElement).value;match.lineup[id]=value?value as keyof typeof ARCHETYPES:undefined}match.reset();showPanel('play');lastUI='';updateUI()});

}
const gameEnd=document.createElement('dialog');gameEnd.id='game-end';gameEnd.setAttribute('aria-labelledby','game-end-title');
gameEnd.innerHTML=`<div class="game-end-card"><div class="game-end-kicker">GAME COMPLETE</div><div class="game-end-emblem" aria-hidden="true">✦</div><p class="game-end-label">THE WINNERS</p><h1 id="game-end-title"></h1><div class="game-end-score" aria-label="Final score"><div><strong id="game-end-home-score"></strong><span id="game-end-home-names"></span></div><span class="game-end-dash" aria-hidden="true">–</span><div><strong id="game-end-away-score"></strong><span id="game-end-away-names"></span></div></div><details class="game-end-stats" aria-labelledby="game-end-stats-title" hidden><summary class="game-end-stats-heading"><h2 id="game-end-stats-title">Game stats</h2><p id="game-end-stats-summary"></p></summary><div id="game-end-player-stats"></div></details><div class="game-end-actions"><button id="game-end-new" type="button">New Game</button><button id="game-end-rematch" type="button">Rematch</button></div></div>`;
document.body.append(gameEnd);
const gameXp=document.createElement('section');gameEnd.querySelector('.game-end-score')!.after(gameXp);
window.addEventListener('account-xp-saved',event=>{const id=(event as CustomEvent).detail.gameId;if(id===match.matchId)void showGameXp(gameXp,id,()=>{gameEnd.close();creator.open()});});

gameEnd.addEventListener('cancel',event=>event.preventDefault());
byId('game-end-new').addEventListener('click',()=>{gameEnd.close();closeGameSurface()});
byId('game-end-rematch').addEventListener('click',()=>{gameEnd.close();scene.cancelMatchCelebration();match.reset();lastUI='';updateUI();focusView()});
function renderGameStats(){
 const shots=match.gameShotHistory,names=playerNames();
 byId('game-end-stats-summary').textContent=`${match.recordedPoints} ${match.recordedPoints===1?'rally':'rallies'} · ${shots.length} ${shots.length===1?'shot':'shots'}`;
 const host=byId('game-end-player-stats');host.replaceChildren();
 for(const player of courtSlots){
  const counts=new Map<ShotType,number>();for(const shot of shots)if(shot.actor===player)counts.set(shot.type,(counts.get(shot.type)??0)+1);
  const total=[...counts.values()].reduce((sum,count)=>sum+count,0),card=document.createElement('article'),heading=document.createElement('header'),name=document.createElement('h3'),amount=document.createElement('strong'),list=document.createElement('dl');
  name.textContent=`${names[player]} · ${slotLabels[player]}`;amount.textContent=`${total} ${total===1?'shot':'shots'}`;heading.append(name,amount);
  for(const [type,count] of [...counts].sort((a,b)=>b[1]-a[1]||SHOT_FAMILIES[a[0]].name.localeCompare(SHOT_FAMILIES[b[0]].name))){const row=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');term.textContent=SHOT_FAMILIES[type].name;value.textContent=String(count);row.append(term,value);list.append(row)}
  if(!total){const empty=document.createElement('p');empty.textContent='No recorded shots';card.append(heading,empty)}else card.append(heading,list);host.append(card);
 }
}
function syncGameEnd(){
 if(match.replayIndex===null)scene.observeBodyHit(match.state,performance.now()/1000);
 if(scene.celebratingAtp||scene.reactingToHit)return;
 const early=endedGames.has(match.scoring),finished=early||!!match.scoring.winner;
 if(finished&&!match.practice&&!match.isLocalHuman&&match.replayIndex===null){const names=playerNames();void accountControls.completed(match.scoring,{id:match.matchId,home_names:`${names.you} & ${names.partner}`,away_names:`${names['opponent-left']} & ${names['opponent-right']}`,home_score:match.scoring.score.home,away_score:match.scoring.score.away,ended_early:early,target:match.scoring.rules.target,difficulty:'normal',participants:courtSlots.flatMap(slot=>{const player=match.getPlayerDesign(slot);return player?[{player_id:player.id,name:player.name,team:slot==='you'||slot==='partner'?'home' as const:'away' as const}]:[]})})}
 const visible=!onStartScreen&&finished&&match.replayIndex===null&&!creator.dialog.open&&!settingsDialog.open&&!playerDetailsOpen();
 if(!visible){scene.cancelMatchCelebration();if(gameEnd.open)gameEnd.close();return}
 if(!early&&!scene.finishMatch(match.matchId,match.scoring.score,'home',`${playerNames()['opponent-left']} & ${playerNames()['opponent-right']}`))return;
 const names=playerNames(),home=`${names.you} & ${names.partner}`,away=`${names['opponent-left']} & ${names['opponent-right']}`;
 byId('game-end-title').textContent=early?'Game ended':(match.scoring.winner==='home'?home:away);
 gameEnd.querySelector('.game-end-label')!.textContent=early?'ENDED EARLY':'THE WINNERS';
 byId('game-end-home-names').textContent=home;byId('game-end-away-names').textContent=away;
 byId('game-end-home-score').textContent=String(match.scoring.score.home);byId('game-end-away-score').textContent=String(match.scoring.score.away);
 // Solo stats are parked for the future paid upgrade; retain the renderer.
 const gameStats=gameEnd.querySelector<HTMLDetailsElement>('.game-end-stats')!;
 gameStats.hidden=match.mode==='solo';
 if(!gameStats.hidden)renderGameStats();
 gameEnd.dataset.winner=match.scoring.winner??'';
 if(!gameEnd.open){(gameEnd.querySelector('.game-end-stats') as HTMLDetailsElement).open=false;gameXp.replaceChildren();if(early)gameXp.textContent='Incomplete game · 0 XP';else void showGameXp(gameXp,match.matchId,()=>{gameEnd.close();creator.open()});showViewDialog(gameEnd);focusView()}
}

function syncReplayUI(replay:ReturnType<Match['replayView']>){
 replayOverlay.hidden=!replay||document.body.dataset.panel!=='play';
 if(!replay)return;
 byId('score-home').textContent=String(replay.state.score.home);byId('score-away').textContent=String(replay.state.score.away);
 const slider=byId('replay-position') as HTMLInputElement;
 const first=match.replayFrames[0]?.simulationTime??0,total=((match.replayFrames.at(-1)?.simulationTime??first)-first)/1.5;
 const elapsed=Math.max(0,(replay.state.simulationTime-first)/1.5);
 slider.max=String(total);slider.value=String(elapsed);slider.setAttribute('aria-valuetext',`${clock(elapsed)} of ${clock(total)}`);
 byId('replay-time').textContent=`${clock(elapsed)} / ${clock(total)}`;
 replayOverlay.setAttribute('aria-label',match.replayScope==='game'?'Full game replay':'Point replay');
 replayOverlay.querySelector('.replay-track strong')!.textContent=match.replayScope==='game'?'Full Game Replay':'Point Replay';
 const toggle=byId('replay-toggle');toggle.textContent=match.replayPlaying?'Ⅱ':'▶';toggle.setAttribute('aria-label',`${match.replayPlaying?'Pause':'Play'} ${match.replayScope} replay`);
}

const targetPicker=new TargetPicker(match,scene);
let guestHasAimed=false;
const reactionOwner=()=>cloudPlayers.accountId??browserStorage.getItem('pickle-rpg-cloud-owner-v1')??'local';
const localReactions=new LocalReactions(browserStorage,reactionOwner,()=>({id:match.matchId,point:match.point,time:match.state.simulationTime,player:match.state.currentHitter==='partner'?'partner':'you'}));
const reactions=new TrashTalkControl(document.querySelector<HTMLElement>('.court-wrap')!,settingsDialog,async()=>({owner:reactionOwner(),token:''}),()=>targetPicker.clear(),localReactions.request);
// Keep the in-game drawer aligned with Friends games; setup, roster, and account management live elsewhere.
for(const id of ['open-player-design','restart'])byId(id).hidden=true;
document.querySelector<HTMLElement>('#game-settings .settings-lineup')!.hidden=true;
document.querySelector<HTMLElement>('#game-settings .settings-account')!.hidden=true;
for(const selector of ['label[for="scoring-preference"]','label[for="result-timer"]'])document.querySelector<HTMLElement>(selector)!.hidden=true;
byId('guides-state').hidden=true;byId('show-player-names-state').hidden=true;byId('partner-autonomy-state').hidden=true;
const soundLabel=settingsDialog.querySelector<HTMLElement>('[data-sound-toggle]')!.closest<HTMLElement>('label')!;
const guidesLabel=byId('guides').closest<HTMLElement>('label')!;
const namesLabel=byId('show-player-names').closest<HTMLElement>('label')!;
const partnerLabel=byId('partner-autonomy').closest<HTMLElement>('label')!;
const reactionsLabel=settingsDialog.querySelector<HTMLElement>('.settings-reactions-toggle')!;
settingsDialog.querySelector('.settings-heading')!.after(soundLabel,guidesLabel,namesLabel,partnerLabel,reactionsLabel);
settingsActions.classList.add('settings-compact-actions');settingsActions.append(endGameButton);settingsDialog.append(settingsActions);
const courtReplay=document.createElement('button');courtReplay.type='button';courtReplay.className='open-play-replay';courtReplay.setAttribute('aria-label','Replay rally');courtReplay.title='Replay rally';courtReplay.innerHTML=hudButtonIcon('replay');document.querySelector('.court-wrap')!.append(courtReplay);
courtReplay.onclick=()=>{targetPicker.clear();match.startRecentReplay();lastUI='';updateUI();syncReplayUI(match.replayView());if(match.replayIndex!==null)byId('replay-position').focus()};

const RESULT_WINDOW_SECONDS=10;
const RESULT_DELAY_SECONDS=1.5;
let resultReadyAt:number|null=null;
let resultEngine:Match['engine']|null=null,resultElapsed=0,resultExpired=false;
function advancePoint(){
 if(match.state.phase!=='complete'||match.replayIndex!==null)return;
 if(match.scoring.winner&&match.isLocalHuman){showMatchSetup(true);return;}match.scoring.winner?match.reset():match.nextPoint();byId('court-result').hidden=true;lastUI='';updateUI();
}
byId('next-point').addEventListener('click',advancePoint);
byId('open-replay').addEventListener('click',()=>{
 if(match.state.phase!=='complete')return;
 match.startReplay();byId('court-result').hidden=true;lastUI='';updateUI();replayOverlay.hidden=false;byId('replay-position').focus();
});
function syncPointResult(dt:number){
 const banner=byId('court-result');
 // Start the reaction before checking visibility: this runs before scene.render.
 if(match.replayIndex===null)scene.observeBodyHit(match.state,performance.now()/1000);
 if(match.scoring.winner){banner.hidden=true;document.querySelector('.court-wrap')?.classList.remove('has-result');return}
 if(match.state.phase!=='complete'){resultEngine=null;resultElapsed=0;resultExpired=false;resultReadyAt=null;banner.hidden=true;document.querySelector('.court-wrap')?.classList.remove('has-result');return}
 if(resultEngine!==match.engine){resultEngine=match.engine;resultElapsed=0;resultExpired=false;resultReadyAt=null}
 const now=performance.now()/1000;
 if(scene.reactingToHit||scene.celebratingAtp)resultReadyAt=null;
 else resultReadyAt??=now+RESULT_DELAY_SECONDS;
 const visible=resultReadyAt!==null&&now>=resultReadyAt&&!scene.reactingToHit&&!scene.celebratingAtp&&(!resultTimer||!resultExpired)&&match.replayIndex===null&&document.body.dataset.panel==='play'&&!settingsDialog.open&&!creator.dialog.open&&!playerDetailsOpen()&&!document.hidden;
 banner.hidden=!visible;document.querySelector('.court-wrap')?.classList.toggle('has-result',visible);
 if(!visible)return;
 byId('next-point').textContent=match.scoring.winner?'New game ↗':'Next point ↗';
 if(match.isLocalHuman||!resultTimer&&!match.playerAutonomy){byId('point-countdown').textContent='';return}
 resultElapsed+=dt;
 const remaining=Math.max(0,Math.ceil(RESULT_WINDOW_SECONDS-resultElapsed));
 byId('point-countdown').textContent=match.scoring.winner?`Closing in ${remaining}…`:`Next point in ${remaining}…`;
 if(resultElapsed>=RESULT_WINDOW_SECONDS){resultExpired=true;banner.hidden=true;document.querySelector('.court-wrap')?.classList.remove('has-result');if(!match.scoring.winner)advancePoint()}
}

let setupReturnsToCourt=false;
const startConfiguredMatch:ConstructorParameters<typeof MatchSetup>[0]=(players,mode,court,target)=>{
 const save=match.onCheckpoint;match.onCheckpoint=null;
 try{
  applyCourtLocation(court);
  if(mode==='local-human')match.startLocalHumanMatch(players);
  else{
   match.startSoloMatch(target);match.partnerAutonomy=false;
   for(const slot of courtSlots){match.lineup[slot]=playerArchetype(players[slot]);match.substitutePlayer(slot,players[slot]);}
   match.reset();
  }
 }finally{match.onCheckpoint=save;}
 try{match.saveBoundary()}catch(error){reportSaveError(error);return;}
 saveScoringPreference(match.scoring.rules);
 for(const slot of courtSlots)scene.substitutePlayer(slot,match.getPlayerDesign(slot));
 syncRosterNames();
 for(const [id,value] of [['partner-autonomy',match.partnerAutonomy],['player-autonomy',match.playerAutonomy]] as const){(byId(id) as HTMLInputElement).checked=value;byId(id+'-state').textContent=value?'On':'Off';}
 matchup.hide();enterCourt(false);
 history.replaceState(null,'',`/?game=${encodeURIComponent(match.matchId)}`);
};
const matchup=new MatchSetup(startConfiguredMatch,()=>closeGameSurface(),setScoringPreference);
function showMatchSetup(returnToCourt=false){
 setupReturnsToCourt=returnToCourt;
 voice.stop();voiceHandsFree=false;voiceHandsFreeInput.checked=false;match.stopReplay();
 onStartScreen=true;document.body.dataset.screen='setup';app.inert=true;startScreen.hidden=true;targetPicker.sync(false);
 setScoringPreference(loadScoringPreference({scoring:scoringPreference,target:11}).scoring);
 matchup.show(creator.savedPlayers,courtSlots.map(slot=>match.getPlayerDesign(slot)),match.mode,scoringPreference);
}
function showStartScreen(){
 matchup.hide();
 voice.stop();voiceHandsFree=false;voiceHandsFreeInput.checked=false;match.stopReplay();
 onStartScreen=true;document.body.dataset.screen='start';app.inert=true;startScreen.hidden=false;targetPicker.sync(false);focusView();
}
function enterCourt(fresh=true){
 if(fresh){match.practice=null;reset()}
 onStartScreen=false;document.body.dataset.screen='court';app.inert=false;startScreen.hidden=true;showPanel('play');lastUI='';updateUI();focusView();
}
byId('start-multiplayer').addEventListener('click',()=>location.assign('/?openplay=1'));
byId('start-quick-solo').addEventListener('click',()=>{
 const button=byId('start-quick-solo') as HTMLButtonElement;if(button.disabled)return;
 button.disabled=true;button.setAttribute('aria-busy','true');
 const notice=startScreen.querySelector<HTMLElement>('.start-loading')!;notice.textContent='Setting up your match…';
 void(async()=>{
  await cloudReady;
  const session=(await authClient()?.auth.getSession())?.data.session;
  const catalog=await communityPlayers();
  let home=null;
  if(session&&!session.user.is_anonymous){
   home=await new TeamPicker(document.createElement('div'),undefined,undefined,true).freshTeam();
  }
  const setup=quickSolo(catalog.map(row=>row.player),home);
  Object.assign(setup,loadScoringPreference({scoring:setup.scoring,target:setup.target}));
  setScoringPreference(setup.scoring);guestHasAimed=false;
  startConfiguredMatch(setup.players,'solo',setup.court,setup.target);
  notice.textContent='';
 })().catch(error=>{notice.textContent=(error as Error).message;}).finally(()=>{button.disabled=false;button.removeAttribute('aria-busy');});
});
byId('start-create-player').addEventListener('click',()=>{playerOnboarding=true;creator.activateOnSave=true;creator.createPlayer()});
byId('back-to-lobby').addEventListener('click',()=>{if(settingsCloseTimer)window.clearTimeout(settingsCloseTimer);settingsDialog.close();settingsDialog.classList.remove('is-closing');closeGameSurface()});
document.querySelector('.brand')!.addEventListener('click',event=>{event.preventDefault();showStartScreen()});
const saveStatus=document.createElement('p');saveStatus.id='local-save-status';saveStatus.setAttribute('role','status');saveStatus.hidden=true;document.body.append(saveStatus);
let localStore:OpenPlayStore|null=null;
let resumeReady=false;
function reportSaveError(error:unknown){saveStatus.hidden=false;saveStatus.textContent=error instanceof Error?error.message:'Could not save this match.';}
const launchParams=new URLSearchParams(location.search);
const requestedGame=launchParams.get('game');
function initializeResume(owner:string){
 try{
  localStore=new OpenPlayStore(browserStorage,owner);
  const saved=localStore.load(requestedGame??undefined);
  if(requestedGame&&!saved)throw new Error('This saved game is not available for this account on this browser.');
  match.onCheckpoint=c=>{if(endedGames.has(match.scoring))return;try{localStore!.save(c,document.body.dataset.location as 'forest'|'venice'|'arizona');saveStatus.hidden=true;if(!onStartScreen)history.replaceState(null,'',`/?game=${encodeURIComponent(c.matchId)}`)}catch(error){reportSaveError(error);throw error}};
  if(saved){
   match.restoreCheckpoint(saved.checkpoint);applyCourtLocation(saved.court);
   if(saved.ended)endedGames.add(match.scoring);
   for(const id of courtSlots)scene.substitutePlayer(id,match.getPlayerDesign(id));
   syncRosterNames();
   (byId('partner-autonomy') as HTMLInputElement).checked=match.partnerAutonomy;
   byId('partner-autonomy-state').textContent=match.partnerAutonomy?'On':'Off';
   (byId('player-autonomy') as HTMLInputElement).checked=match.playerAutonomy;
   byId('player-autonomy-state').textContent=match.playerAutonomy?'On':'Off';
   if(requestedGame&&!directRoster)enterCourt(false);
  }
  if(launchParams.get('newgame')==='1'&&!launchParams.has('configured'))showMatchSetup();
 }catch(error){showStartScreen();reportSaveError(error);match.onCheckpoint=()=>{throw new Error('Your saved games could not be read. Reload before starting another game.')}}
 finally{if(!directRoster)rosterLoading.hidden=true;resumeReady=true;startScreen.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=false);}
}
void cloudReady.then(()=>{initializeResume(cloudPlayers.accountId??browserStorage.getItem('pickle-rpg-cloud-owner-v1')??'local');
 if(launchParams.get('createplayer')==='1'&&cloudAccountState.kind==='authenticated'){
  const pending=browserSessionStorage.getItem(pendingPlayerKey);
  if(pending)try{playerOnboarding=true;creator.activateOnSave=true;creator.resumeCreatePlayer(JSON.parse(pending));const clean=new URL(location.href);clean.searchParams.delete('createplayer');history.replaceState(null,'',clean);}catch{browserSessionStorage.removeItem(pendingPlayerKey)}
 }
 if(new URLSearchParams(location.search).has('configured')&&window.parent!==window){
  const receive=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='picklebash:start-solo')return;try{const setup=parseSoloLaunch(event.data.setup);setScoringPreference(setup.scoring);startConfiguredMatch(setup.players,'solo',setup.court,setup.target);window.removeEventListener('message',receive);}catch(error){reportSaveError(error);}};
  window.addEventListener('message',receive);window.parent.postMessage('picklebash:solo-ready',location.origin);
 }
});
// Open roster directly, and return multiplayer visitors to their saved game on close.
if(directRoster)void cloudReady.then(()=>{
 creator.open();rosterLoading.hidden=true;
 creator.dialog.addEventListener('close',()=>{
  if(rosterRoute.get('from')==='multiplayer'){
   rosterLoading.textContent='Returning to your game…';rosterLoading.hidden=false;
   const back=new URL('/?multiplayer=1',location.origin);const matchId=rosterRoute.get('match');
   if(matchId)back.searchParams.set('match',matchId);location.assign(back.href);
  }else if(onStartScreen)showStartScreen();
 },{once:true});
});
startScreen.querySelector('.start-loading')!.textContent='';app.inert=onStartScreen;
updateUI();let previous:number|undefined;function frame(now:number){
 if(onStartScreen||!resumeReady){previous=now;requestAnimationFrame(frame);return}
 const realDt=previous===undefined?0:Math.max(0,Math.min((now-previous)/1000,.1)),dt=realDt*1.125*speed;if(!creator.dialog.open&&(!endedGames.has(match.scoring)||match.replayIndex!==null))try{match.update(match.replayPlaying?realDt:dt)}catch(error){reportSaveError(error)};previous=now;updateUI();if(!endedGames.has(match.scoring))syncPointResult(realDt*speed);syncGameEnd();syncVoice();
 rallySounds.update(match.state,cue=>sounds.play(cue),'home',match.scoring.winner==='home');
 const replay=match.replayView();syncReplayUI(replay);scene.setGuides(guides&&!replay);
 const showCourtHint=document.body.dataset.panel==='play'&&!settingsDialog.open&&!creator.dialog.open&&!playerDetailsOpen()&&!gameEnd.open&&!reactions.isOpen&&!replay;
 if(targetPicker.active)guestHasAimed=true;
 scene.setNextHitter(!replay&&!match.scoring.winner?match.activeHitter:null);
 scene.setServeHint(showCourtHint&&!guestHasAimed&&cloudAccountState.kind!=='authenticated'&&cloudAccountState.kind!=='connecting'&&match.humanContact&&match.state.phase==='decision'&&match.shot.intent.type==='serve'?match.shot.contact:null);
 scene.render(replay?.state??match.state,now/1000,replay?.shot??match.shot,!match.practice&&!replay?match.scoring.call:null,!replay&&!settingsDialog.open&&!gameEnd.open&&match.state.phase==='decision'&&match.state.possession==='away'?match.state.currentHitter:null);
 const courtVisible=!onStartScreen&&!settingsDialog.open&&!creator.dialog.open&&!playerDetailsOpen()&&!gameEnd.open;
 courtReplay.hidden=!courtVisible||!!replay;courtReplay.disabled=!match.canReplay;courtReplay.title=match.canReplay?'Replay rally':'Replay available after a shot';
 reactions.update({id:match.matchId,version:match.point},reactionOwner());
 reactions.frame(scene,replay?.state??match.state,replay?replay.state.simulationTime:null,courtVisible,replay?(match.replayScope==='game'?[]:localReactions.replay(match.matchId,match.replayPointIndex,replay.state.simulationTime)):undefined);
 targetPicker.sync(document.body.dataset.panel==='play'&&!settingsDialog.open&&!creator.dialog.open&&!reactions.isOpen);requestAnimationFrame(frame)
}requestAnimationFrame(frame);
// Optional browser-native tools use the exact same validated simulation entry point.
const context=(document as Document & {modelContext?:{registerTool:(tool:unknown)=>Promise<void>|void}}).modelContext;
if(context?.registerTool){for(const tool of [{name:'read_pickleball_state',description:'Read the current match and available shot intent.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>structuredClone({match:{score:match.scoring,point:match.point,mode:match.mode,currentPlayer:match.currentPlayer,decisionId:match.decisionId},receptionOptions:match.receptionOptions,state:match.snapshot(),availableIntents:match.availableIntents})},{name:'play_pickleball_shot',description:'Submit a shot intent during a decision pause.',inputSchema:{type:'object',properties:{intent:SHOT_INTENT_SCHEMA},required:['intent'],additionalProperties:false},execute:(input:{intent:unknown})=>{if(onStartScreen)throw new Error('Start a new game first.');if(!match.humanContact)throw new Error('Wait for a human contact.');match.submitIntent(input.intent);updateUI();return structuredClone(match.state)}}]){try{Promise.resolve(context.registerTool(tool)).catch(console.warn)}catch(error){console.warn(error)}}}
