import {randomLineup} from './random-lineup';
import {describePointResult} from './point-result';
import {choiceCopy} from './shot-choice';
import {TargetPicker} from './target-picker';
import {LOOKS} from './player-looks';
import {shotIcon,shotTraits,pickleballMark} from './shot-illustration';
import {newPlayer,type DesignedPlayer} from './player-design';
import {AvatarThumbnails} from './avatar-preview';
import {localRecognition} from './local-voice';
import {VoiceInput,browserRecognition,voiceCommand,voiceContactReady} from './voice';
import {PlayerCreator} from './player-creator';
import {summarizeSkills} from './player-skill-summary';
import {PATTERNS} from './engine/patterns';
import {PERSONALITIES} from './engine/opponent-brain';
import {PLAYER_PROFILES,ARCHETYPES} from './engine/player-profiles';
import {Match} from './match';
import {SHOT_FAMILIES} from './engine/shot-families';
import type {PlayerId,ShotIntent} from './engine/model';
import {SHOT_INTENT_SCHEMA,targetLabel} from './engine/shot-intent';
import './style.css';
import {CourtScene} from './scene';
import {preloadAthletes} from './athlete';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header class="header"><a class="brand" href="/" aria-label="Pickle RPG home"><span class="brand-ball">⠿</span> PICKLE<span>RPG</span></a><button id="open-settings" class="header-icon" aria-label="Settings" title="Settings" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.2 3-.6 2.2-1.5.9L4.9 6 2.8 9.6l1.6 1.6v1.7l-1.6 1.6 2.1 3.6 2.2-.2 1.5.9.6 2.2h4.2l.6-2.2 1.5-.9 2.2.2 2.1-3.6-1.6-1.6v-1.7l1.6-1.6L17.7 6l-2.2.1-1.5-.9-.6-2.2Z"/><circle cx="11.3" cy="12" r="3"/></svg></button></header>
<main><section class="play-section">
<div class="court-wrap"><div id="court"></div><div class="court-top"><span class="court-chip"><i></i> GARDEN COURT</span><div class="score" aria-label="Match score"><div class="score-row score-row-home"><span>YOU &amp; FINN</span><b id="score-home">0</b></div><div class="score-row score-row-away"><span>JULES &amp; RIO</span><b id="score-away">0</b></div></div></div><div id="court-result" class="court-result" role="status" aria-live="assertive" hidden><span>POINT OVER</span><strong id="court-result-title"></strong><small id="court-result-detail"></small><div class="result-actions"><button id="next-point" type="button">Next point ↗</button><button id="open-replay" type="button" aria-controls="replay-overlay">▶ Replay</button></div><div id="point-countdown" aria-live="off"></div></div><div class="court-bottom"><span>20 × 44 FT <span class="small-dot">·</span> REGULATION COURT</span><span class="team-key"><i></i> YOUR TEAM <i></i> OPPONENTS</span></div></div>


