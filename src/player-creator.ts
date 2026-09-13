import {SUMMARY_SKILLS,summarizeSkills,skillLevel} from './player-skill-summary';
import {applyPresentation} from './player-looks';
import {AvatarPreview,AvatarThumbnails,LOOKS} from './avatar-preview';
import {SKILLS} from './engine/model';
import {ARCHETYPES} from './engine/player-profiles';
import {APPEARANCE_OPTIONS,PLAYER_STORAGE_KEY,newPlayer,parseLibrary,savePlayer,deletePlayer,type DesignedPlayer,type PlayerLibrary,type Appearance} from './player-design';
import './player-creator.css';
const iconPaths:Record<string,string>={
 hairStyle:'M5 15V9a7 7 0 0 1 14 0v6M5 10c4 0 5-4 5-4s3 4 9 4M7 15v4m10-4v4',
 hair:'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z',skin:'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z',
 face:'M5 10a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm3 1h1m6 0h1m-7 5q3 2 6 0',
 glasses:'M2 8h8v7H3Zm12 0h8l-1 7h-7ZM10 10h4',hat:'M4 14V11a8 8 0 0 1 16 0v3ZM4 14l-3 3h16l3-3',
 top:'m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4q-4 4-8 0Z',
 bottom:'M7 3h10l4 18H3Zm5 7v11',shoes:'m4 8 4 5 5 2h6l3 3v3H2V10Z',paddle:'M8 2h8l3 4v9l-5 4v3h-4v-3l-5-4V6Z',accessory:'M9 2h6v5H9Zm-1 5h8v10H8Zm1 10h6v5H9Z',style:'M5 12v9M12 7v14M19 2v19'};
const rowIcon=(key:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[key]??iconPaths.hair}"/></svg>`;
const outfitColors=['#fa6796','#4285df','#efbf43','#e85860','#ac7bd8','#36936c','#424247','#fff7ef','#203e6a','#ed8d3c','#80cdd2','#754732','#a6c64c'];
const equipmentColors=['#315d58','#f56794','#41617a','#303d3e','#ece4ce','#ffffff','#17191e','#ed8d3c','#efbf43','#ac7bd8','#e85860','#4285df','#80cdd2'];
const labels:Record<string,string>={jersey:'T-shirt',backwards:'Cap back',sport:'Sport shades','side-part':'Side part','pleated-skirt':'Pleated skirt','long-shorts':'Long shorts'};
const title=(text:string)=>labels[text]??text.charAt(0).toUpperCase()+text.slice(1);
const skillHelp:Record<typeof SKILLS[number],string>={serve:'Start the point with reliable placement.',return:'Control the return after the bounce.',drive:'Execute fast, attacking groundstrokes.',drop:'Land a soft shot in the kitchen.',dink:'Control soft exchanges at the net.',reset:'Take pace off an incoming attack.',volley:'Strike cleanly before the bounce.',counter:'Redirect an attack into pressure.',overhead:'Finish high balls with control.',movement:'Reach more balls around the court.',hands:'Handle fast exchanges at the net.'};

