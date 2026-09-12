import {AvatarPreview,AvatarThumbnails,LOOKS} from './avatar-preview';
import {SKILLS} from './engine/model';
import {ARCHETYPES} from './engine/player-profiles';
import {APPEARANCE_OPTIONS,PLAYER_STORAGE_KEY,newPlayer,parseLibrary,savePlayer,type DesignedPlayer,type PlayerLibrary,type Appearance} from './player-design';
import './player-creator.css';
const iconPaths:Record<string,string>={
 hairStyle:'M5 15V9a7 7 0 0 1 14 0v6M5 10c4 0 5-4 5-4s3 4 9 4M7 15v4m10-4v4',
 hair:'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z',skin:'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z',
 face:'M5 10a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0Zm3 1h1m6 0h1m-7 5q3 2 6 0',
 glasses:'M2 8h8v7H3Zm12 0h8l-1 7h-7ZM10 10h4',hat:'M4 14V11a8 8 0 0 1 16 0v3ZM4 14l-3 3h16l3-3',
 top:'m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4q-4 4-8 0Z',
 bottom:'M7 3h10l4 18H3Zm5 7v11',shoes:'m4 8 4 5 5 2h6l3 3v3H2V10Z',paddle:'M8 2h8l3 4v9l-5 4v3h-4v-3l-5-4V6Z',accessory:'M9 2h6v5H9Zm-1 5h8v10H8Zm1 10h6v5H9Z',style:'M5 12v9M12 7v14M19 2v19'};
const rowIcon=(key:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[key]??iconPaths.hair}"/></svg>`;
const title=(text:string)=>text.charAt(0).toUpperCase()+text.slice(1);
const skillHelp:Record<typeof SKILLS[number],string>={serve:'Start the point with reliable placement.',return:'Control the return after the bounce.',drive:'Execute fast, attacking groundstrokes.',drop:'Land a soft shot in the kitchen.',dink:'Control soft exchanges at the net.',reset:'Take pace off an incoming attack.',volley:'Strike cleanly before the bounce.',counter:'Redirect an attack into pressure.',overhead:'Finish high balls with control.',movement:'Reach more balls around the court.',hands:'Handle fast exchanges at the net.'};

