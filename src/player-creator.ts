import {focusView,showViewDialog} from './view-focus';
import {accountSkillBudget} from './account-skill-budget';
import {canAddToRoster} from './roster-account';
import {allocateArea,allocateDetail,areaPoints,usedSkillPoints,normalizeSkillBudget,fitsSkillBudget,randomBudgetSkills,skillCap} from './skill-budget';
import {saveCommunitySkills} from './community-players';
import {randomPlayerName,randomPlayerCatchphrase} from './player-identity-randomizer';
import {openGameSurface} from './game-surface';
import {appNavigation,type NavigationPage} from './app-navigation';
import {teamDisplayName} from './team-name';
import {ownedRosterPlayers,setOwnedPlayerAdded} from './roster-membership';
import {ARCHETYPES} from './engine/player-profiles';
import {attachPlayerDetails} from './player-details';
import {CommunitySection} from './community-section';
import {isCommunityPlayer} from './community-players';
import {fillPlayerCard,playerRecord} from './player-card';
import type {HistoryMatch} from './player-history';
import {SUMMARY_SKILLS,setSummarySkillLevel,summarizeSkills,skillLevel} from './player-skill-summary';
import {applyPresentation} from './player-looks';
import {AvatarPreview,AvatarThumbnails,LOOKS} from './avatar-preview';
import {SKILLS} from './engine/model';
import {APPEARANCE_OPTIONS,PLAYER_STORAGE_KEY,newPlayer,parseLibrary,savePlayer,deletePlayer,type DesignedPlayer,type PlayerLibrary,type Appearance} from './player-design';
import type {CloudSaveState,LibraryChange} from './cloud-players';
import {browserStorage} from './browser-storage';
import './player-creator.css';
import './roster.css';
const iconPaths:Record<string,string>={
 facialHair:'M5 9v5l3 6h8l3-6V9M8 11l4-2 4 2M10 14h4',
 hairStyle:'M5 15V9a7 7 0 0 1 14 0v6M5 10c4 0 5-4 5-4s3 4 9 4M7 15v4m10-4v4',
 hair:'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z',skin:'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z',
 face:'M5 10a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm3 1h1m6 0h1m-7 5q3 2 6 0',
 glasses:'M2 8h8v7H3Zm12 0h8l-1 7h-7ZM10 10h4',hat:'M4 14V11a8 8 0 0 1 16 0v3ZM4 14l-3 3h16l3-3',
 top:'m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4q-4 4-8 0Z',
 bottom:'M7 3h10l4 18H3Zm5 7v11',shoes:'m4 8 4 5 5 2h6l3 3v3H2V10Z',paddle:'M8 2h8l3 4v9l-5 4v3h-4v-3l-5-4V6Z',accessory:'M9 2h6v5H9Zm-1 5h8v10H8Zm1 10h6v5H9Z',style:'M5 12v9M12 7v14M19 2v19'};
const rowIcon=(key:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[key==='expression'?'face':key==='paddleShape'?'paddle':key==='shoeStyle'?'shoes':key==='glassesColor'?'glasses':key]??iconPaths.hair}"/></svg>`;
const outfitColors=['#fa6796','#4285df','#efbf43','#e85860','#ac7bd8','#36936c','#424247','#fff7ef','#203e6a','#ed8d3c','#80cdd2','#754732','#a6c64c'];
const equipmentColors=['#315d58','#f56794','#41617a','#303d3e','#ece4ce','#ffffff','#17191e','#ed8d3c','#efbf43','#ac7bd8','#e85860','#4285df','#80cdd2'];
const labels:Record<string,string>={jersey:'T-shirt',backwards:'Cap back',sport:'Sport shades','side-part':'Side part','pleated-skirt':'Pleated skirt','long-shorts':'Long shorts','high-top':'High tops','slip-on':'Slip-ons','cat-eye':'Cat eye'};
const title=(text:string)=>labels[text]??text.charAt(0).toUpperCase()+text.slice(1);
const summaryIcons={Power:'ϟ',Control:'◎',Speed:'➟',Hands:'✋',Defense:'⛨'} as const;
const skillHelp:Record<typeof SKILLS[number],string>={serve:'Start the point with reliable placement.',return:'Control the return after the bounce.',drive:'Execute fast, attacking groundstrokes.',drop:'Land a soft shot in the kitchen.',dink:'Control soft exchanges at the net.',reset:'Take pace off an incoming attack.',volley:'Strike cleanly before the bounce.',counter:'Redirect an attack into pressure.',overhead:'Finish high balls with control.',movement:'Reach more balls around the court.',hands:'Handle fast exchanges at the net.'};

export class PlayerCreator {
 readonly dialog=document.createElement('dialog');
 navigate:((page:NavigationPage,href:string)=>void)|null=null;
 beforeSave:(player:DesignedPlayer)=>Promise<boolean>=async()=>true;
 afterSave:(player:DesignedPlayer)=>boolean=()=>false;
 activateOnSave=false;
 private budget=35;private budgetReady=false;
 private creatorName='You';private teamName='';
 saveTeamName:(name:string)=>Promise<string>=async()=>{throw new Error('Connect to your account to save a team name.')};
 setTeamName(name?:string){this.teamName=name?.trim()||'';this.updateTeamHeading();}
 private updateTeamHeading(){const name=teamDisplayName(this.creatorName,this.teamName);this.el('#roster-title').textContent=`${name}’s Roster`;}