export class PlayerCreator {
 readonly dialog=document.createElement('dialog');
 private rosterThumbnails:AvatarThumbnails|null=null;
 private thumbnails:AvatarThumbnails|null=null;private thumbnailsReady=false;
 private library:PlayerLibrary={version:1,activeId:null,players:[]};private draft=newPlayer();private baseline='';private preview:AvatarPreview|null=null;private previewFailed=false;private loadError='';private pending:(()=>void)|null=null;
 constructor(private onPlay:(player:DesignedPlayer)=>void,private onDelete:(id:string)=>void=()=>{}){
  try{this.library=parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY))}catch{this.loadError='Saved players could not be read. Saving is disabled to protect your existing roster.'}
  const active=this.library.players.find(p=>p.id===this.library.activeId);
  if(active)this.draft=structuredClone(active);this.baseline=JSON.stringify(this.draft);
  this.dialog.id='player-creator';this.dialog.setAttribute('aria-labelledby','creator-title');
  this.dialog.innerHTML=`<section class="player-roster-page" aria-labelledby="roster-title"><div class="roster-top"><div><h1 id="roster-title">Your roster</h1></div><div class="roster-cheer" aria-hidden="true">Good players.<br>Brighter rallies.<svg viewBox="0 0 70 80" fill="none"><ellipse cx="40" cy="29" rx="22" ry="26" fill="currentColor" transform="rotate(35 40 29)"/><path d="m27 48-17 22" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><g fill="#fafbf3"><circle cx="38" cy="13" r="3"/><circle cx="49" cy="23" r="3"/><circle cx="29" cy="27" r="3"/><circle cx="40" cy="38" r="3"/><circle cx="53" cy="36" r="3"/></g></svg></div><button type="button" class="creator-close" data-close aria-label="Return to main game" title="Return to main game">×</button></div><div class="roster-actions"><button type="button" data-create-player>+ Create new player</button><button type="button" data-resume hidden>Continue editing</button></div><p data-roster-status role="status"></p><section data-saved-section><h2>Saved &amp; created players</h2><div data-saved-roster class="roster-grid"></div></section><h2>Starting Lineup</h2><div data-default-roster class="roster-grid"></div></section><div class="creator-topline"><button type="button" data-back-roster>← Roster</button><span>PICKLE RPG <i>·</i> CREATE PLAYER</span><button type="button" class="creator-close" data-close aria-label="Return to main game" title="Return to main game">×</button></div>
  <div class="creator-layout"><section class="creator-stage" aria-label="Avatar preview"><div class="creator-heading"><h2 id="creator-title">Create<br>Your Player.</h2><p>Different players.<br>A brighter court.</p></div>

  <div class="creator-preview"></div><div class="creator-plinth"></div>
  <div class="creator-identity"><label for="creator-name">PLAYER NAME<input id="creator-name" type="text" inputmode="text" enterkeyhint="done" autocapitalize="words" maxlength="24" autocomplete="off" placeholder="Name your player"></label><label class="creator-catchphrase-label" for="creator-catchphrase">CATCHPHRASE<input id="creator-catchphrase" type="text" inputmode="text" enterkeyhint="done" maxlength="60" autocomplete="off" placeholder="Your game. Your way."></label>
  <label class="style-heading">PLAY STYLE <span>(OPTIONAL)</span></label><div class="creator-style-chips"><button type="button" data-style="allCourt">All-Court</button><button type="button" data-style="attacker">Power</button><button type="button" data-style="defender">Quick Hands</button><button type="button" data-style="setup">Strategic</button></div>
  <blockquote>“Small moves.<br>Big plans.”</blockquote><div class="creator-summary">${['Power','Control','Speed','Hands'].map(name=>`<div><span>${name}</span><meter aria-label="${name} summary" min="0" max="100" value="70" data-summary="${name}" title="${SUMMARY_SKILLS[name as keyof typeof SUMMARY_SKILLS].map(title).join(', ')}"></meter><output data-summary-value="${name}"></output></div>`).join('')}</div>
  </div>
  <div class="creator-stage-bottom"><button type="button" data-randomize aria-label="Randomize look" title="Randomize look"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3.5-2 5-5m2-2c1.5-3 3-5 5-5h3m-4-4 4 4-4 4"/></svg></button></div><span class="creator-motto">CHARACTERS · STRATEGY · PLAYFUL</span><span data-preview-name class="sr-only"></span></section>
  <section class="creator-editor"><div class="creator-tabs" role="tablist" aria-label="Player controls"><button type="button" role="tab" id="appearance-tab" aria-controls="appearance-panel" aria-selected="true" data-tab="appearance">${rowIcon('top')} Appearance</button><button type="button" role="tab" id="skills-tab" aria-controls="skills-panel" aria-selected="false" tabindex="-1" data-tab="skills">${rowIcon('style')} Skills</button></div>
  <div id="appearance-panel" role="tabpanel" aria-labelledby="appearance-tab"><div class="creator-options">
  ${this.optionRow('hairStyle','Hair','⌁')}
  ${this.colorRow('hair','Hair Color',['#754732','#252429','#efc568','#b85b34','#814cac','#b8babc'])}
  ${this.colorRow('skin','Skin Tone',['#f0cbae','#e7af8c','#c8926e','#ad7553','#875338','#543c32'])}
  ${this.optionRow('glasses','Glasses','∞')}
  ${this.optionRow('hat','Hat / Visor','⌒')}
  ${this.colorRow('hatColor','Hat Color',outfitColors)}
  ${this.optionRow('top','Top','♧')}
  ${this.colorRow('jersey','Top Color',outfitColors)}
  ${this.optionRow('bottom','Bottom','▱')}
  ${this.colorRow('bottomColor','Bottom Color',outfitColors)}
  ${this.colorRow('shoes','Shoes',equipmentColors)}
  ${this.colorRow('paddle','Paddle',equipmentColors)}
  ${this.optionRow('accessory','Accessories','◇')}
  ${this.colorRow('accent','Accessories Color',['#315d58','#f56794','#41617a','#303d3e','#ece4ce'])}
  <div class="creator-option-row"><span class="row-label">Playing hand</span><div class="creator-choices hand-choices" role="group" aria-label="Playing hand">${(['right','left'] as const).map(hand=>`<button type="button" data-hand="${hand}" aria-label="${title(hand)}-handed" title="${title(hand)}-handed" aria-pressed="false"><img alt="" data-hand-thumb="${hand}"><span class="hand-badge" aria-hidden="true">${hand==='right'?'R':'L'}</span></button>`).join('')}</div></div>
  </div></div>
  <div id="skills-panel" role="tabpanel" aria-labelledby="skills-tab" hidden><p class="creator-intro">Adjust every skill from 0 to 100. Your meters and estimated rating update as you edit.</p><div class="creator-summary skills-summary">${['Power','Control','Speed','Hands'].map(name=>`<div><span>${name}</span><meter aria-label="${name} summary" min="0" max="100" value="70" data-summary="${name}" title="${SUMMARY_SKILLS[name as keyof typeof SUMMARY_SKILLS].map(title).join(', ')}"></meter><output data-summary-value="${name}"></output></div>`).join('')}</div><div class="creator-rating"><span>Estimated DUPR</span><strong data-dupr></strong><small>Game estimate from all 11 skills · not an official rating.</small></div><label for="creator-preset">Start from an archetype<select id="creator-preset"><option value="">Custom skills</option>${Object.entries(ARCHETYPES).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select></label><div class="creator-skills">${SKILLS.map(skill=>`<div class="creator-skill"><label for="skill-${skill}">${title(skill)}<output for="skill-${skill}" id="value-${skill}">70</output></label><input id="skill-${skill}" data-skill="${skill}" type="range" min="0" max="100" step="1" aria-describedby="help-${skill}"><small id="help-${skill}">${skillHelp[skill]}</small></div>`).join('')}</div><p class="creator-intro">Rating guide: 0 → 2.0 · 70 → 3.5 (typical) · 80 → 4.0 (strong) · 90 → 5.0 (advanced) · 95 → 6.0 (pro) · 100 → 8.0. Your rating combines all 11 skills.</p></div>
  <div class="creator-delete-confirm" hidden><p data-delete-message></p><button type="button" data-cancel-delete>Keep player</button><button type="button" data-confirm-delete>Delete player permanently</button></div>
  <div class="creator-confirm" hidden><p>Discard unsaved changes to switch players?</p><button type="button" data-keep>Keep editing</button><button type="button" data-discard>Discard and continue</button></div>
  <div class="creator-footer"><button type="button" data-delete hidden>Delete player</button><p data-status role="status"></p><div><button type="button" data-save>Save Player &nbsp; →</button></div><small>Saved in this browser.</small></div></section></div>`;
  document.body.append(this.dialog);
  this.setupAppearancePages();
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button=>button.addEventListener('click',()=>this.dialog.close()));
  this.el('[data-delete]').addEventListener('click',()=>{const player=this.library.players.find(p=>p.id===this.draft.id);if(!player||this.loadError)return;this.el('[data-delete-message]').textContent=`Delete “${player.name}”? This removes the saved player and any unsaved edits. This cannot be undone.`;this.el('.creator-confirm').hidden=true;this.pending=null;this.el('.creator-delete-confirm').hidden=false;this.el('[data-cancel-delete]').focus()});
  this.el('[data-cancel-delete]').addEventListener('click',()=>{this.el('.creator-delete-confirm').hidden=true;this.el('[data-delete]').focus()});
  this.el('[data-confirm-delete]').addEventListener('click',()=>this.removePlayer());
  this.el('[data-back-roster]').addEventListener('click',()=>this.showRoster());
  this.el('[data-create-player]').addEventListener('click',()=>{this.showEditor();this.switchDraft(()=>this.loadDraft(newPlayer()))});
  this.el('[data-resume]').addEventListener('click',()=>this.showEditor());
  this.el('[data-keep]').addEventListener('click',()=>{this.pending=null;this.el('.creator-confirm').hidden=true});
  this.el('[data-discard]').addEventListener('click',()=>{this.pending?.();this.pending=null;this.el('.creator-confirm').hidden=true});
  this.input('#creator-name').addEventListener('click',()=>this.input('#creator-name').focus());
  this.input('#creator-name').addEventListener('keydown',event=>{if(event instanceof KeyboardEvent&&event.key==='Enter'){event.preventDefault();this.input('#creator-name').blur()}});
  this.input('#creator-catchphrase').addEventListener('input',()=>{this.draft.catchphrase=this.input('#creator-catchphrase').value;this.changed()});
  this.input('#creator-name').addEventListener('input',()=>{this.draft.name=this.input('#creator-name').value;this.updateCaption();this.changed()});
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.key==='presentation')this.draft.appearance=applyPresentation(this.draft.appearance,button.dataset.choice as Appearance['presentation']);else Object.assign(this.draft.appearance,{[button.dataset.key!]:button.dataset.choice});this.syncAppearance();this.refreshPreview();this.changed()}));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-color]').forEach(control=>{const apply=()=>{if(this.draft.appearance[control.dataset.color as keyof Appearance]===control.value)return;Object.assign(this.draft.appearance,{[control.dataset.color!]:control.value});this.syncAppearance();this.refreshPreview();this.changed()};control.addEventListener('input',apply);control.addEventListener('change',apply)});
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(button=>button.addEventListener('click',()=>{this.draft.skills={...ARCHETYPES[button.dataset.style as keyof typeof ARCHETYPES].skills};this.fillSkills();this.updateSummary();this.changed()}));
  this.el('[data-randomize]').addEventListener('click',()=>{const pick=<T,>(items:readonly T[])=>items[Math.floor(Math.random()*items.length)];const look=pick(LOOKS);this.draft.appearance={...look.appearance,hairStyle:pick(APPEARANCE_OPTIONS.hairStyle),hat:pick(APPEARANCE_OPTIONS.hat.filter(value=>value!=='beanie'&&value!=='bucket')),glasses:pick(APPEARANCE_OPTIONS.glasses),top:pick(APPEARANCE_OPTIONS.top),bottom:pick(APPEARANCE_OPTIONS.bottom.filter(value=>value!=='skort')),accessory:pick(APPEARANCE_OPTIONS.accessory)};this.syncAppearance();this.refreshPreview();this.changed()});
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-hand]').forEach(button=>button.addEventListener('click',()=>{this.draft.handedness=button.dataset.hand as 'left'|'right';this.syncAppearance();this.refreshPreview();this.changed()}));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-skill]').forEach(control=>control.addEventListener('input',()=>{const key=control.dataset.skill as typeof SKILLS[number];this.draft.skills[key]=Number(control.value);this.el(`#value-${key}`).textContent=control.value;this.el(`#help-${key}`).textContent=skillLevel(Number(control.value))+' · '+skillHelp[key];this.input('#creator-preset').value='';this.updateSummary();this.changed()}));
  this.input('#creator-preset').addEventListener('change',()=>{const preset=ARCHETYPES[this.input('#creator-preset').value as keyof typeof ARCHETYPES];if(preset){this.draft.skills={...preset.skills};this.fillSkills();this.updateSummary();this.changed()}});
  const tabs=Array.from(this.dialog.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const selectTab=(tab:HTMLButtonElement)=>{for(const button of tabs){const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;this.el(`#${button.dataset.tab}-panel`).hidden=!selected}};
  for(const tab of tabs){tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=tabs[event.key==='Home'?0:event.key==='End'?1:tab===tabs[0]?1:0];selectTab(next);next.focus()}})}
  this.el('[data-save]').addEventListener('click',()=>this.save(false));
  this.fill();
 }
 private setupAppearancePages(){
  const track=this.el('.creator-options');
  const rows=Array.from(track.children);
  const groups=[{name:'Hair',rows:[0,1]},{name:'Face',rows:[3,2]},{name:'Headwear',rows:[4,5]},{name:'Top',rows:[6,7]},{name:'Bottom',rows:[8,9]},{name:'Shoes',rows:[10]},{name:'Paddle & hand',rows:[14,11]},{name:'Accessories',rows:[12,13]}];
  const pages=groups.map((group,index)=>{
   const page=document.createElement('section');page.className='appearance-page';page.id=`appearance-page-${index}`;page.setAttribute('aria-label',group.name);
   if(group.name==='Shoes'){
    const key=group.name==='Shoes'?'shoes':'paddle';
    const item=document.createElement('div');item.className='appearance-item-preview';
    item.innerHTML=`<img alt="${title(key)}" data-thumb-key="${key}" data-thumb-value="${LOOKS[0].appearance[key]}">`;
    page.append(item);
   }
   for(const row of group.rows)page.append(rows[row]);track.append(page);return page;
  });
  const nav=document.createElement('nav');nav.className='appearance-pagination';nav.setAttribute('aria-label','Appearance pages');
  nav.innerHTML=`<div class="appearance-page-heading"><button type="button" data-page-prev aria-label="Previous appearance page">‹</button><div class="appearance-dots">${groups.map((group,index)=>`<button type="button" data-page="${index}" aria-label="${group.name}, page ${index+1} of ${groups.length}" aria-controls="appearance-page-${index}"><span></span></button>`).join('')}</div><button type="button" data-page-next aria-label="Next appearance page">›</button></div><span class="sr-only" data-page-caption aria-live="polite"></span>`;
  this.el('#appearance-panel').prepend(nav);
  const dots=Array.from(nav.querySelectorAll<HTMLButtonElement>('[data-page]'));
  const mobile=matchMedia('(max-width:760px)');let current=0;
  const sync=()=>{
   dots.forEach((dot,index)=>{dot.setAttribute('aria-current',String(index===current));pages[index].inert=mobile.matches&&index!==current});
   nav.querySelector('[data-page-caption]')!.textContent=`${groups[current].name} · ${current+1} / ${groups.length}`;
   nav.querySelector<HTMLButtonElement>('[data-page-prev]')!.disabled=current===0;
   nav.querySelector<HTMLButtonElement>('[data-page-next]')!.disabled=current===groups.length-1;
  };
  const go=(index:number)=>track.scrollTo({left:index*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  dots.forEach((dot,index)=>dot.addEventListener('click',()=>go(index)));
  nav.querySelector('[data-page-prev]')!.addEventListener('click',()=>go(current-1));
  nav.querySelector('[data-page-next]')!.addEventListener('click',()=>go(current+1));
  track.addEventListener('scroll',()=>{if(!mobile.matches||!track.clientWidth)return;const next=Math.max(0,Math.min(groups.length-1,Math.round(track.scrollLeft/track.clientWidth)));if(next!==current){current=next;sync()}},{passive:true});
  new ResizeObserver(()=>{if(mobile.matches&&track.clientWidth)track.scrollTo({left:current*track.clientWidth,behavior:'instant'})}).observe(track);
  mobile.addEventListener('change',sync);sync();
 }
 private optionRow(key:keyof typeof APPEARANCE_OPTIONS,label:string,icon:string){return `<div class="creator-option-row"><span class="row-icon" aria-hidden="true">${rowIcon(key)}</span><span class="row-label">${label}</span><div class="creator-choices" role="group" aria-label="${label}">${APPEARANCE_OPTIONS[key].filter(value=>!['skort','beanie','bucket'].includes(value)).sort((a,b)=>Number(b==='none')-Number(a==='none')).map(value=>`<button type="button" data-key="${key}" data-choice="${value}" aria-label="${label}: ${title(value)}" aria-pressed="false" title="${title(value)}">${value==='none'?'<span class="none-icon">⊘</span>':`<img alt="" data-thumb-key="${key}" data-thumb-value="${value}">`}<span class="choice-label">${title(value)}</span></button>`).join('')}</div></div>`}
 private colorRow(key:keyof Appearance,label:string,colors:string[]){return `<div class="creator-option-row"><span class="row-icon" aria-hidden="true">${rowIcon(key)}</span><span class="row-label">${label}</span><div class="creator-choices color-choices" data-palette="${key}" role="group" aria-label="${label}">${colors.map(color=>`<button type="button" class="color-choice" data-key="${key}" data-choice="${color}" aria-label="${label}: ${color}" aria-pressed="false" style="--swatch:${color}"><span></span></button>`).join('')}<label class="custom-color" title="Custom ${label.toLowerCase()}"><input type="color" data-color="${key}" aria-label="Custom ${label.toLowerCase()}"><span>＋</span></label></div></div>`}
 private syncAppearance(){
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-hand]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hand===this.draft.handedness)));
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button=>button.setAttribute('aria-pressed',String(this.draft.appearance[button.dataset.key as keyof Appearance]===button.dataset.choice)));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-color]').forEach(input=>input.value=this.draft.appearance[input.dataset.color as keyof Appearance]);
 }
 private loadThumbnails(){if(this.thumbnailsReady)return;try{
  this.thumbnails??=new AvatarThumbnails();
  this.dialog.querySelectorAll<HTMLImageElement>('[data-hand-thumb]').forEach(img=>img.src=this.thumbnails!.get(LOOKS[0].appearance,`hand-${img.dataset.handThumb}`));
  this.dialog.querySelectorAll<HTMLImageElement>('[data-thumb-key]').forEach(img=>{let appearance={...LOOKS[0].appearance,[img.dataset.thumbKey!]:img.dataset.thumbValue!};if(img.dataset.thumbKey==='presentation')appearance=applyPresentation(appearance,img.dataset.thumbValue as Appearance['presentation']);if(['face','hairStyle','glasses'].includes(img.dataset.thumbKey!))appearance.hat='none';img.src=this.thumbnails!.get(appearance,img.dataset.thumbKey!)});
  this.dialog.querySelectorAll<HTMLImageElement>('[data-portrait]').forEach(img=>img.src=this.thumbnails!.get(LOOKS[Number(img.dataset.portrait)].appearance,'full'));this.thumbnailsReady=true;
 }catch{/* Text labels remain usable if thumbnail rendering is unavailable. */}}
 private updateSummary(){const {meters,estimatedDupr}=summarizeSkills(this.draft.skills);
  for(const [name,value] of Object.entries(meters)){
   this.dialog.querySelectorAll<HTMLMeterElement>(`[data-summary="${name}"]`).forEach(meter=>{meter.value=value;meter.setAttribute('aria-valuetext',Math.round(value)+' out of 100')});
   this.dialog.querySelectorAll<HTMLOutputElement>(`[data-summary-value="${name}"]`).forEach(output=>output.textContent=String(Math.round(value)));
  }
  this.el('[data-dupr]').textContent='≈ '+estimatedDupr.toFixed(2);

  this.dialog.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(button=>button.setAttribute('aria-pressed',String(SKILLS.every(skill=>this.draft.skills[skill]===ARCHETYPES[button.dataset.style as keyof typeof ARCHETYPES].skills[skill]))));
 }
 get savedPlayers(){return structuredClone(this.library.players)}
 get activePlayer(){const player=this.library.players.find(p=>p.id===this.library.activeId);return player?structuredClone(player):null}
 editPlayer(player:DesignedPlayer|null){this.open();this.showEditor();if(player&&player.id!==this.draft.id)this.switchDraft(()=>this.loadDraft(player))}
 open(){if(!this.dialog.open)this.dialog.showModal();this.showRoster()}

 private showEditor(){
  this.dialog.dataset.view='editor';this.dialog.setAttribute('aria-labelledby','creator-title');
  this.el('#creator-title').innerHTML=this.library.players.some(p=>p.id===this.draft.id)?'Edit<br>Your Player.':'Create<br>Your Player.';
  this.refreshPreview();this.loadThumbnails();this.el('[data-back-roster]').focus();
 }
 private showRoster(){
  this.dialog.dataset.view='roster';this.dialog.setAttribute('aria-labelledby','roster-title');
  this.el('[data-resume]').hidden=JSON.stringify(this.draft)===this.baseline;
  this.el('[data-roster-status]').textContent=this.loadError;
  const saved=this.el('[data-saved-roster]'),defaults=this.el('[data-default-roster]');saved.replaceChildren();defaults.replaceChildren();
  this.el('[data-saved-section]').hidden=this.library.players.length===0;
  const card=(player:DesignedPlayer,role:string,isDefault:boolean)=>{
   const article=document.createElement('article');article.className='roster-card';
   const edit=()=>{this.showEditor();this.switchDraft(()=>this.loadDraft(player))};
   article.tabIndex=0;article.setAttribute('role','button');article.setAttribute('aria-label',`Edit ${player.name}`);
   article.addEventListener('click',event=>{if((event.target as HTMLElement).closest('button,summary,a,input,select,textarea'))return;edit()});
   article.addEventListener('keydown',event=>{if(event.target===article&&(event.key==='Enter'||event.key===' ')){event.preventDefault();edit()}});
   const themeIndex=LOOKS.findIndex(look=>look.name===player.name);
   const themes=[['#ff9389','All court.\nAll fun.'],['#78aff2','Power changes\ngames.'],['#ffda73','Think\nahead.'],['#95dfc0','Fast moves.\nBig plays.'],['#c5a3f2','Small details.\nBig wins.'],['#b0d2a7','Defend and\ndeliver.'],['#d1a0ef','Creativity keeps\nyou ahead.'],['#a5dfc4','Any court.\nAny day.']];
   const [color,motto]=themes[themeIndex<0?Math.abs(player.name.length)%themes.length:themeIndex];
   article.style.setProperty('--card-color',color);
   const banner=document.createElement('div');banner.className='roster-banner';
   try{this.rosterThumbnails??=new AvatarThumbnails(384);const img=document.createElement('img');img.src=this.rosterThumbnails.get(player.appearance,'roster');img.alt=player.name;banner.append(img)}catch{}
   const slogan=document.createElement('span');slogan.className='roster-motto';slogan.textContent=player.catchphrase?.trim()||(themeIndex<0?'Your game.\nYour way.':motto);banner.append(slogan);
   const doodle=document.createElement('span');doodle.className='roster-doodle';doodle.textContent=themeIndex%2===0?'✧':'〰';doodle.setAttribute('aria-hidden','true');banner.append(doodle);article.append(banner);
   const heading=document.createElement('h3');heading.textContent=player.name;const identity=document.createElement('div');identity.className='roster-card-identity';identity.append(heading);article.append(identity);
   const description=document.createElement('p');description.textContent=role;description.className='roster-role';identity.append(description);
   const {meters,estimatedDupr}=summarizeSkills(player.skills);
   const rating=document.createElement('p');rating.className='roster-rating';rating.innerHTML='<span>DUPR</span><strong>'+estimatedDupr.toFixed(2)+'</strong>';rating.title='Game skill estimate, not an official DUPR rating';article.append(rating);
   const summary=document.createElement('dl');for(const [name,value] of Object.entries(meters)){const row=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');row.dataset.stat=name;const icon=document.createElement('span');icon.className='roster-stat-icon';icon.setAttribute('aria-hidden','true');icon.textContent=({Power:'ϟ',Control:'◎',Speed:'➟',Hands:'✋'} as Record<string,string>)[name];term.append(icon,document.createTextNode(name));const meter=document.createElement('span');meter.className='five-block-meter';meter.setAttribute('role','meter');meter.setAttribute('aria-label',name);meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');meter.setAttribute('aria-valuenow',String(Math.round(value)));meter.title=name+': '+Math.round(value)+'/100';for(let i=0;i<5;i++){const block=document.createElement('i');block.style.setProperty('--fill',Math.max(0,Math.min(100,(value-i*20)*5))+'%');meter.append(block)}detail.append(meter);row.append(term,detail);summary.append(row)}article.append(summary);
   const details=document.createElement('details'),label=document.createElement('summary');label.textContent='View all skills';details.append(label);
   for(const skill of SKILLS){const line=document.createElement('div');line.className='roster-skill';const name=document.createElement('span');name.textContent=title(skill);const meter=document.createElement('meter');meter.min=0;meter.max=100;meter.value=player.skills[skill];meter.setAttribute('aria-label',title(skill));meter.title=skillLevel(player.skills[skill]);const value=document.createElement('span');value.textContent=String(player.skills[skill]);line.append(name,meter,value);details.append(line)}article.append(details);
   const actions=document.createElement('div');actions.className='roster-card-actions';
   const play=document.createElement('button');play.type='button';play.className='roster-play';play.textContent='▶  Play as '+player.name;play.disabled=!isDefault&&!!this.loadError;
   play.addEventListener('click',()=>{if(isDefault){this.onPlay(structuredClone(player));this.dialog.close()}else{this.showEditor();this.switchDraft(()=>{this.loadDraft(player);this.save(true)})}});actions.append(play);
   article.append(actions);return article;
  };
  for(const player of this.library.players)saved.append(card(player,this.library.activeId===player.id?'Selected player':'Saved player',false));
  for(const [index,look] of LOOKS.entries())defaults.append(card({...newPlayer('default-'+index),name:look.name,appearance:{...look.appearance},skills:{...look.skills}},look.role,true));
  this.el('[data-create-player]').focus();
 }
 private el(selector:string){return this.dialog.querySelector<HTMLElement>(selector)!}
 private input(selector:string){return this.dialog.querySelector<HTMLInputElement|HTMLSelectElement>(selector)!}
 private switchDraft(action:()=>void){if(JSON.stringify(this.draft)!==this.baseline){this.pending=action;this.el('.creator-confirm').hidden=false;this.el('[data-keep]').focus()}else action()}
 private loadDraft(player:DesignedPlayer){this.draft=structuredClone(player);this.baseline=JSON.stringify(this.draft);this.fill();this.refreshPreview();this.changed()}
 private removePlayer(){
  if(this.loadError)return;
  const id=this.draft.id;if(!this.library.players.some(p=>p.id===id))return;
  try{this.library=deletePlayer(localStorage,this.library,id);this.pending=null;this.el('.creator-delete-confirm').hidden=true;this.el('.creator-confirm').hidden=true;this.onDelete(id);this.loadDraft(this.activePlayer??this.library.players[0]??newPlayer());this.showRoster();this.el('[data-roster-status]').textContent=this.library.players.length?'Player deleted.':''}catch{this.el('[data-status]').textContent='Could not delete the player. Your saved roster is unchanged.'}
 }
 private fill(){
  this.el('#creator-title').innerHTML=this.library.players.some(p=>p.id===this.draft.id)?'Edit<br>Your Player.':'Create<br>Your Player.';
  this.el('.creator-delete-confirm').hidden=true;
  this.el('[data-delete]').hidden=!this.library.players.some(p=>p.id===this.draft.id);
  (this.el('[data-delete]') as HTMLButtonElement).disabled=!!this.loadError;
  this.input('#creator-name').value=this.draft.name;
  this.input('#creator-catchphrase').value=this.draft.catchphrase??'';
  this.syncAppearance();
  this.input('#creator-preset').value='';this.fillSkills();this.updateCaption();this.updateSummary();
  this.el('[data-status]').textContent=this.loadError;
  (this.el('[data-save]') as HTMLButtonElement).disabled=!!this.loadError;
 }
 private fillSkills(){this.input('#creator-preset').value=Object.entries(ARCHETYPES).find(([,p])=>SKILLS.every(key=>p.skills[key]===this.draft.skills[key]))?.[0]??'';for(const skill of SKILLS){this.input(`#skill-${skill}`).value=String(this.draft.skills[skill]);this.el(`#value-${skill}`).textContent=String(this.draft.skills[skill]);this.el(`#help-${skill}`).textContent=skillLevel(this.draft.skills[skill])+' · '+skillHelp[skill]}}
 private updateCaption(){this.el('[data-preview-name]').textContent=this.draft.name.trim()||'Your player'}
 private changed(){this.el('[data-status]').textContent=this.loadError}
 private refreshPreview(){if(!this.dialog.open||this.dialog.dataset.view==='roster'||this.previewFailed)return;try{this.preview??=new AvatarPreview(this.el('.creator-preview'));this.preview.setPlayer(this.draft)}catch{this.previewFailed=true;this.el('.creator-preview').textContent='3D preview is unavailable. You can still edit and save your player.'}}
 private save(play:boolean){
  if(this.loadError)return;
  try{
   this.library=savePlayer(localStorage,this.library,this.draft,play);this.draft=structuredClone(this.library.players.find(p=>p.id===this.draft.id)!);this.baseline=JSON.stringify(this.draft);this.fill();
   this.pending=null;this.el('.creator-confirm').hidden=true;this.el('[data-status]').textContent='Player saved.';
   if(play){this.onPlay(structuredClone(this.draft));this.dialog.close()}else this.showRoster()
  }catch(error){this.el('[data-status]').textContent=error instanceof Error&&error.name==='QuotaExceededError'?'Browser storage is full. Your edits are still here; the player was not saved.':error instanceof Error?error.message:'Could not save. Your edits are still here.'}
 }
}