<div class="rally-strip"><div class="eyebrow">THE PATTERN <span>01 / PRESSURE THE MIDDLE</span></div><ol id="timeline">${['Serve','Deep return','Drive middle','High block','Overhead'].map((s,i)=>`<li data-step="${i}"><span class="step-number">${i+1}</span><span>${s}</span></li>`).join('')}</ol></div>
</section><aside><button id="back-to-play" class="back-to-play">← Back to play</button><div class="aside-heading"><span class="eyebrow">PATTERN 01</span><span class="difficulty">INTERMEDIATE +</span></div><h2>Pressure.<br>Pop-up.<br><em>Put-away.</em></h2><p class="pattern-description">Create a weak ball through the middle. Recognize your chance to finish.</p><div class="aside-divider"></div><div id="decision" aria-live="polite"></div><div class="coach"><span class="coach-icon">✳</span><div><div class="eyebrow">COURT SENSE</div><p id="cue"></p></div></div><div class="aside-foot"><span class="script-dot"></span> Scripted opponents <span>·</span> Automatic positioning</div><section id="match-panel" hidden></section></aside></main><footer><span>READ THE COURT. MAKE THE CALL.</span><span><kbd>Space</kbd> play shot / pause <kbd>R</kbd> restart</span></footer><dialog id="game-settings" aria-labelledby="settings-title"><div class="settings-heading"><h2 id="settings-title">Settings</h2><button id="close-settings" aria-label="Close settings">✕</button></div><section class="settings-lineup" aria-labelledby="settings-lineup-title"><h3 id="settings-lineup-title">Current Players</h3><div id="settings-player-slots"></div></section><label class="settings-toggle" for="guides"><span>Flight guide<small>Show the ball path and target marker.</small></span><span class="settings-switch-control"><strong id="guides-state">On</strong><input id="guides" type="checkbox" role="switch" checked></span></label><label class="settings-toggle" for="show-player-names"><span>Show player names<small>Display name labels above players on the court.</small></span><span class="settings-switch-control"><strong id="show-player-names-state">On</strong><input id="show-player-names" type="checkbox" role="switch" checked></span></label><label class="settings-toggle" for="result-timer"><span>Result window timer<small>Automatically continue after the point result.</small></span><span class="settings-switch-control"><strong id="result-timer-state">On</strong><input id="result-timer" type="checkbox" role="switch" checked></span></label></dialog>`;
document.querySelector('#game-settings .settings-lineup')!.insertAdjacentHTML('afterend','<button id="restart" class="settings-restart">Restart current game <span aria-hidden="true">↻</span></button><label class="settings-toggle" for="partner-autonomy"><span>Partner auto-play<small>Let your partner choose their own shots when the ball comes to them.</small></span><span class="settings-switch-control"><strong id="partner-autonomy-state">Off</strong><input id="partner-autonomy" type="checkbox" role="switch"></span></label>');
app.insertAdjacentHTML('beforeend','<dialog id="shot-drawer" aria-labelledby="shot-drawer-title"><div class="drawer-heading"><div><div class="eyebrow">SHOT MENU</div><h2 id="shot-drawer-title">More options</h2></div><button id="close-shot-drawer" aria-label="Close more options">✕</button></div><p id="shot-drawer-description">Other playable choices for this contact.</p><div id="more-options-list"></div></dialog>');
app.insertAdjacentHTML('beforeend','<dialog id="player-drawer" aria-labelledby="player-drawer-title"><div class="drawer-heading"><div><div class="eyebrow">PLAYER PROFILE</div><h2 id="player-drawer-title"></h2></div><button id="close-player-drawer" aria-label="Close player profile">✕</button></div><div class="player-profile-portrait"><img id="player-drawer-portrait" alt=""></div><button type="button" id="edit-player-design" hidden>Edit Design ↗</button><p id="player-drawer-description"></p><div id="player-drawer-meta"></div><dl id="player-drawer-skills" class="player-skill-drawer"></dl></dialog>');
await preloadAthletes();
const match=new Match();let scene:CourtScene;
try{scene=new CourtScene(document.querySelector('#court')!,id=>openPlayerDrawer(id))}catch(error){document.querySelector('#court')!.innerHTML='<div class="webgl-error"><h2>3D rendering is unavailable</h2><p>Enable hardware acceleration in your browser, then reload to play.</p></div>';throw error}
const byId=(id:string)=>document.getElementById(id)!;
const speed=1.125;let guides=true,showPlayerNames=true,resultTimer=true,cameraDistance=50,lastUI='';
const voicePanel=document.createElement('section');voicePanel.className='voice-controls';
voicePanel.innerHTML=`<div class="voice-actions"><span id="voice-mic-dock" hidden><button id="voice-speak" type="button" aria-label="Speak a shot" title="Speak a shot" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg></button></span><label><input id="voice-handsfree" type="checkbox"> Hands-free</label></div><p id="voice-status" role="status"></p><div id="voice-recovery" hidden><label>Game address <input id="voice-address" readonly aria-label="Game address"></label><button id="voice-copy-address" type="button">Copy game address</button><span id="voice-copy-status" role="status"></span></div><p id="voice-partner-status"></p>`;
document.querySelector('.court-wrap')!.insertAdjacentElement('afterend',voicePanel);
const voiceSpeak=byId('voice-speak') as HTMLButtonElement;
const voiceHandsFreeInput=byId('voice-handsfree') as HTMLInputElement,voiceHandsFreeLabel=voiceHandsFreeInput.parentElement!;
voiceHandsFreeLabel.className='voice-handsfree-toggle';
let chimeContext:AudioContext|undefined,wasListening=false;
const unlockChime=()=>{try{chimeContext??=new AudioContext();void chimeContext.resume().catch(()=>{})}catch{}};
const listeningChime=()=>{
 if(!chimeContext||chimeContext.state!=='running')return;
 const oscillator=chimeContext.createOscillator(),gain=chimeContext.createGain(),now=chimeContext.currentTime;
 oscillator.type='sine';oscillator.frequency.setValueAtTime(880,now);oscillator.frequency.exponentialRampToValueAtTime(1175,now+.12);
 gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.08,now+.015);gain.gain.exponentialRampToValueAtTime(.001,now+.18);
 oscillator.connect(gain);gain.connect(chimeContext.destination);oscillator.start(now);oscillator.stop(now+.2);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
};
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
 const blocked=settingsDialog.open||creator.dialog.open||shotDrawer.open||playerDrawer.open||match.replayIndex!==null||document.hidden;
 if(blocked){if(voice.active){voice.stop();voiceStatus('')}voiceHandsFree=false;voiceHandsFreeInput.checked=false}
 else if(changed&&voice.active){voice.stop();voiceStatus('')}
 voiceMeter.hidden=voice.phase!=='listening'||!localFactory;
 voiceThinking.hidden=voice.phase!=='transcribing'&&!match.customBusy;
 voiceStatusText.hidden=!voiceThinking.hidden;
 voiceFeedback.hidden=voiceMeter.hidden&&voiceThinking.hidden&&!voiceStatusText.textContent;
 voiceContextKey=key;
 if(!blocked&&voiceHandsFree&&!voice.active&&!match.customBusy&&!match.thinking&&(match.manualReceptionDecision||voiceContactReady(match.state,match.partnerAutonomy))&&voiceAttempt!==key){voiceAttempt=key;voice.start()}
}

const creator=new PlayerCreator(player=>{
 match.practice=null;match.setPlayerDesign(player);scene.setPlayerDesign(player);
 syncRosterNames();
 lastUI='';updateUI();
},id=>{for(const slot of courtSlots)if(match.getPlayerDesign(slot)?.id===id){match.substitutePlayer(slot,null);scene.substitutePlayer(slot,null)}syncRosterNames()});
// Lift the court framing above the decision dock without changing the user's orbit.
const decisionDock=document.querySelector('main > aside') as HTMLElement;
decisionDock.id='shot-selection-panel';
const collapseShots=document.createElement('button');
collapseShots.type='button';collapseShots.className='shot-panel-collapse';
collapseShots.setAttribute('aria-label','Hide shots');collapseShots.title='Hide shots';
collapseShots.setAttribute('aria-controls',decisionDock.id);collapseShots.setAttribute('aria-expanded','true');
collapseShots.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
decisionDock.prepend(collapseShots);
const expandShots=document.createElement('button');
expandShots.type='button';expandShots.className='shot-panel-expand';expandShots.hidden=true;
expandShots.setAttribute('aria-controls',decisionDock.id);expandShots.setAttribute('aria-expanded','false');
expandShots.innerHTML='<span>Show shots</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
decisionDock.after(expandShots);
document.body.classList.add('shots-collapsed');
const setShotsCollapsed=(collapsed:boolean)=>{
 scene.setShotPreview(null);
 decisionDock.querySelectorAll('.is-previewing').forEach(card=>card.classList.remove('is-previewing'));
 document.body.classList.toggle('shots-collapsed',collapsed);
 (collapsed?byId('open-player-design'):collapseShots).focus();
};
collapseShots.addEventListener('click',()=>setShotsCollapsed(true));
expandShots.addEventListener('click',()=>setShotsCollapsed(false));
const updateCourtFraming=()=>{const visible=document.body.classList.contains('match-mode')&&document.body.dataset.panel==='play'&&getComputedStyle(decisionDock).display!=='none';scene.setBottomOverlay(visible?decisionDock.getBoundingClientRect().height:0)};
new ResizeObserver(updateCourtFraming).observe(decisionDock);
new MutationObserver(updateCourtFraming).observe(document.body,{attributes:true,attributeFilter:['class','data-panel']});
const savedPlayer=creator.activePlayer;
if(savedPlayer){match.setPlayerDesign(savedPlayer);scene.setPlayerDesign(savedPlayer);document.querySelector('.score-row-home > span')!.textContent=`${savedPlayer.name} & FINN`}
byId('open-settings').insertAdjacentHTML('beforebegin','<button class="player-design-entry header-icon" id="open-player-design" aria-label="Player Designer" title="Player Designer" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 8-5.65M14 20l1-4 5-5 3 3-5 5-4 1Z"/></svg></button>');
byId('open-settings').before(byId('restart'));
byId('restart').className='header-icon';byId('restart').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg>';
for(const {slot,archetype,player} of randomLineup()){match.lineup[slot]=archetype;match.substitutePlayer(slot,player);scene.substitutePlayer(slot,player)}
match.reset();syncRosterNames();
byId('open-player-design').addEventListener('click',()=>creator.open());
if(new URLSearchParams(location.search).get('design')==='1')creator.open();
creator.dialog.addEventListener('close',()=>byId('open-player-design').focus());
const escapeText=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

let activePanel='play';
function showPanel(panel:string){activePanel=panel;document.body.dataset.panel=panel;document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===panel)))}
document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b=>b.addEventListener('click',()=>{showPanel(b.dataset.panel!);(byId('game-settings') as HTMLDialogElement).close();byId('back-to-play').focus()}));
byId('back-to-play').addEventListener('click',()=>{showPanel('play');byId('open-settings').focus()});
document.body.classList.add('match-mode');byId('match-panel').hidden=false;byId('restart').title='Restart the game (R)';byId('restart').setAttribute('aria-label','Restart Game');showPanel('play');


function submit(){if(targetPicker.active)return;if(match.state.phase==='decision'&&match.state.possession==='home'){match.submitIntent(match.availableIntents[0]);updateUI()}}
function reset(){voice.stop();voiceAttempt=null;match.reset();lastUI='';updateUI()}
function pause(){if(match.receptionDecision)return;if(match.state.phase==='flight'){match.state.paused=!match.state.paused;lastUI='';updateUI()}}
byId('restart').addEventListener('click',()=>{reset();closeSettings()});
const settingsDialog=byId('game-settings') as HTMLDialogElement;
const shotDrawer=byId('shot-drawer') as HTMLDialogElement;
const playerDrawer=byId('player-drawer') as HTMLDialogElement;
const replayOverlay=document.createElement('section');replayOverlay.id='replay-overlay';replayOverlay.hidden=true;replayOverlay.setAttribute('aria-label','Point replay');
replayOverlay.innerHTML='<div class="replay-player"><button id="replay-toggle" class="replay-toggle" aria-label="Pause point replay">Ⅱ</button><div class="replay-track"><div><strong>Replay</strong><output id="replay-time">0:00 / 0:00</output></div><input id="replay-position" type="range" min="0" max="0" value="0" step="0.01" aria-label="Replay timeline"></div><button id="close-replay" aria-label="Exit replay" title="Exit replay">✕</button></div>';
document.querySelector('.court-wrap')!.append(replayOverlay);
function closeReplay(){replayOverlay.hidden=true;match.stopReplay();lastUI='';updateUI();byId('court-result').hidden=!!match.scoring.winner;if(match.scoring.winner)syncGameEnd();else byId('open-replay').focus()}
byId('close-replay').addEventListener('click',closeReplay);
byId('replay-toggle').addEventListener('click',()=>{match.replayPlaying?match.pauseReplay():match.resumeReplay()});
byId('replay-position').addEventListener('input',event=>{match.scrubReplayTime(Number((event.target as HTMLInputElement).value))});
replayOverlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeReplay()}else if(event.code==='Space'&&event.target instanceof HTMLInputElement){event.preventDefault();match.replayPlaying?match.pauseReplay():match.resumeReplay()}});

let profilePortraits:AvatarThumbnails|undefined;
let shotDrawerCloseTimer:number|undefined,playerDrawerCloseTimer:number|undefined,settingsCloseTimer:number|undefined;
function openShotDrawer(){if(shotDrawerCloseTimer)window.clearTimeout(shotDrawerCloseTimer);shotDrawer.classList.remove('is-closing');if(!shotDrawer.open)shotDrawer.showModal()}
function closeShotDrawer(){if(!shotDrawer.open||shotDrawer.classList.contains('is-closing'))return;shotDrawer.classList.add('is-closing');const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;shotDrawerCloseTimer=window.setTimeout(()=>{shotDrawer.close();shotDrawer.classList.remove('is-closing');shotDrawerCloseTimer=undefined},delay)}
function openPlayerDrawer(id:PlayerId){
 if(playerDrawerCloseTimer)window.clearTimeout(playerDrawerCloseTimer);playerDrawer.classList.remove('is-closing');
 const player=match.state.players.find(candidate=>candidate.id===id);if(!player)return;
 const names=playerNames();
 const archetype=match.lineup[id]?ARCHETYPES[match.lineup[id]!] : PLAYER_PROFILES[id];
 const portrait=byId('player-drawer-portrait') as HTMLImageElement;
 portrait.alt=`Close-up of ${names[id]}`;
 try{profilePortraits??=new AvatarThumbnails(512);portrait.src=profilePortraits.get(scene.getPlayerAppearance(id),'profile');portrait.parentElement!.hidden=false}catch{portrait.parentElement!.hidden=true}
 byId('edit-player-design').hidden=id!=='you';
 byId('player-drawer-title').textContent=names[id];byId('player-drawer-description').textContent=archetype.description;
 byId('player-drawer-meta').innerHTML=`<span>${player.team==='home'?'Your team':'Opponent'}</span><span>${archetype.name}</span><span>${player.handedness[0].toUpperCase()+player.handedness.slice(1)}-handed</span>`;
 byId('player-drawer-skills').innerHTML=Object.entries(player.skills).map(([skill,value])=>`<div><dt>${skill}</dt><dd><meter min="0" max="100" value="${value}" aria-label="${skill} ${value} out of 100"></meter><strong>${value}</strong></dd></div>`).join('');
 if(!playerDrawer.open)playerDrawer.showModal();
}
function closePlayerDrawer(){if(!playerDrawer.open||playerDrawer.classList.contains('is-closing'))return;playerDrawer.classList.add('is-closing');const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;playerDrawerCloseTimer=window.setTimeout(()=>{playerDrawer.close();playerDrawer.classList.remove('is-closing');playerDrawerCloseTimer=undefined},delay)}
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
  label.htmlFor=`substitute-${id}`;label.textContent=slotLabels[id];select.id=label.htmlFor;select.setAttribute('aria-label',`Player for ${slotLabels[id]}`);
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
function openSettings(){renderSettingsPlayers();if(settingsCloseTimer)window.clearTimeout(settingsCloseTimer);settingsDialog.classList.remove('is-closing');if(!settingsDialog.open)settingsDialog.showModal()}
function closeSettings(){if(!settingsDialog.open||settingsDialog.classList.contains('is-closing'))return;settingsDialog.classList.add('is-closing');const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:180;settingsCloseTimer=window.setTimeout(()=>{settingsDialog.close();settingsDialog.classList.remove('is-closing');settingsCloseTimer=undefined},delay)}
byId('open-settings').addEventListener('click',openSettings);
byId('close-settings').addEventListener('click',closeSettings);
settingsDialog.addEventListener('click',event=>{if(event.target===settingsDialog)closeSettings()});
settingsDialog.addEventListener('cancel',event=>{event.preventDefault();closeSettings()});
byId('close-shot-drawer').addEventListener('click',closeShotDrawer);
shotDrawer.addEventListener('click',event=>{if(event.target===shotDrawer)closeShotDrawer()});
shotDrawer.addEventListener('cancel',event=>{event.preventDefault();closeShotDrawer()});
byId('close-player-drawer').addEventListener('click',closePlayerDrawer);
byId('edit-player-design').addEventListener('click',()=>{if(playerDrawerCloseTimer)window.clearTimeout(playerDrawerCloseTimer);playerDrawer.close();playerDrawer.classList.remove('is-closing');creator.editPlayer(match.playerDesign)});
playerDrawer.addEventListener('click',event=>{if(event.target===playerDrawer)closePlayerDrawer()});
playerDrawer.addEventListener('cancel',event=>{event.preventDefault();closePlayerDrawer()});
try{const saved=JSON.parse(localStorage.getItem('pickle-rpg-controls-v1')??'null');if(saved&&typeof saved==='object'){if(typeof saved.guides==='boolean')guides=saved.guides;if(typeof saved.showPlayerNames==='boolean')showPlayerNames=saved.showPlayerNames;if(typeof saved.resultTimer==='boolean')resultTimer=saved.resultTimer;if(typeof saved.partnerAutonomy==='boolean')match.partnerAutonomy=saved.partnerAutonomy;if(typeof saved.cameraDistance==='number'&&Number.isFinite(saved.cameraDistance)&&saved.cameraDistance>=0&&saved.cameraDistance<=100)cameraDistance=saved.cameraDistance}}catch{/* Defaults remain usable when storage is unavailable or invalid. */}
(byId('guides') as HTMLInputElement).checked=guides;byId('guides-state').textContent=guides?'On':'Off';(byId('partner-autonomy') as HTMLInputElement).checked=match.partnerAutonomy;byId('partner-autonomy-state').textContent=match.partnerAutonomy?'On':'Off';scene.setGuides(guides);
(byId('show-player-names') as HTMLInputElement).checked=showPlayerNames;byId('show-player-names-state').textContent=showPlayerNames?'On':'Off';scene.setPlayerNames(showPlayerNames);
byId('show-player-names').addEventListener('change',e=>{showPlayerNames=(e.target as HTMLInputElement).checked;byId('show-player-names-state').textContent=showPlayerNames?'On':'Off';scene.setPlayerNames(showPlayerNames);saveControls()});
(byId('result-timer') as HTMLInputElement).checked=resultTimer;byId('result-timer-state').textContent=resultTimer?'On':'Off';
byId('result-timer').addEventListener('change',e=>{resultTimer=(e.target as HTMLInputElement).checked;byId('result-timer-state').textContent=resultTimer?'On':'Off';resultElapsed=0;resultExpired=false;saveControls()});
function saveControls(){try{localStorage.setItem('pickle-rpg-controls-v1',JSON.stringify({speed,guides,showPlayerNames,resultTimer,cameraDistance,partnerAutonomy:match.partnerAutonomy,playbackBase:1.5,speedVersion:2}))}catch{/* Settings still apply for this visit. */}}
scene.setCamera(100-cameraDistance);
byId('guides').addEventListener('change',e=>{guides=(e.target as HTMLInputElement).checked;byId('guides-state').textContent=guides?'On':'Off';scene.setGuides(guides);saveControls()});
byId('partner-autonomy').addEventListener('change',e=>{match.partnerAutonomy=(e.target as HTMLInputElement).checked;byId('partner-autonomy-state').textContent=match.partnerAutonomy?'On':'Off';lastUI='';saveControls();updateUI()});
document.addEventListener('keydown',event=>{if(settingsDialog.open||creator.dialog.open||gameEnd.open)return;if(match.replayIndex!==null){if(event.key==='Escape'){event.preventDefault();closeReplay()}else if(event.code==='Space'&&!(event.target instanceof HTMLElement&&event.target.closest('button,input'))){event.preventDefault();match.replayPlaying?match.pauseReplay():match.resumeReplay()}return;}if(event.target instanceof HTMLElement&&event.target.closest('button, input, select, textarea, a'))return;if(event.code==='Space'){event.preventDefault();match.state.phase==='decision'?submit():match.state.phase==='complete'?(!match.scoring.winner?(match.nextPoint(),lastUI='',updateUI()):reset()):pause()}if(event.key.toLowerCase()==='r')reset()});
function updateUI(){updateMatchUI()}

function choiceButton(intent:ShotIntent,index:number){const copy=choiceCopy(intent);return `<button class="shot-button match-choice" data-choice="${index}" data-traits="${shotTraits(intent)}">${shotIcon(intent,index)}<span><strong>${copy.name}</strong><span class="choice-target">${copy.detail}</span>${match.shot.actor==='partner'&&match.recommendationType===intent.type?'<small>Finn recommends</small>':''}</span><span aria-hidden="true">↗</span></button>`}
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
 const s=match.state,score=match.scoring,key=`match:${match.point}:${s.phase}:${s.shotIndex}:${s.paused}:${match.receptionDecision}:${score.call}:${score.winner}:${match.brainStatus}:${match.thinking}:${match.practice}:${match.variation}:${match.customBusy}:${match.customStatus}:${match.replayIndex===null?'live':match.replayPlaying?'replaying':'scrubbing'}`;if(key===lastUI)return;lastUI=key;
 byId('score-home').textContent=String(score.score.home);byId('score-away').textContent=String(score.score.away);
 const choiceEntries=match.availableIntents.map((intent,index)=>({intent,index})).filter(({intent})=>intent.source!=='text');
 const primaryChoices=choiceEntries,moreChoices:typeof choiceEntries=[];
 byId('shot-drawer-title').textContent=moreChoices[0]?.intent.type==='serve'?'More serves':'More options';
 byId('shot-drawer-description').textContent=moreChoices[0]?.intent.type==='serve'?'Try a less common serve for a different look.':'Other playable choices for this contact.';
 byId('more-options-list').innerHTML=moreChoices.map(({intent,index})=>choiceButton(intent,index)).join('');
 if(!moreChoices.length&&shotDrawer.open)closeShotDrawer();
 const receptionDecision=match.manualReceptionDecision,receptionChoices=match.displayedReceptionOptions,playerDecision=s.phase==='decision'&&s.possession==='home'&&!(match.partnerAutonomy&&s.currentHitter==='partner');
 const finalShotByHome=match.shot.actor==='you'||match.shot.actor==='partner';
 const endTitle=s.phase==='complete'&&s.result?.reason==='net'?(finalShotByHome?'Hit the net! Side out!':'They hit the net! Point won!'):s.phase==='complete'?'Point complete.':null;
 const endDetail=s.phase==='complete'&&s.result?.reason==='net'?(finalShotByHome?'The ball caught the net and dropped on your side.':'The opponent’s ball caught the net and dropped on their side.'):`${s.result?.winner==='home'?'Your team':'Opponents'} won the rally: ${s.result?.reason.replaceAll('-',' ')}.`;
 const courtResult=pointResultCopy();if(courtResult){byId('court-result-title').textContent=courtResult.title;byId('court-result-detail').textContent=courtResult.detail}
 
 byId('match-panel').innerHTML=`<section class="match-settings"><h3>Make it your game.</h3><div class="eyebrow">${match.practice?'PATTERN PRACTICE · UNSCORED':'FREE PLAY · SIDE-OUT SCORING'}</div><label for="practice-pattern">Practice focus</label><select id="practice-pattern"><option value="">Free play · no lesson</option>${PATTERNS.map(p=>`<option value="${p.id}" ${match.practice===p.id?'selected':''}>${p.name}</option>`).join('')}</select><button id="start-pattern">Start selected practice / game</button>${match.practice?`<p>${PATTERNS.find(p=>p.id===match.practice)!.cue} · Variation ${match.variation+1}</p>`:''}<h2>${score.score.home} : ${score.score.away}</h2>${match.practice?'<p>Mid-rally practice · opening bounces already satisfied.</p>':`<p>Serve call <strong>${score.call}</strong> · ${score.server==='you'?'You':score.server==='partner'?'Finn':score.server==='opponent-left'?'Jules':'Rio'} serving</p>`}<details><summary>Opponent brain</summary><label for="brain-mode">Decision engine</label><select id="brain-mode"><option value="local" ${match.brainMode==='local'?'selected':''}>Local adaptive</option><option value="llm" ${match.brainMode==='llm'?'selected':''}>LLM strategy · instant shots</option></select><label for="brain-personality">Personality</label><select id="brain-personality">${PERSONALITIES.map(p=>`<option ${match.personality===p?'selected':''}>${p}</option>`).join('')}</select><label for="brain-iq">Tactical intelligence</label><select id="brain-iq">${[.2,.5,.9].map(n=>`<option value="${n}" ${Math.abs(match.intelligence-n)<.11?'selected':''}>${n===.2?'Basic':n===.5?'Aware':'Adaptive'}</option>`).join('')}</select><button id="apply-brain">Apply for next opponent contact</button><p id="brain-status">${match.brainStatus}</p><p>Observed ${match.memory.summary().samples} recent team shots. Physical ratings are unchanged.</p></details><details><summary>Choose archetypes · starts a new game</summary>${Object.entries(PLAYER_PROFILES).map(([id,p])=>`<label for="profile-${id}">${p.name}</label><select id="profile-${id}" ${match.getPlayerDesign(id as PlayerId)?'disabled':''}><option value="">${match.getPlayerDesign(id as PlayerId)?'Selected player skills':'Original profile'}</option>${Object.entries(ARCHETYPES).map(([key,a])=>`<option value="${key}" ${match.lineup[id as keyof typeof PLAYER_PROFILES]===key?'selected':''}>${a.name}</option>`).join('')}</select>`).join('')}<button id="apply-lineup" class="shot-button">Start game with these profiles</button></details><p class="guided-note">${match.partnerAutonomy?'Your contacts wait for you; Finn chooses his own shots.':'Every team contact waits for your choice.'}</p><details><summary>Player skills · 0–100</summary>${Object.entries(PLAYER_PROFILES).map(([id,base])=>{const custom=match.getPlayerDesign(id as PlayerId);const p={...base,...(match.lineup[id as keyof typeof PLAYER_PROFILES]?ARCHETYPES[match.lineup[id as keyof typeof PLAYER_PROFILES]!]:{}),name:custom?escapeText(custom.name):base.name,...(custom?{skills:custom.skills,description:'Your saved Player Design skills.'}:{})};return `<h3>${p.name}</h3><p>${p.description}</p><dl class="player-skills">${Object.entries(p.skills).map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>`}).join('')}<p class="guided-note">Prototype attributes, not DUPR ratings. Shot skills affect execution; movement affects reach; hands affects fast volleys.</p></details></section><section class="match-play primary-choices${s.phase==='complete'?' point-result':''}"><h3>${endTitle??(receptionDecision?'Attack the pop-up?':playerDecision?'Choose your shot':s.currentHitter==='partner'&&match.partnerAutonomy?escapeText(playerNames().partner)+'’s play':'Read the court.')}</h3>${s.phase==='flight'&&match.shot.feedback&&!receptionDecision?`<p>Last execution · skill ${match.shot.feedback.skill} · quality ${(match.shot.feedback.quality*100).toFixed(0)}% · ${match.shot.feedback.difficulty.join(', ')} · deviation ${match.shot.feedback.deviation.toFixed(2)} m${match.shot.feedback.mishit?' · mishit':''}</p>`:''}${receptionDecision?'<p>The ball is crossing the net high enough to take in the air.</p>':s.phase==='complete'?`<p class="point-result-detail">${endDetail}</p>`:match.shot.intent.type==='serve'?'':`<p>${match.shot.description}</p>`}${s.phase==='complete'?(score.winner?'<button id="new-game" class="shot-button">New game ↗</button>':''):receptionDecision?'<div class="reception-actions"><button id="smash-popup" class="shot-button"><strong>Smash it</strong><span>Take it before the bounce</span></button><button id="let-bounce" class="shot-button secondary"><strong>Let it bounce</strong><span>Play it after the bounce</span></button></div>':playerDecision?`${primaryChoices.map(({intent,index})=>choiceButton(intent,index)).join('')}${moreChoices.length?'<button id="more-options" class="more-options-link" aria-haspopup="dialog">More options <span aria-hidden="true">→</span></button>':''}`:`<p>${match.thinking?(s.currentHitter==='partner'?escapeText(playerNames().partner)+' is thinking…':'Opponent thinking…'):s.paused?'Paused':'Rally in progress'} · ${s.shotHistory.length} shots</p>`}</section>`;

 if(receptionDecision){
  const primary=byId('match-panel').querySelector<HTMLElement>('.primary-choices')!;
  primary.querySelector('h3')!.textContent='Choose your shot';
  const copy=primary.querySelector('p');if(copy)copy.textContent='The ball is crossing the net. Pick one move.';
  primary.querySelector('.reception-actions')!.innerHTML=receptionChoices.map((option,index)=>`<button class="shot-button match-choice reception-shot" data-reception="${index}" data-traits="${shotTraits(option.intent)}">${shotIcon(option.intent,index)}<span><strong>${SHOT_FAMILIES[option.intent.type].name} <span class="reception-timing">${option.timing==='air'?'Before bounce':'After bounce'}</span></strong><span class="choice-target">${targetLabel(option.intent.target)} · ${option.timing==='air'?'before bounce':'after bounce'}</span></span><span aria-hidden="true">↗</span></button>`).join('');
 }
 const shotSection=byId('match-panel').querySelector<HTMLElement>('.primary-choices')!;
 if(playerDecision||receptionDecision){
  const heading=shotSection.querySelector('h3')!;
  const intro=document.createElement('div');intro.className='shot-picker-heading';
  intro.innerHTML=`<span class="shot-picker-mark">${pickleballMark}</span><h3>${heading.textContent}</h3>${receptionDecision?'':'<span class="shot-preview-hint" aria-hidden="true"></span>'}`;
  heading.replaceWith(intro);
  const strip=document.createElement('div');strip.className='shot-strip';strip.setAttribute('role','group');strip.setAttribute('aria-label','Available shots');
  shotSection.querySelectorAll<HTMLButtonElement>('.match-choice').forEach(button=>{
   const detail=button.querySelector('.choice-target')?.textContent??'';
   const name=button.querySelector('strong')?.textContent??'';
   button.title=`${name} · ${detail} · ${button.dataset.traits??''}`;button.setAttribute('aria-label',button.title);strip.append(button);
  });
  shotSection.querySelector('.reception-actions')?.remove();shotSection.append(strip);
 }
 if(playerDecision||receptionDecision){
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
 byId('new-game')?.addEventListener('click',advancePoint);
 document.querySelectorAll<HTMLButtonElement>('.reception-shot').forEach(button=>button.addEventListener('click',()=>{const option=receptionChoices[Number(button.dataset.reception)];if(option)match.chooseReceptionIntent(option);lastUI='';updateUI()}));
 byId('more-options')?.addEventListener('click',openShotDrawer);
 document.querySelectorAll<HTMLButtonElement>('.match-choice:not(.reception-shot)').forEach(button=>{
  const intent=match.availableIntents[Number(button.dataset.choice)];
  const preview=()=>{const shot=match.previewIntent(intent);if(shot){scene.setShotPreview(shot);button.classList.add('is-previewing')}};
  const clear=()=>{scene.setShotPreview(null);button.classList.remove('is-previewing')};
  let hold:number|undefined,held=false,suppressClick=false,startX=0,startY=0;
  button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')preview()});
  button.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')clear()});
  button.addEventListener('focus',preview);button.addEventListener('blur',clear);
  button.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')return;held=false;startX=event.clientX;startY=event.clientY;hold=window.setTimeout(()=>{held=true;preview()},260)});
  button.addEventListener('pointermove',event=>{if(hold&&Math.hypot(event.clientX-startX,event.clientY-startY)>9){clearTimeout(hold);hold=undefined}});
  const release=()=>{if(hold)clearTimeout(hold);hold=undefined;if(held){suppressClick=true;held=false;clear();window.setTimeout(()=>suppressClick=false,350)}};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);
  button.addEventListener('click',event=>{if(suppressClick){event.preventDefault();return}clear();if(shotDrawer.open)closeShotDrawer();match.submitIntent(intent);lastUI='';updateUI()});
 });
}
const gameEnd=document.createElement('dialog');gameEnd.id='game-end';gameEnd.setAttribute('aria-labelledby','game-end-title');
gameEnd.innerHTML=`<div class="game-end-card"><div class="game-end-kicker">GARDEN COURT · GAME COMPLETE</div><div class="game-end-emblem" aria-hidden="true">✦</div><p class="game-end-label">THE WINNERS</p><h1 id="game-end-title"></h1><p class="game-end-subtitle">A game worth playing. A win worth celebrating.</p><div class="game-end-score" aria-label="Final score"><div><strong id="game-end-home-score"></strong><span id="game-end-home-names"></span></div><span class="game-end-dash" aria-hidden="true">–</span><div><strong id="game-end-away-score"></strong><span id="game-end-away-names"></span></div></div><p class="game-end-rule">FINAL SCORE · FIRST TO 11, WIN BY 2</p><div class="game-end-actions"><button id="game-end-replay" type="button">▶ Full Game Replay</button><button id="game-end-new" type="button">New Game ↗</button></div></div>`;
document.body.append(gameEnd);
gameEnd.addEventListener('cancel',event=>event.preventDefault());
byId('game-end-new').addEventListener('click',()=>{gameEnd.close();match.reset();showPanel('play');lastUI='';updateUI()});
byId('game-end-replay').addEventListener('click',()=>{gameEnd.close();match.startGameReplay();showPanel('play');lastUI='';updateUI();replayOverlay.hidden=false;byId('replay-position').focus()});
function syncGameEnd(){
 const visible=!!match.scoring.winner&&match.replayIndex===null&&!creator.dialog.open&&!settingsDialog.open&&!playerDrawer.open;
 if(!visible){if(gameEnd.open)gameEnd.close();return}
 const names=playerNames(),home=`${names.you} & ${names.partner}`,away=`${names['opponent-left']} & ${names['opponent-right']}`;
 byId('game-end-title').textContent=`${match.scoring.winner==='home'?home:away} win!`;
 byId('game-end-home-names').textContent=home;byId('game-end-away-names').textContent=away;
 byId('game-end-home-score').textContent=String(match.scoring.score.home);byId('game-end-away-score').textContent=String(match.scoring.score.away);
 gameEnd.dataset.winner=match.scoring.winner!;
 (byId('game-end-replay') as HTMLButtonElement).disabled=!match.recordedPoints;
 if(!gameEnd.open){gameEnd.showModal();byId('game-end-new').focus()}
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
let resultEngine:Match['engine']|null=null,resultElapsed=0,resultExpired=false;
function advancePoint(){
 if(match.state.phase!=='complete'||match.replayIndex!==null)return;
 match.scoring.winner?match.reset():match.nextPoint();byId('court-result').hidden=true;lastUI='';updateUI();
}
byId('next-point').addEventListener('click',advancePoint);
byId('open-replay').addEventListener('click',()=>{
 if(match.state.phase!=='complete')return;
 match.startReplay();byId('court-result').hidden=true;lastUI='';updateUI();replayOverlay.hidden=false;byId('replay-position').focus();
});
function syncPointResult(dt:number){
 const banner=byId('court-result');
 if(match.scoring.winner){banner.hidden=true;document.querySelector('.court-wrap')?.classList.remove('has-result');return}
 if(match.state.phase!=='complete'){resultEngine=null;resultElapsed=0;resultExpired=false;banner.hidden=true;document.querySelector('.court-wrap')?.classList.remove('has-result');return}
 if(resultEngine!==match.engine){resultEngine=match.engine;resultElapsed=0;resultExpired=false}
 const visible=(!resultTimer||!resultExpired)&&match.replayIndex===null&&document.body.dataset.panel==='play'&&!settingsDialog.open&&!creator.dialog.open&&!playerDrawer.open&&!document.hidden;
 banner.hidden=!visible;document.querySelector('.court-wrap')?.classList.toggle('has-result',visible);
 if(!visible)return;
 byId('next-point').textContent=match.scoring.winner?'New game ↗':'Next point ↗';
 if(!resultTimer){byId('point-countdown').textContent='';return}
 resultElapsed+=dt;
 const remaining=Math.max(0,Math.ceil(10-resultElapsed));
 byId('point-countdown').textContent=match.scoring.winner?`Closing in ${remaining}…`:`Next point in ${remaining}…`;
 if(resultElapsed>=10){resultExpired=true;banner.hidden=true;document.querySelector('.court-wrap')?.classList.remove('has-result');if(!match.scoring.winner)advancePoint()}
}

updateUI();let previous:number|undefined;function frame(now:number){
 const realDt=previous===undefined?0:Math.max(0,Math.min((now-previous)/1000,.1)),dt=realDt*speed;if(!creator.dialog.open)match.update(match.replayPlaying?realDt:dt);previous=now;updateUI();syncPointResult(realDt);syncGameEnd();syncVoice();
 const replay=match.replayView();syncReplayUI(replay);scene.setGuides(guides&&!replay);scene.render(replay?.state??match.state,now/1000,replay?.shot??match.shot,!match.practice&&!replay?match.scoring.call:null);targetPicker.sync(document.body.dataset.panel==='play'&&!settingsDialog.open&&!creator.dialog.open);requestAnimationFrame(frame)
}requestAnimationFrame(frame);
// Optional browser-native tools use the exact same validated simulation entry point.
const context=(document as Document & {modelContext?:{registerTool:(tool:unknown)=>Promise<void>|void}}).modelContext;
if(context?.registerTool){for(const tool of [{name:'read_pickleball_state',description:'Read the current match and available shot intent.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>structuredClone({match:{score:match.scoring,point:match.point},state:match.snapshot(),availableIntents:match.availableIntents})},{name:'play_pickleball_shot',description:'Submit a shot intent during a decision pause.',inputSchema:{type:'object',properties:{intent:SHOT_INTENT_SCHEMA},required:['intent'],additionalProperties:false},execute:(input:{intent:unknown})=>{if(match.state.possession!=='home')throw new Error('Opponent is choosing.');match.submitIntent(input.intent);updateUI();return structuredClone(match.state)}}]){try{Promise.resolve(context.registerTool(tool)).catch(console.warn)}catch(error){console.warn(error)}}}