 setCreatorName(name?:string){const next=name?.trim()||'You';if(next===this.creatorName)return;this.creatorName=next;this.updateTeamHeading();if(this.dialog.open&&this.dialog.dataset.view==='roster')this.showRoster();}
 loadHistory:()=>Promise<HistoryMatch[]>=async()=>{throw new Error('History unavailable')};
 private community=new CommunitySection(()=>{if(this.dialog.open&&this.dialog.dataset.view==='roster')this.showRoster()},player=>this.switchDraft(()=>{this.loadDraft(player);this.showEditor()}));
 private rosterThumbnails:AvatarThumbnails|null=null;
 private thumbnails:AvatarThumbnails|null=null;private thumbnailsReady=false;
 private library:PlayerLibrary={version:1,activeId:null,players:[]};private draft=newPlayer();private baseline='';private preview:AvatarPreview|null=null;private previewFailed=false;private loadError='';private pending:(()=>void)|null=null;
 constructor(private onPlay:(player:DesignedPlayer)=>void,private onDelete:(id:string)=>void=()=>{},private onLibraryChange:(library:PlayerLibrary,change:LibraryChange)=>void=()=>{}){
  try{this.library=parseLibrary(browserStorage.getItem(PLAYER_STORAGE_KEY))}catch{this.loadError='Saved players could not be read. Saving is disabled to protect your existing roster.'}
  const active=this.library.players.find(p=>p.id===this.library.activeId);
  if(active)this.draft=structuredClone(active);this.baseline=JSON.stringify(this.draft);
  this.dialog.id='player-creator';this.dialog.setAttribute('aria-labelledby','creator-title');
  this.dialog.innerHTML=`<section class="player-roster-page" aria-labelledby="roster-title"><div class="roster-top"><div class="roster-title-row"><h1 id="roster-title">Your Roster</h1><button type="button" class="roster-team-edit" data-edit-team aria-label="Edit team name" title="Edit team name"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5M4 15 16 3a2.1 2.1 0 0 1 5 5L9 20l-6 1 1-6Z"/></svg></button></div></div><form class="roster-team-form" data-team-form hidden><label for="roster-team-name">Team name</label><p>Leave blank to use your account player name.</p><input id="roster-team-name" type="text" maxlength="48" autocomplete="off"><div><button type="submit">Save team name</button><button type="button" data-cancel-team>Cancel</button></div><p data-team-status role="status"></p></form><div class="roster-actions"><button type="button" data-create-player>+ Create new player</button></div><p data-roster-status role="status"></p><section data-saved-section id="roster-player-results"><div data-saved-roster class="roster-grid"></div></section><div data-community-section></div><nav class="roster-pagination" data-roster-pagination aria-label="Available players pages" hidden><button type="button" data-roster-prev aria-label="Previous page">‹</button><span data-roster-page-label role="status"></span><button type="button" data-roster-next aria-label="Next page">›</button></nav></section><div class="creator-topline"><button type="button" data-back-roster>← Roster</button></div>
  <div class="creator-layout"><section class="creator-stage" aria-label="Avatar preview"><div class="creator-heading"><h2 id="creator-title">Create Your Player</h2></div>

  <div class="creator-identity"><div class="creator-identity-field"><label for="creator-name">PLAYER NAME</label><div class="creator-identity-input"><input id="creator-name" type="text" inputmode="text" enterkeyhint="done" autocapitalize="words" maxlength="24" autocomplete="off" placeholder="Name your player"><button type="button" data-randomize-name aria-label="Shuffle player name" title="Shuffle player name">⤨</button></div></div>
  <label class="creator-public-control"><input id="creator-public" type="checkbox"><span>Anyone can use<br>this player</span></label>
  <div class="creator-identity-field creator-catchphrase-label"><label for="creator-catchphrase">CATCHPHRASE</label><div class="creator-identity-input"><input id="creator-catchphrase" type="text" inputmode="text" enterkeyhint="done" maxlength="30" autocomplete="off"><button type="button" data-randomize-catchphrase aria-label="Shuffle catchphrase" title="Shuffle catchphrase">⤨</button></div></div>
  </div>
  <div class="creator-tabs" role="tablist" aria-label="Player controls"><button type="button" role="tab" id="appearance-tab" aria-controls="appearance-panel" aria-selected="true" data-tab="appearance">${rowIcon('top')} Appearance</button><button type="button" role="tab" id="skills-tab" aria-controls="skills-panel" aria-selected="false" tabindex="-1" data-tab="skills">${rowIcon('style')} Skills</button></div>
  <div class="creator-preview"></div><div class="creator-plinth"></div>
  <div class="creator-stage-bottom"><button type="button" data-randomize aria-label="Shuffle appearance and skills" title="Shuffle appearance and skills"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3.5-2 5-5m2-2c1.5-3 3-5 5-5h3m-4-4 4 4-4 4"/></svg></button></div><span data-preview-name class="sr-only"></span></section>
  <section class="creator-editor">
  <div id="appearance-panel" role="tabpanel" aria-labelledby="appearance-tab"><div class="creator-options">
  ${this.optionRow('hairStyle','Hair','⌁')}
  ${this.colorRow('hair','Hair Color',['#754732','#252429','#efc568','#b85b34','#814cac','#b8babc'])}
  ${this.optionRow('facialHair','Facial Hair','')}
  ${this.colorRow('facialHairColor','Facial Hair Color',['#754732','#252429','#efc568','#b85b34','#b8babc','#fff7ef'])}
  ${this.colorRow('skin','Skin Tone',['#f0cbae','#e7af8c','#c8926e','#ad7553','#875338','#543c32'])}
  ${this.optionRow('glasses','Glasses','∞')}
  ${this.colorRow('glassesColor','Frame Color',equipmentColors)}
  ${this.colorRow('lensColor','Lens Color',['#b7dce5','#242630','#234650','#754732','#efbf43','#ac7bd8','#f56794','#4285df'])}
  ${this.optionRow('hat','Hat / Visor','⌒')}
  ${this.colorRow('hatColor','Hat Color',outfitColors)}
  ${this.optionRow('top','Top','♧')}
  ${this.colorRow('jersey','Top Color',outfitColors)}
  ${this.optionRow('bottom','Bottom','▱')}
  ${this.colorRow('bottomColor','Bottom Color',outfitColors)}
  ${this.optionRow('shoeStyle','Shoe Style','')}
  ${this.colorRow('shoes','Shoe Color',equipmentColors)}
  ${this.colorRow('paddle','Paddle Color',equipmentColors)}
  ${this.optionRow('accessory','Accessories','◇')}
  ${this.colorRow('accent','Accessories Color',['#315d58','#f56794','#41617a','#303d3e','#ece4ce'])}
  <div class="creator-option-row"><span class="row-label">Playing hand</span><div class="creator-choices hand-choices" role="group" aria-label="Playing hand">${(['right','left'] as const).map(hand=>`<button type="button" data-hand="${hand}" aria-label="${title(hand)}-handed" title="${title(hand)}-handed" aria-pressed="false"><img alt="" data-hand-thumb="${hand}"><span class="hand-badge" aria-hidden="true">${hand==='right'?'R':'L'}</span></button>`).join('')}</div></div>
  ${this.optionRow('expression','Expression','')}
  ${this.optionRow('paddleShape','Paddle Shape','')}
  </div></div>
  <div id="skills-panel" role="tabpanel" aria-labelledby="skills-tab" hidden><section class="skills-overview-card" aria-label="Player skill summary"><header><div><strong data-skills-name>Your player</strong><span>Skill profile</span></div><p class="skills-overview-rating" title="Game skill estimate, not an official DUPR rating"><span>DUPR</span><strong data-dupr></strong></p></header><section class="creator-budget" aria-label="Account skill budget"><strong data-budget-left></strong><span data-budget-used></span><progress data-budget-progress max="35" value="35"></progress><p data-budget-help></p><small>Earn 1 point per 10 completed online games, up to 45. Each player gets your full account budget.</small></section><div class="skills-overview-stats">${(['Power','Control','Speed','Hands','Defense'] as const).map(name=>`<div class="skills-overview-stat" data-stat="${name}"><span class="skills-overview-icon" aria-hidden="true">${summaryIcons[name]}</span><label for="summary-${name.toLowerCase()}">${name}</label><input id="summary-${name.toLowerCase()}" type="range" min="0" max="9" step="1" value="7" data-summary-control="${name}" title="Adjusts ${SUMMARY_SKILLS[name].map(title).join(', ')}"><output data-summary-value="${name}"></output></div>`).join('')}</div></section><details class="creator-published-build" hidden><summary>Community starting build · 35 points</summary><p>Choose the starting skills others receive. Your earned points stay with your account. Existing personal copies do not change.</p><p data-published-budget></p>${(Object.keys(SUMMARY_SKILLS) as (keyof typeof SUMMARY_SKILLS)[]).map(name=>`<label>${name}<input type="range" min="0" max="9" step="1" data-published-area="${name}"><output data-published-value="${name}"></output></label>`).join('')}</details><details class="skills-details"><summary><span>Fine-tune skills</span></summary><div class="skills-details-body"><p class="skill-budget-detail-help">Detailed skills use the same budget. Each area’s average rounds up to a whole point.</p><label for="creator-preset">Start from an archetype<select id="creator-preset"><option value="">Custom skills</option>${Object.entries(ARCHETYPES).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select></label><div class="creator-skills">${SKILLS.map(skill=>`<div class="creator-skill"><label for="skill-${skill}">${title(skill)}<output for="skill-${skill}" id="value-${skill}">70</output></label><input id="skill-${skill}" data-skill="${skill}" type="range" min="0" max="9" step="0.1" aria-describedby="help-${skill}"><small id="help-${skill}">${skillHelp[skill]}</small></div>`).join('')}</div></div></details></div>
  <div class="creator-delete-confirm" hidden><p data-delete-message></p><button type="button" data-cancel-delete>Keep player</button><button type="button" data-confirm-delete>Delete player permanently</button></div>
  <dialog class="creator-confirm" aria-labelledby="creator-confirm-title"><h2 id="creator-confirm-title">Save your player?</h2><p>You have unsaved changes. Save them before leaving, or discard them.</p><p data-confirm-status role="status"></p><div><button type="button" data-keep>Cancel</button><button type="button" data-discard>Discard</button><button type="button" data-save-leave>Save</button></div></dialog>
  <div class="creator-footer"><button type="button" data-delete hidden>Delete player</button><p data-status role="status"></p><div><button type="button" data-save>Save Player &nbsp; →</button></div></div></section></div>`;
  this.dialog.append(appNavigation('roster',(page,href)=>{
   if(page==='roster'){this.switchDraft(()=>this.showRoster());return;}
   this.switchDraft(()=>{if(this.navigate)this.navigate(page,href);else location.assign(href)});
  }));
  document.body.append(this.dialog);
  const teamForm=this.el('[data-team-form]') as HTMLFormElement,teamInput=this.input('#roster-team-name') as HTMLInputElement;
  const teamStatus=this.el('[data-team-status]');
  this.el('[data-edit-team]').onclick=()=>{teamInput.value=this.teamName;teamInput.placeholder=teamDisplayName(this.creatorName);teamStatus.textContent='';teamForm.hidden=false;teamInput.focus();};
  this.el('[data-cancel-team]').onclick=()=>{teamForm.hidden=true;focusView(this.dialog);};
  teamForm.onsubmit=event=>{event.preventDefault();const buttons=Array.from(teamForm.querySelectorAll('button'));buttons.forEach(button=>button.disabled=true);teamInput.disabled=true;teamStatus.textContent='Saving…';
   void this.saveTeamName(teamInput.value).then(name=>{this.setTeamName(name);teamForm.hidden=true;focusView(this.dialog);}).catch(error=>{teamStatus.textContent=(error as Error).message;}).finally(()=>{buttons.forEach(button=>button.disabled=false);teamInput.disabled=false;});
  };
  this.updateTeamHeading();
  this.dialog.append(this.el('.creator-confirm'));
  this.setupAppearancePages();
  this.el('[data-delete]').addEventListener('click',()=>{const player=this.library.players.find(p=>p.id===this.draft.id);if(!player||this.loadError)return;this.el('[data-delete-message]').textContent=`Delete “${player.name}”? This removes the saved player and any unsaved edits. This cannot be undone.`;(this.el('.creator-confirm') as HTMLDialogElement).close();this.pending=null;this.el('.creator-delete-confirm').hidden=false;focusView(this.dialog)});
  this.el('[data-cancel-delete]').addEventListener('click',()=>{this.el('.creator-delete-confirm').hidden=true;focusView(this.dialog)});
  this.el('[data-confirm-delete]').addEventListener('click',()=>this.removePlayer());
  this.el('[data-back-roster]').addEventListener('click',()=>this.switchDraft(()=>this.showRoster()));
  this.dialog.addEventListener('cancel',event=>{if(event.target!==this.dialog)return;event.preventDefault();this.switchDraft(()=>this.dialog.close());});
  for(const [selector,step] of [['[data-roster-prev]',-1],['[data-roster-next]',1]] as const)this.el(selector).addEventListener('click',()=>{this.rosterAddPage+=step;this.paginateRoster();});
  new MutationObserver(()=>this.paginateRoster()).observe(this.community.element,{childList:true,subtree:true});
  this.el('[data-create-player]').addEventListener('click',()=>this.switchDraft(()=>{this.loadDraft(this.shuffledPlayer());this.showEditor()}));
  this.el('[data-keep]').addEventListener('click',()=>{this.pending=null;(this.el('.creator-confirm') as HTMLDialogElement).close()});
  this.el('[data-discard]').addEventListener('click',()=>{const action=this.pending;this.pending=null;this.loadDraft(JSON.parse(this.baseline));(this.el('.creator-confirm') as HTMLDialogElement).close();action?.();});
  this.el('.creator-confirm').addEventListener('cancel',event=>{event.preventDefault();if((this.el('[data-save-leave]') as HTMLButtonElement).disabled)return;this.pending=null;(this.el('.creator-confirm') as HTMLDialogElement).close();});
  this.el('[data-save-leave]').addEventListener('click',async()=>{const action=this.pending;const buttons=Array.from(this.el('.creator-confirm').querySelectorAll('button'));buttons.forEach(b=>b.disabled=true);try{if(await this.save(false)){this.pending=null;(this.el('.creator-confirm') as HTMLDialogElement).close();action?.();}else this.el('[data-confirm-status]').textContent=this.el('[data-status]').textContent;}finally{buttons.forEach(b=>b.disabled=false);}});
  this.el('[data-randomize-name]').addEventListener('click',()=>{this.draft.name=randomPlayerName(this.draft.name);this.input('#creator-name').value=this.draft.name;this.updateCaption();this.changed();});
  this.el('[data-randomize-catchphrase]').addEventListener('click',()=>{this.draft.catchphrase=randomPlayerCatchphrase(this.draft.catchphrase);this.input('#creator-catchphrase').value=this.draft.catchphrase;this.changed();});
  this.input('#creator-name').addEventListener('click',()=>this.input('#creator-name').focus());
  this.input('#creator-name').addEventListener('keydown',event=>{if(event instanceof KeyboardEvent&&event.key==='Enter'){event.preventDefault();this.input('#creator-name').blur()}});
  this.input('#creator-public').addEventListener('change',()=>{this.draft.isPublic=(this.input('#creator-public') as HTMLInputElement).checked;if(this.draft.isPublic&&!this.draft.publishedSkills)this.draft.publishedSkills=normalizeSkillBudget(this.draft.skills,35);this.updateSummary();this.changed()});
  this.input('#creator-catchphrase').addEventListener('input',()=>{this.draft.catchphrase=this.input('#creator-catchphrase').value;this.changed()});
  this.input('#creator-name').addEventListener('input',()=>{this.draft.name=this.input('#creator-name').value;this.updateCaption();this.changed()});
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.key==='presentation')this.draft.appearance=applyPresentation(this.draft.appearance,button.dataset.choice as Appearance['presentation']);else Object.assign(this.draft.appearance,{[button.dataset.key!]:button.dataset.choice});this.syncAppearance();this.refreshPreview();this.changed()}));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-color]').forEach(control=>{const apply=()=>{if(this.draft.appearance[control.dataset.color as keyof Appearance]===control.value)return;Object.assign(this.draft.appearance,{[control.dataset.color!]:control.value});this.syncAppearance();this.refreshPreview();this.changed()};control.addEventListener('input',apply);control.addEventListener('change',apply)});
  this.el('[data-randomize]').addEventListener('click',()=>{this.draft.appearance=this.shuffledAppearance();this.draft.skills=this.shuffledSkills();this.syncAppearance();this.fillSkills();this.updateSummary();this.refreshPreview();this.changed()});
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-hand]').forEach(button=>button.addEventListener('click',()=>{this.draft.handedness=button.dataset.hand as 'left'|'right';this.syncAppearance();this.refreshPreview();this.changed()}));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-skill]').forEach(control=>control.addEventListener('input',()=>{const key=control.dataset.skill as typeof SKILLS[number];this.draft.skills=allocateDetail(this.draft.skills,key,Number(control.value)*10,this.budget);this.fillSkills();this.el(`#help-${key}`).textContent=skillLevel(this.draft.skills[key])+' · '+skillHelp[key];this.input('#creator-preset').value='';this.updateSummary();this.changed()}));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-summary-control]').forEach(control=>control.addEventListener('input',()=>{const name=control.dataset.summaryControl as keyof typeof SUMMARY_SKILLS;this.draft.skills=allocateArea(this.draft.skills,name,Number(control.value),this.budget);this.fillSkills();this.input('#creator-preset').value='';this.updateSummary();this.changed()}));
  this.input('#creator-preset').addEventListener('change',()=>{const preset=ARCHETYPES[this.input('#creator-preset').value as keyof typeof ARCHETYPES];if(preset){this.draft.skills=normalizeSkillBudget(preset.skills,this.budget);this.fillSkills();this.updateSummary();this.changed()}});
  this.dialog.querySelectorAll<HTMLInputElement>('[data-published-area]').forEach(input=>input.oninput=()=>{this.draft.publishedSkills=allocateArea(this.draft.publishedSkills??normalizeSkillBudget(this.draft.skills,35),input.dataset.publishedArea as keyof typeof SUMMARY_SKILLS,Number(input.value),35);this.updateSummary();this.changed();});
  const tabs=Array.from(this.dialog.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const selectTab=(tab:HTMLButtonElement)=>{for(const button of tabs){const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;this.el(`#${button.dataset.tab}-panel`).hidden=!selected}};
  for(const tab of tabs){tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=tabs[event.key==='Home'?0:event.key==='End'?1:tab===tabs[0]?1:0];selectTab(next);next.focus()}})}
  this.el('[data-save]').addEventListener('click',()=>this.save(false));
  this.fill();
 }
 private shuffledPlayer():DesignedPlayer{
  const player=newPlayer();
  player.name=randomPlayerName();player.catchphrase=randomPlayerCatchphrase();
  player.appearance=this.shuffledAppearance();
  player.skills=this.shuffledSkills();
  return player;
 }
 private shuffledSkills():DesignedPlayer['skills']{return randomBudgetSkills(this.budget);}
 private shuffledAppearance():Appearance{const pick=<T,>(items:readonly T[])=>items[Math.floor(Math.random()*items.length)];const look=pick(LOOKS);return {...look.appearance,expression:pick(APPEARANCE_OPTIONS.expression),paddleShape:pick(APPEARANCE_OPTIONS.paddleShape.filter(value=>value!=='rectangular'&&value!=='circular')),hairStyle:pick(APPEARANCE_OPTIONS.hairStyle),hat:pick(APPEARANCE_OPTIONS.hat.filter(value=>value!=='beanie'&&value!=='bucket')),glasses:pick(APPEARANCE_OPTIONS.glasses),glassesColor:pick(equipmentColors),shoeStyle:pick(APPEARANCE_OPTIONS.shoeStyle),top:pick(APPEARANCE_OPTIONS.top),bottom:pick(APPEARANCE_OPTIONS.bottom.filter(value=>value!=='skort')),accessory:pick(APPEARANCE_OPTIONS.accessory)};}
 private setupAppearancePages(){
  const track=this.el('.creator-options');
  const rows=Array.from(track.children);
  const groups=[{name:'Hair',rows:[0,1]},{name:'Facial Hair',rows:[2,3]},{name:'Expression',rows:[20]},{name:'Glasses',rows:[5,6,7]},{name:'Headwear',rows:[8,9]},{name:'Skin Tone',rows:[4]},{name:'Top',rows:[10,11]},{name:'Bottom',rows:[12,13]},{name:'Shoes',rows:[14,15]},{name:'Paddle & hand',rows:[21,16,19]},{name:'Accessories',rows:[17,18]}];
  const pages=groups.map((group,index)=>{
   const page=document.createElement('section');page.className='appearance-page';page.id=`appearance-page-${index}`;page.setAttribute('aria-label',group.name);
   for(const row of group.rows)page.append(rows[row]);track.append(page);return page;
  });
  const nav=document.createElement('nav');nav.className='appearance-pagination';nav.setAttribute('aria-label','Appearance pages');
  nav.innerHTML=`<div class="appearance-page-heading"><button type="button" data-page-prev aria-label="Previous appearance category">‹</button><div class="appearance-dots">${groups.map((group,index)=>`<button type="button" data-page="${index}" aria-label="${group.name}" aria-controls="appearance-page-${index}"><span></span></button>`).join('')}</div><button type="button" data-page-next aria-label="Next appearance category">›</button></div>`;
  this.el('#appearance-panel').prepend(nav);
  const dots=Array.from(nav.querySelectorAll<HTMLButtonElement>('[data-page]'));let current=0;
  const sync=()=>{
   pages.forEach((page,index)=>{page.hidden=index!==current;page.inert=index!==current;});
   dots.forEach((dot,index)=>dot.setAttribute('aria-current',String(index===current)));
   nav.querySelector<HTMLButtonElement>('[data-page-prev]')!.disabled=current===0;
   nav.querySelector<HTMLButtonElement>('[data-page-next]')!.disabled=current===groups.length-1;
  };
  const go=(index:number)=>{current=Math.max(0,Math.min(groups.length-1,index));sync();};
  dots.forEach((dot,index)=>dot.addEventListener('click',()=>go(index)));
  nav.querySelector('[data-page-prev]')!.addEventListener('click',()=>go(current-1));
  nav.querySelector('[data-page-next]')!.addEventListener('click',()=>go(current+1));
  let start:{x:number;y:number;id:number}|null=null,suppressClick=false;
  track.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;start={x:event.clientX,y:event.clientY,id:event.pointerId};suppressClick=false;});
  track.addEventListener('pointerup',event=>{
   if(!start||start.id!==event.pointerId)return;
   const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
   if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5){suppressClick=true;go(current+(dx<0?1:-1));}
  });
  track.addEventListener('pointercancel',()=>{start=null;});
  track.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
  sync();
 }
 private optionRow(key:keyof typeof APPEARANCE_OPTIONS,label:string,icon:string){return `<div class="creator-option-row"><span class="row-icon" aria-hidden="true">${rowIcon(key)}</span><span class="row-label">${label}</span><div class="creator-choices" role="group" aria-label="${label}">${APPEARANCE_OPTIONS[key].filter(value=>!['skort','beanie','bucket','rectangular','circular'].includes(value)).sort((a,b)=>Number(b==='none')-Number(a==='none')).map(value=>`<button type="button" data-key="${key}" data-choice="${value}" aria-label="${label}: ${title(value)}" aria-pressed="false" title="${title(value)}">${value==='none'?'<span class="none-icon">⊘</span>':`<img alt="" data-thumb-key="${key}" data-thumb-value="${value}">`}<span class="choice-label">${title(value)}</span></button>`).join('')}</div></div>`}
 private colorRow(key:keyof Appearance,label:string,colors:string[]){return `<div class="creator-option-row"><span class="row-icon" aria-hidden="true">${rowIcon(key)}</span><span class="row-label">${label}</span><div class="creator-choices color-choices" data-palette="${key}" role="group" aria-label="${label}">${colors.map(color=>`<button type="button" class="color-choice" data-key="${key}" data-choice="${color}" aria-label="${label}: ${color}" aria-pressed="false" style="--swatch:${color}"><span></span></button>`).join('')}<label class="custom-color" title="Custom ${label.toLowerCase()}"><input type="color" data-color="${key}" aria-label="Custom ${label.toLowerCase()}"><span>＋</span></label></div></div>`}
 private syncAppearance(){
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-hand]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hand===this.draft.handedness)));
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button=>button.setAttribute('aria-pressed',String(this.draft.appearance[button.dataset.key as keyof Appearance]===button.dataset.choice)));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-color]').forEach(input=>input.value=this.draft.appearance[input.dataset.color as keyof Appearance]);
 }
 private loadThumbnails(){if(this.thumbnailsReady)return;try{
  this.thumbnails??=new AvatarThumbnails();
  this.dialog.querySelectorAll<HTMLImageElement>('[data-hand-thumb]').forEach(img=>img.src=this.thumbnails!.get(LOOKS[0].appearance,`hand-${img.dataset.handThumb}`));
  this.dialog.querySelectorAll<HTMLImageElement>('[data-thumb-key]').forEach(img=>{let appearance={...LOOKS[0].appearance,[img.dataset.thumbKey!]:img.dataset.thumbValue!};if(img.dataset.thumbKey==='presentation')appearance=applyPresentation(appearance,img.dataset.thumbValue as Appearance['presentation']);if(['face','hairStyle','glasses','expression','facialHair'].includes(img.dataset.thumbKey!))appearance.hat='none';if(img.dataset.thumbKey==='facialHair'){appearance.hairStyle='short';appearance.glasses='none'}if(img.dataset.thumbKey==='expression')appearance.glasses='none';img.src=this.thumbnails!.get(appearance,img.dataset.thumbKey!)});
  this.dialog.querySelectorAll<HTMLImageElement>('[data-portrait]').forEach(img=>img.src=this.thumbnails!.get(LOOKS[Number(img.dataset.portrait)].appearance,'full'));this.thumbnailsReady=true;
 }catch{/* Text labels remain usable if thumbnail rendering is unavailable. */}}
 private updateSummary(){const {meters,estimatedDupr}=summarizeSkills(this.draft.skills);
  for(const [name,value] of Object.entries(meters)){
   this.dialog.querySelectorAll<HTMLOutputElement>(`[data-summary-value="${name}"]`).forEach(output=>output.textContent=String(Math.ceil(value/10))+'/10');
  }
  for(const [name,value] of Object.entries(meters)){const control=this.input(`[data-summary-control="${name}"]`);control.setAttribute('max',String(skillCap(this.budget)/10));control.value=String(Math.ceil(value/10));// Match the native thumb's travel: its center stays half a thumb inside each end.
   const fraction=Number(control.value)/Number(control.getAttribute('max'));
   control.style.setProperty('--value',`calc(${fraction*100}% + ${9-fraction*18}px)`);
   control.setAttribute('aria-valuetext',`${Math.ceil(value/10)} out of 10; adjusts ${SUMMARY_SKILLS[name as keyof typeof SUMMARY_SKILLS].map(title).join(', ')}`)}
  this.el('[data-dupr]').textContent=estimatedDupr.toFixed(2);
  const used=usedSkillPoints(this.draft.skills),left=this.budget-used;
  this.el('[data-budget-left]').textContent=left?`${left} ${left===1?'point':'points'} left`:`All ${this.budget} points assigned`;
  this.el('[data-budget-used]').textContent=`${used} of ${this.budget} assigned`;
  const bar=this.el('[data-budget-progress]') as HTMLProgressElement;bar.max=this.budget;bar.value=used;
  this.el('[data-budget-help]').textContent=left?'Assign points or move them between skills anytime.':'Lower another skill to free up a point.';
  this.el('.creator-published-build').hidden=!this.draft.isPublic||isCommunityPlayer(this.draft);
  const published=this.draft.publishedSkills??normalizeSkillBudget(this.draft.skills,35);
  this.el('[data-published-budget]').textContent=`${35-usedSkillPoints(published)} points left · ${usedSkillPoints(published)} of 35 assigned`;
  this.dialog.querySelectorAll<HTMLInputElement>('[data-published-area]').forEach(input=>{const name=input.dataset.publishedArea as keyof typeof SUMMARY_SKILLS;input.value=String(areaPoints(published,name));this.el(`[data-published-value="${name}"]`).textContent=input.value+'/10';});


 }
 get savedPlayers(){return structuredClone(ownedRosterPlayers(this.library.players))}
 get activePlayer(){const player=this.library.players.find(p=>p.id===this.library.activeId);return player?structuredClone(player):null}
 get playerLibrary(){return structuredClone(this.library)}
 applyCloudLibrary(library:PlayerLibrary){
  const clean=parseLibrary(JSON.stringify(library)),editing=JSON.stringify(this.draft)!==this.baseline;
  this.library=clean;
  if(!editing){const next=this.activePlayer??this.library.players[0]??newPlayer();this.draft=structuredClone(next);this.baseline=JSON.stringify(this.draft);this.fill()}
  if(this.dialog.open&&this.dialog.dataset.view==='roster')this.showRoster();
 }
 setCloudStatus(state:CloudSaveState){
 }
 createPlayer(){this.open();this.switchDraft(()=>{this.loadDraft(this.shuffledPlayer());this.showEditor()})}
 resumeCreatePlayer(player:DesignedPlayer){this.open();this.loadDraft(player);this.showEditor()}
 editPlayer(player:DesignedPlayer|null){this.open();if(player&&isCommunityPlayer(player)){this.el('[data-roster-status]').textContent='Open this player from Your Roster to customize its skills.';return;}this.showEditor();if(player&&player.id!==this.draft.id)this.switchDraft(()=>this.loadDraft(player))}
 open(){void this.refreshBudget();if(!this.dialog.open)showViewDialog(this.dialog);this.showRoster();void this.community.load()}

 private async refreshBudget(){try{this.budget=await accountSkillBudget();this.budgetReady=true;this.library.players=this.library.players.map(p=>({...p,skills:normalizeSkillBudget(p.skills,this.budget)}));this.draft.skills=normalizeSkillBudget(this.draft.skills,this.budget);this.fillSkills();this.updateSummary();}catch(error){this.el('[data-status]').textContent=(error as Error).message;}}
 private showEditor(){
  this.dialog.dataset.view='editor';this.dialog.setAttribute('aria-labelledby','creator-title');
  this.el('#creator-title').innerHTML=this.library.players.some(p=>p.id===this.draft.id)?'Edit Your Player':'Create Your Player';
  const shared=isCommunityPlayer(this.draft);
  this.el('#creator-title').textContent=shared?'Customize player skills':this.el('#creator-title').textContent;
  this.el('.creator-identity').hidden=shared;this.el('[data-randomize]').hidden=shared;
  (this.el('[data-tab=appearance]') as HTMLButtonElement).disabled=shared;
  if(shared)this.el('[data-tab=skills]').click();
  this.refreshPreview();this.loadThumbnails();
  const heading=this.el('#creator-title');heading.tabIndex=-1;heading.focus({preventScroll:true});this.dialog.scrollTop=0;
 }
 private showRoster(){
  this.dialog.dataset.view='roster';this.dialog.setAttribute('aria-labelledby','roster-title');
  this.el('[data-roster-status]').textContent=this.loadError;
  this.el('[data-community-section]').append(this.community.element);
  const saved=this.el('[data-saved-roster]');saved.replaceChildren();
  this.el('[data-saved-section]').hidden=false;
  const history=this.loadHistory();void history.catch(()=>{});
  const card=(player:DesignedPlayer,role:string)=>{
   const article=document.createElement('article');article.className='roster-card';
   const edit=()=>{if(this.draft.id===player.id){this.showEditor();return}this.switchDraft(()=>{this.loadDraft(player);this.showEditor()})};
   let portrait='';try{this.rosterThumbnails??=new AvatarThumbnails(384);portrait=this.rosterThumbnails.get(player.appearance,'roster',player.handedness)}catch{}
   fillPlayerCard(article,player,role,portrait);
   article.querySelector('.roster-card-identity')!.append(playerRecord(player.id,history));
   const added=ownedRosterPlayers([player]).length>0;
   const change=async()=>{if(!added&&!await canAddToRoster())return false;await setOwnedPlayerAdded(player.id,!added);this.showRoster();};
   const requestDelete=()=>{
    const confirm=()=>{if(this.draft.id!==player.id)this.loadDraft(player);this.showEditor();this.el('[data-delete]').click();};
    if(this.draft.id===player.id)confirm();else this.switchDraft(confirm);
   };
   attachPlayerDetails(article,player,role,portrait,edit,{label:added?'Remove from roster':'Add to Roster',primary:!added,change},this.loadError?undefined:requestDelete);
   if(!added){const actions=document.createElement('div');actions.className='roster-card-actions';const button=document.createElement('button');button.type='button';button.className='roster-play';button.textContent='Add to roster';button.onclick=()=>{button.disabled=true;void change().catch(error=>{this.el('[data-roster-status]').textContent=(error as Error).message;}).finally(()=>{button.disabled=false;});};actions.append(button);article.append(actions);}
   return article;
  };
  for(const player of ownedRosterPlayers(this.library.players))saved.append(card(player,`By ${this.creatorName}`));
  saved.append(...this.community.rosterCards(history));
  this.dialog.querySelector('[data-owned-outside-roster]')?.remove();
  const outside=this.library.players.filter(player=>!ownedRosterPlayers([player]).length);
  if(outside.length){const section=document.createElement('section');section.dataset.ownedOutsideRoster='';section.className='community-section';const heading=document.createElement('h2');heading.textContent='Your saved players';const copy=document.createElement('p');copy.textContent='These characters are saved, but not in your roster. Add them back anytime.';const grid=document.createElement('div');grid.className='roster-grid';grid.append(...outside.map(player=>card(player,`By ${this.creatorName}`)));section.append(heading,copy,grid);this.el('[data-community-section]').before(section);}

  this.paginateRoster();
  focusView(this.dialog);
 }
 private rosterAddPage=0;
 private paginateRoster(){
  const cards=Array.from(this.dialog.querySelectorAll<HTMLElement>('.player-roster-page .roster-card'));
  const available=cards.filter(card=>card.closest('.community-section'));
  const pageCount=Math.max(1,Math.ceil(available.length/10));this.rosterAddPage=Math.max(0,Math.min(this.rosterAddPage,pageCount-1));
  available.forEach((card,index)=>{card.hidden=index<this.rosterAddPage*10||index>=(this.rosterAddPage+1)*10;});
  this.el('[data-roster-pagination]').hidden=available.length<=10;
  const pageLabel=`Page ${this.rosterAddPage+1} of ${pageCount}`;if(this.el('[data-roster-page-label]').textContent!==pageLabel)this.el('[data-roster-page-label]').textContent=pageLabel;
  (this.el('[data-roster-prev]') as HTMLButtonElement).disabled=this.rosterAddPage===0;
  (this.el('[data-roster-next]') as HTMLButtonElement).disabled=this.rosterAddPage===pageCount-1;
  for(const section of Array.from(this.dialog.querySelectorAll<HTMLElement>('.player-roster-page .community-section'))){
   section.hidden=!Array.from(section.querySelectorAll<HTMLElement>('.roster-card')).some(card=>!card.hidden);
   for(const grid of Array.from(section.querySelectorAll<HTMLElement>('.roster-grid'))){grid.hidden=!Array.from(grid.querySelectorAll<HTMLElement>('.roster-card')).some(card=>!card.hidden);const heading=grid.previousElementSibling as HTMLElement|null;if(heading?.tagName==='H3')heading.hidden=grid.hidden;}
  }
 }
 private el(selector:string){return this.dialog.querySelector<HTMLElement>(selector)!}
 private input(selector:string){return this.dialog.querySelector<HTMLInputElement|HTMLSelectElement>(selector)!}
 private switchDraft(action:()=>void){
  const unsaved=JSON.stringify(this.draft)!==this.baseline||(!isCommunityPlayer(this.draft)&&!this.library.players.some(p=>p.id===this.draft.id));
  if(this.dialog.dataset.view==='editor'&&unsaved){this.pending=action;this.el('[data-confirm-status]').textContent='';showViewDialog(this.el('.creator-confirm') as HTMLDialogElement);focusView(this.dialog);}else action();
 }
 private loadDraft(player:DesignedPlayer){this.draft={...structuredClone(player),skills:this.budgetReady?normalizeSkillBudget(player.skills,this.budget):structuredClone(player.skills)};this.baseline=JSON.stringify(this.draft);this.fill();this.refreshPreview();this.changed()}
 private removePlayer(){
  if(this.loadError)return;
  const id=this.draft.id;if(!this.library.players.some(p=>p.id===id))return;
  try{this.library=deletePlayer(browserStorage,this.library,id);this.onLibraryChange(structuredClone(this.library),{kind:'delete',playerId:id});this.pending=null;this.el('.creator-delete-confirm').hidden=true;(this.el('.creator-confirm') as HTMLDialogElement).close();this.onDelete(id);this.loadDraft(this.activePlayer??this.library.players[0]??newPlayer());this.showRoster();this.el('[data-roster-status]').textContent=this.library.players.length?'Player deleted.':''}catch{this.el('[data-status]').textContent='Could not delete the player. Your saved roster is unchanged.'}
 }
 private fill(){
  this.el('#creator-title').innerHTML=this.library.players.some(p=>p.id===this.draft.id)?'Edit Your Player':'Create Your Player';
  this.el('.creator-delete-confirm').hidden=true;
  this.el('[data-delete]').hidden=!this.library.players.some(p=>p.id===this.draft.id);
  (this.el('[data-delete]') as HTMLButtonElement).disabled=!!this.loadError;
  this.input('#creator-name').value=this.draft.name;
  this.input('#creator-catchphrase').value=this.draft.catchphrase??'';(this.input('#creator-public') as HTMLInputElement).checked=this.draft.isPublic===true;
  this.syncAppearance();
  this.input('#creator-preset').value='';this.fillSkills();this.updateCaption();this.updateSummary();
  this.el('[data-status]').textContent=this.loadError;
  (this.el('[data-save]') as HTMLButtonElement).disabled=!!this.loadError;
 }
 private fillSkills(){this.input('#creator-preset').value=Object.entries(ARCHETYPES).find(([,p])=>SKILLS.every(key=>p.skills[key]===this.draft.skills[key]))?.[0]??'';for(const skill of SKILLS){this.input(`#skill-${skill}`).value=String(this.draft.skills[skill]/10);this.input(`#skill-${skill}`).setAttribute('max',String(skillCap(this.budget)/10));this.el(`#value-${skill}`).textContent=(this.draft.skills[skill]/10).toFixed(1);this.el(`#help-${skill}`).textContent=skillLevel(this.draft.skills[skill])+' · '+skillHelp[skill]}}
 private updateCaption(){const name=this.draft.name.trim()||'Your player';this.el('[data-preview-name]').textContent=name;this.dialog.querySelectorAll<HTMLElement>('[data-skills-name]').forEach(label=>label.textContent=name)}
 private changed(){this.el('[data-status]').textContent=this.loadError}
 private refreshPreview(){if(!this.dialog.open||this.dialog.dataset.view==='roster'||this.previewFailed)return;try{this.preview??=new AvatarPreview(this.el('.creator-preview'),true,1.2);this.preview.setPlayer(this.draft)}catch{this.previewFailed=true;this.el('.creator-preview').textContent='3D preview is unavailable. You can still edit and save your player.'}}
 private async save(play:boolean):Promise<boolean>{
  if(this.loadError)return false;
  if(!this.budgetReady){this.el('[data-status]').textContent='Loading account skill budget. Please try again.';void this.refreshBudget();return false;}
  if(!fitsSkillBudget(this.draft.skills,this.budget)){this.el('[data-status]').textContent='Your build exceeds your skill budget.';return false;}
  if(isCommunityPlayer(this.draft)){
   const button=this.el('[data-save]') as HTMLButtonElement;button.disabled=true;
   try{await saveCommunitySkills(this.draft.id.slice(10),this.draft.skills);this.baseline=JSON.stringify(this.draft);await this.community.load();this.showRoster();return true;}catch(error){this.el('[data-status]').textContent=(error as Error).message;return false;}finally{button.disabled=false;}
  }
  try{if(!await this.beforeSave(structuredClone(this.draft)))return false;}
  catch(error){this.el('[data-status]').textContent=error instanceof Error?error.message:'Account access is unavailable. Please try again.';return false;}
  try{
   this.library=savePlayer(browserStorage,this.library,this.draft,play||this.activateOnSave);this.draft=structuredClone(this.library.players.find(p=>p.id===this.draft.id)!);this.baseline=JSON.stringify(this.draft);this.fill();this.onLibraryChange(structuredClone(this.library),{kind:'save',playerId:this.draft.id});
   this.pending=null;(this.el('.creator-confirm') as HTMLDialogElement).close();this.el('[data-status]').textContent='Player saved.';
   if(play){this.onPlay(structuredClone(this.draft));this.dialog.close()}else this.showRoster();
   if(!play&&this.afterSave(structuredClone(this.draft)))this.dialog.close();
   return true;
  }catch(error){this.el('[data-status]').textContent=error instanceof Error&&error.name==='QuotaExceededError'?'Browser storage is full. Your edits are still here; the player was not saved.':error instanceof Error?error.message:'Could not save. Your edits are still here.';return false;}
 }
}