export class PlayerCreator {
 readonly dialog=document.createElement('dialog');
 private thumbnails:AvatarThumbnails|null=null;private thumbnailsReady=false;
 private library:PlayerLibrary={version:1,activeId:null,players:[]};private draft=newPlayer();private baseline='';private preview:AvatarPreview|null=null;private previewFailed=false;private loadError='';private pending:(()=>void)|null=null;
 constructor(private onPlay:(player:DesignedPlayer)=>void){
  try{this.library=parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY))}catch{this.loadError='Saved players could not be read. Saving is disabled to protect your existing roster.'}
  const active=this.library.players.find(p=>p.id===this.library.activeId);
  if(active)this.draft=structuredClone(active);this.baseline=JSON.stringify(this.draft);
  this.dialog.id='player-creator';this.dialog.setAttribute('aria-labelledby','creator-title');
  this.dialog.innerHTML=`<div class="creator-topline"><span>PICKLE RPG <i>·</i> CREATE PLAYER</span><button type="button" data-close aria-label="Close Player Design">← &nbsp; Back to court</button></div>
  <div class="creator-layout"><section class="creator-stage" aria-label="Avatar preview"><div class="creator-heading"><h2 id="creator-title">Create<br>Your Player.</h2><p>Different players.<br>A brighter court.</p></div>
  <div class="creator-lookbook" aria-label="Starting looks">${LOOKS.map((look,index)=>`<button type="button" data-template="${index}" aria-label="Use ${look.name} look"><img alt="" data-portrait="${index}"><span>${look.name}</span></button>`).join('')}</div>
  <div class="creator-preview"></div><div class="creator-plinth"></div>
  <div class="creator-identity"><label for="creator-name">PLAYER NAME<input id="creator-name" maxlength="24" autocomplete="off" placeholder="Name your player"></label>
  <label class="style-heading">PLAY STYLE <span>(OPTIONAL)</span></label><div class="creator-style-chips"><button type="button" data-style="allCourt">All-Court</button><button type="button" data-style="attacker">Power</button><button type="button" data-style="defender">Quick Hands</button><button type="button" data-style="setup">Strategic</button></div>
  <blockquote>“Small moves.<br>Big plans.”</blockquote><div class="creator-summary">${['Power','Control','Speed','Hands'].map(name=>`<div><span>${name}</span><meter aria-label="${name} summary" min="0" max="100" value="70" data-summary="${name}"></meter></div>`).join('')}</div>
  <div class="creator-roster"><label for="creator-roster">YOUR PLAYERS<select id="creator-roster"></select></label><button type="button" data-new>+ New player</button><small data-active></small></div></div>
  <div class="creator-stage-bottom"><button type="button" data-randomize>⤨ &nbsp; Randomize look</button><label for="creator-rotation">Rotate<input id="creator-rotation" type="range" min="-180" max="180" value="0"></label></div><span class="creator-motto">CHARACTERS · STRATEGY · PLAYFUL</span><span data-preview-name class="sr-only"></span></section>
  <section class="creator-editor"><div class="creator-tabs" role="tablist" aria-label="Player controls"><button type="button" role="tab" id="appearance-tab" aria-controls="appearance-panel" aria-selected="true" data-tab="appearance">${rowIcon('top')} Appearance</button><button type="button" role="tab" id="skills-tab" aria-controls="skills-panel" aria-selected="false" tabindex="-1" data-tab="skills">${rowIcon('style')} Play Style</button></div>
  <div id="appearance-panel" role="tabpanel" aria-labelledby="appearance-tab"><div class="creator-options">
  ${this.optionRow('hairStyle','Hair','⌁')}
  ${this.colorRow('hair','Hair Color',['#493629','#80533f','#d9ae76','#263640','#a43e43','#b8babc'])}
  ${this.colorRow('skin','Skin Tone',['#f0cbae','#e7af8c','#c8926e','#ad7553','#875338','#543c32'])}
  ${this.optionRow('face','Face','◉')}
  ${this.optionRow('glasses','Glasses','∞')}
  ${this.optionRow('hat','Hat / Visor','⌒')}
  ${this.optionRow('top','Jersey / Top','♧')}
  ${this.colorRow('jersey','Top Color',['#ece4ce','#b76564','#315d58','#41617a','#303d3e','#f4f0e4'])}
  ${this.optionRow('bottom','Shorts / Skirt','▱')}
  ${this.colorRow('accent','Outfit Trim',['#315d58','#985251','#41617a','#303d3e','#ece4ce'])}
  ${this.colorRow('shoes','Shoes',['#315d58','#985251','#41617a','#303d3e','#ece4ce'])}
  ${this.colorRow('paddle','Paddle',['#315d58','#b76564','#41617a','#dad3bd','#303d3e'])}
  ${this.optionRow('accessory','Accessories','◇')}
  <div class="creator-option-row"><span class="row-icon">↔</span><label for="creator-hand">Playing hand</label><select id="creator-hand"><option value="right">Right-handed</option><option value="left">Left-handed</option></select></div>
  </div></div>
  <div id="skills-panel" role="tabpanel" aria-labelledby="skills-tab" hidden><p class="creator-intro">Build your style of play. Adjust every skill from 0 to 100. These attributes affect full games and pattern practice.</p><label for="creator-preset">Start from an archetype<select id="creator-preset"><option value="">Custom skills</option>${Object.entries(ARCHETYPES).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select></label><div class="creator-skills">${SKILLS.map(skill=>`<div class="creator-skill"><label for="skill-${skill}">${title(skill)}<output for="skill-${skill}" id="value-${skill}">70</output></label><input id="skill-${skill}" data-skill="${skill}" type="range" min="0" max="100" step="1" aria-describedby="help-${skill}"><small id="help-${skill}">${skillHelp[skill]}</small></div>`).join('')}</div><p class="creator-intro">Sandbox skills, not real-world ratings. Guided rally and Shot lab keep their benchmark skills.</p></div>
  <div class="creator-confirm" hidden><p>Discard unsaved changes to switch players?</p><button type="button" data-keep>Keep editing</button><button type="button" data-discard>Discard and continue</button></div>
  <div class="creator-footer"><p data-status role="status"></p><div><button type="button" data-save>Save Player &nbsp; →</button><button type="button" class="creator-primary" data-play>Save & play ↗</button></div><small>Saved in this browser. Save & play starts a new full game.</small></div></section></div>`;
  document.body.append(this.dialog);
  this.el('[data-close]').addEventListener('click',()=>this.dialog.close());
  this.el('[data-new]').addEventListener('click',()=>this.switchDraft(()=>this.loadDraft(newPlayer())));
  this.input('#creator-roster').addEventListener('change',()=>{
   const id=this.input('#creator-roster').value;this.input('#creator-roster').value=this.draft.id;
   const selected=this.library.players.find(p=>p.id===id);if(selected)this.switchDraft(()=>this.loadDraft(selected));
  });
  this.el('[data-keep]').addEventListener('click',()=>{this.pending=null;this.el('.creator-confirm').hidden=true});
  this.el('[data-discard]').addEventListener('click',()=>{this.pending?.();this.pending=null;this.el('.creator-confirm').hidden=true});
  this.input('#creator-name').addEventListener('input',()=>{this.draft.name=this.input('#creator-name').value;this.updateCaption();this.changed()});
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button=>button.addEventListener('click',()=>{Object.assign(this.draft.appearance,{[button.dataset.key!]:button.dataset.choice});this.syncAppearance();this.refreshPreview();this.changed()}));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-color]').forEach(control=>control.addEventListener('input',()=>{Object.assign(this.draft.appearance,{[control.dataset.color!]:control.value});this.syncAppearance();this.refreshPreview();this.changed()}));
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-template]').forEach(button=>button.addEventListener('click',()=>{this.draft.appearance={...LOOKS[Number(button.dataset.template)].appearance};this.syncAppearance();this.refreshPreview();this.changed()}));
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(button=>button.addEventListener('click',()=>{this.draft.skills={...ARCHETYPES[button.dataset.style as keyof typeof ARCHETYPES].skills};this.fillSkills();this.updateSummary();this.changed()}));
  this.el('[data-randomize]').addEventListener('click',()=>{const pick=<T,>(items:readonly T[])=>items[Math.floor(Math.random()*items.length)];const look=pick(LOOKS);this.draft.appearance={...look.appearance,face:pick(APPEARANCE_OPTIONS.face),hairStyle:pick(APPEARANCE_OPTIONS.hairStyle),hat:pick(APPEARANCE_OPTIONS.hat),glasses:pick(APPEARANCE_OPTIONS.glasses)};this.syncAppearance();this.refreshPreview();this.changed()});
  this.input('#creator-hand').addEventListener('change',()=>{this.draft.handedness=this.input('#creator-hand').value as 'left'|'right';this.refreshPreview();this.changed()});
  this.dialog.querySelectorAll<HTMLInputElement>('[data-skill]').forEach(control=>control.addEventListener('input',()=>{const key=control.dataset.skill as typeof SKILLS[number];this.draft.skills[key]=Number(control.value);this.el(`#value-${key}`).textContent=control.value;this.input('#creator-preset').value='';this.updateSummary();this.changed()}));
  this.input('#creator-preset').addEventListener('change',()=>{const preset=ARCHETYPES[this.input('#creator-preset').value as keyof typeof ARCHETYPES];if(preset){this.draft.skills={...preset.skills};this.fillSkills();this.updateSummary();this.changed()}});
  this.input('#creator-rotation').addEventListener('input',()=>this.preview?.rotate(Number(this.input('#creator-rotation').value)));
  const tabs=Array.from(this.dialog.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const selectTab=(tab:HTMLButtonElement)=>{for(const button of tabs){const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;this.el(`#${button.dataset.tab}-panel`).hidden=!selected}};
  for(const tab of tabs){tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=tabs[event.key==='Home'?0:event.key==='End'?1:tab===tabs[0]?1:0];selectTab(next);next.focus()}})}
  this.el('[data-save]').addEventListener('click',()=>this.save(false));this.el('[data-play]').addEventListener('click',()=>this.save(true));
  this.fill();
 }
 private optionRow(key:keyof typeof APPEARANCE_OPTIONS,label:string,icon:string){return `<div class="creator-option-row"><span class="row-icon" aria-hidden="true">${rowIcon(key)}</span><span class="row-label">${label}</span><div class="creator-choices" role="group" aria-label="${label}">${APPEARANCE_OPTIONS[key].map(value=>`<button type="button" data-key="${key}" data-choice="${value}" aria-label="${label}: ${title(value)}" aria-pressed="false" title="${title(value)}">${value==='none'?'<span class="none-icon">⊘</span>':`<img alt="" data-thumb-key="${key}" data-thumb-value="${value}">`}<span class="choice-label">${title(value)}</span></button>`).join('')}</div></div>`}
 private colorRow(key:keyof Appearance,label:string,colors:string[]){return `<div class="creator-option-row"><span class="row-icon" aria-hidden="true">${rowIcon(key)}</span><span class="row-label">${label}</span><div class="creator-choices color-choices" role="group" aria-label="${label}">${colors.map(color=>`<button type="button" class="color-choice ${key==='shoes'||key==='paddle'?'object-choice':''}" data-key="${key}" data-choice="${color}" aria-label="${label}: ${color}" aria-pressed="false" style="--swatch:${color}">${key==='shoes'||key==='paddle'?`<img alt="" data-thumb-key="${key}" data-thumb-value="${color}">`:'<span></span>'}</button>`).join('')}<label class="custom-color" title="Custom ${label.toLowerCase()}"><input type="color" data-color="${key}" aria-label="Custom ${label.toLowerCase()}"><span>＋</span></label></div></div>`}
 private syncAppearance(){
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-template]').forEach(button=>button.setAttribute('aria-pressed',String(Object.entries(LOOKS[Number(button.dataset.template)].appearance).every(([key,value])=>this.draft.appearance[key as keyof Appearance]===value))));
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button=>button.setAttribute('aria-pressed',String(this.draft.appearance[button.dataset.key as keyof Appearance]===button.dataset.choice)));
  this.dialog.querySelectorAll<HTMLInputElement>('[data-color]').forEach(input=>input.value=this.draft.appearance[input.dataset.color as keyof Appearance]);
 }
 private loadThumbnails(){if(this.thumbnailsReady)return;try{
  this.thumbnails??=new AvatarThumbnails();
  this.dialog.querySelectorAll<HTMLImageElement>('[data-thumb-key]').forEach(img=>{const appearance={...LOOKS[img.dataset.thumbKey==='hat'?0:1].appearance,[img.dataset.thumbKey!]:img.dataset.thumbValue!};if(['face','hairStyle','glasses'].includes(img.dataset.thumbKey!))appearance.hat='none';img.src=this.thumbnails!.get(appearance,img.dataset.thumbKey!)});
  this.dialog.querySelectorAll<HTMLImageElement>('[data-portrait]').forEach(img=>img.src=this.thumbnails!.get(LOOKS[Number(img.dataset.portrait)].appearance,'full'));this.thumbnailsReady=true;
 }catch{/* Text labels remain usable if thumbnail rendering is unavailable. */}}
 private updateSummary(){const s=this.draft.skills,values={Power:(s.drive+s.overhead)/2,Control:(s.dink+s.drop+s.reset)/3,Speed:s.movement,Hands:s.hands};for(const [name,value] of Object.entries(values))(this.el(`[data-summary="${name}"]`) as HTMLMeterElement).value=value;
  this.dialog.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(button=>button.setAttribute('aria-pressed',String(SKILLS.every(skill=>this.draft.skills[skill]===ARCHETYPES[button.dataset.style as keyof typeof ARCHETYPES].skills[skill]))));
 }
 get activePlayer(){const player=this.library.players.find(p=>p.id===this.library.activeId);return player?structuredClone(player):null}
 open(){if(!this.dialog.open)this.dialog.showModal();this.refreshPreview();this.loadThumbnails();this.el('[data-close]').focus()}
 private el(selector:string){return this.dialog.querySelector<HTMLElement>(selector)!}
 private input(selector:string){return this.dialog.querySelector<HTMLInputElement|HTMLSelectElement>(selector)!}
 private switchDraft(action:()=>void){if(JSON.stringify(this.draft)!==this.baseline){this.pending=action;this.el('.creator-confirm').hidden=false;this.el('[data-keep]').focus()}else action()}
 private loadDraft(player:DesignedPlayer){this.draft=structuredClone(player);this.baseline=JSON.stringify(this.draft);this.fill();this.refreshPreview();this.changed()}
 private fill(){
  const select=this.input('#creator-roster') as HTMLSelectElement;select.replaceChildren();
  for(const player of this.library.players)select.add(new Option(player.name,player.id));
  if(!this.library.players.some(p=>p.id===this.draft.id))select.add(new Option('New unsaved player',this.draft.id));
  select.value=this.draft.id;this.input('#creator-name').value=this.draft.name;
  this.syncAppearance();
  this.input('#creator-hand').value=this.draft.handedness;this.input('#creator-preset').value='';this.fillSkills();this.updateCaption();this.updateSummary();
  const active=this.activePlayer;this.el('[data-active]').textContent=active?`Selected: ${active.name}`:'No custom player selected';
  this.el('[data-status]').textContent=this.loadError||'Create your player, then save it to your roster.';
  for(const selector of ['[data-save]','[data-play]'])(this.el(selector) as HTMLButtonElement).disabled=!!this.loadError;
 }
 private fillSkills(){for(const skill of SKILLS){this.input(`#skill-${skill}`).value=String(this.draft.skills[skill]);this.el(`#value-${skill}`).textContent=String(this.draft.skills[skill])}}
 private updateCaption(){this.el('[data-preview-name]').textContent=this.draft.name.trim()||'Your player'}
 private changed(){this.el('[data-status]').textContent=this.loadError||(JSON.stringify(this.draft)===this.baseline?'No unsaved changes.':'Unsaved changes · close and reopen to keep editing.')}
 private refreshPreview(){if(!this.dialog.open||this.previewFailed)return;try{this.preview??=new AvatarPreview(this.el('.creator-preview'));this.preview.setPlayer(this.draft)}catch{this.previewFailed=true;this.el('.creator-preview').textContent='3D preview is unavailable. You can still edit and save your player.'}}
 private save(play:boolean){
  if(this.loadError)return;
  try{
   this.library=savePlayer(localStorage,this.library,this.draft,play);this.draft=structuredClone(this.library.players.find(p=>p.id===this.draft.id)!);this.baseline=JSON.stringify(this.draft);this.fill();
   this.pending=null;this.el('.creator-confirm').hidden=true;this.el('[data-status]').textContent='Player saved. Save & play applies it to a new game.';
   if(play){this.onPlay(structuredClone(this.draft));this.dialog.close()}
  }catch(error){this.el('[data-status]').textContent=error instanceof Error&&error.name==='QuotaExceededError'?'Browser storage is full. Your edits are still here; the player was not saved.':error instanceof Error?error.message:'Could not save. Your edits are still here.'}
 }
}
