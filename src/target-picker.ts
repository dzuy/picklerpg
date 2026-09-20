import {PLAYER_PROFILES,ARCHETYPES} from './engine/player-profiles';
import {incomingShotLabel} from './incoming-shot';
import {assessChoice,type ShotAssessment} from './shot-assessment';
import {interpretShot} from './shot-description';
import {isSpeedUp} from './engine/speed-up';
import {isOpposingTarget} from './engine/controllers';
import {COURT,type PlayerId,type Team,type ShotIntent} from './engine/model';
import {shotIcon} from './shot-illustration';
import type {Match} from './match';
import {choiceCopy} from './shot-choice';
import {SHOT_FAMILIES} from './engine/shot-families';
import type {CourtScene} from './scene';
export type TargetPoint={x:number;z:number;playerId?:PlayerId};
export type TargetChoice={intent:ShotIntent;timing?:'air'|'bounce'};
/** A decision source supplies legal choices; the wheel never resolves gameplay. */
export interface TargetingSource {
 readonly incoming?:string|null;
 readonly team:Team|null;
 readonly choices:TargetChoice[];
 readonly context:unknown;
 readonly decision:string;
 readonly enabled:boolean;
 assess?(choice:TargetChoice,point:TargetPoint):ShotAssessment|undefined;
 aim?():void;
 describe?(text:string,point:TargetPoint,signal:AbortSignal):Promise<void>;
 validate(choice:TargetChoice,point:TargetPoint):unknown;
 play(choice:TargetChoice,point:TargetPoint):void;
}
/** Court coordinates survive camera movement; selections belong to one contact. */
export class CourtTargetPicker {
 private panel=document.createElement('section');
 private point:{x:number;z:number;playerId?:PlayerId}|null=null;
 private context:unknown=null;
 private decision='';
 private enabled=false;
 private shotDescription='';
 private interpretation:AbortController|null=null;
 get active(){return !!this.point&&!this.panel.hidden}
 constructor(private source:TargetingSource,private scene:CourtScene){
  this.panel.className='target-picker';this.panel.tabIndex=-1;this.panel.hidden=true;this.panel.setAttribute('aria-label','Court target shot picker');
  document.body.append(this.panel);
  scene.onCourtTap=point=>{
   if(this.interpretation||!this.enabled||!this.source.team||!isOpposingTarget(point,this.source.team))return false;
   const serving=this.source.choices.some(choice=>choice.intent.type==='serve');
   if(!serving&&(Math.abs(point.x)>COURT.width/2||Math.abs(point.z)>COURT.length/2))return false;
   this.source.aim?.();if(this.context!==this.source.context||this.decision!==this.source.decision)this.shotDescription='';this.point=point;this.context=this.source.context;this.decision=this.source.decision;
   scene.setSelectedTarget(point);scene.setShotPreview(null);this.draw();return true;
  };
  // Consume the whole dismissal gesture so it cannot place a new target or activate a control underneath.
  let dismissPointer:number|null=null,suppressClick=false;
  document.addEventListener('pointerdown',event=>{
   suppressClick=false;
   if(!this.active||(event.target instanceof Element&&event.target.closest('.target-wheel')))return;
   dismissPointer=event.pointerId;suppressClick=true;event.preventDefault();event.stopImmediatePropagation();this.clear();
  },true);
  document.addEventListener('pointerup',event=>{if(event.pointerId===dismissPointer){dismissPointer=null;event.preventDefault();event.stopImmediatePropagation()}},true);
  document.addEventListener('pointercancel',()=>{dismissPointer=null;suppressClick=false},true);
  document.addEventListener('click',event=>{if(suppressClick){suppressClick=false;event.preventDefault();event.stopImmediatePropagation()}},true);
  this.panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();this.clear()}});

 }
 clear(){this.interpretation?.abort();this.interpretation=null;this.point=null;this.panel.hidden=true;this.scene.setSelectedTarget(null);this.scene.setShotPreview(null)}
 sync(active:boolean){
  this.enabled=active&&this.source.enabled;
  if(this.point&&((!this.enabled&&!this.interpretation)||this.context!==this.source.context||this.decision!==this.source.decision)){this.clear();return}
  this.panel.hidden=!this.point||(!this.enabled&&!this.interpretation);
  if(this.point&&!this.panel.hidden){
   const p=this.scene.projectTarget(this.point),width=this.panel.offsetWidth,height=this.panel.offsetHeight;
   const left=Math.max(8,Math.min(innerWidth-width-8,p.x-width/2));
   // Prefer space below or above the landing point so the court marker stays visible.
   const preferredTop=p.y+24+height<=innerHeight-8?p.y+24:p.y-height-24;
   const top=Math.max(8,Math.min(innerHeight-height-8,preferredTop));
   this.panel.style.left=`${left}px`;this.panel.style.top=`${top}px`;
  }
 }
 private status(text:string){this.panel.querySelector<HTMLElement>('.target-picker-status')!.textContent=text}
 private draw(){
  this.panel.hidden=false;
  const seen=new Set<string>();
  const choices=this.source.choices.flatMap(choice=>{
   try{this.source.validate(choice,this.point!)}catch{return []}
   // Reception choices are air-first. Keep one playable Lob, with a bounced fallback.
   const key=choice.intent.type==='lob'?'lob':JSON.stringify({...choice.intent,target:undefined,source:undefined,timing:choice.timing});
   if(seen.has(key))return [];seen.add(key);
   const label=isSpeedUp(choice.intent)?'Speed Up':['serve','return'].includes(choice.intent.type)?choiceCopy(choice.intent).name:SHOT_FAMILIES[choice.intent.type].name;
   return [{...choice,label}];
  });
  if(!choices.length){this.clear();return}
  const meter=(label:'Risk'|'Pressure',level:ShotAssessment['risk']|undefined)=>{
   const count=level==='High'?3:level==='Medium'?2:level==='Low'?1:0;
   const description=level?`${label}: ${level} (${count} of 3)`:`${label}: unavailable`;
   const icon=label==='Risk'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 4.1 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></svg>':'💪';
   return `<span class="target-shot-rating" role="img" aria-label="${description}" title="${description}" data-metric="${label.toLowerCase()}" data-level="${count}"><span class="shot-rating-icon" aria-hidden="true">${icon}</span><span class="shot-rating-bars" aria-hidden="true">${[1,2,3].map(n=>`<i class="${n<=count?'is-filled':''}"></i>`).join('')}</span></span>`;
  };
  const tile=(choice:typeof choices[number],index:number)=>{
   const timing=choice.timing?(choice.timing==='air'?'Before bounce':'After bounce'):'';
   const rating=this.source.assess?.(choice,this.point!);
   return `<button type="button" class="target-shot" data-type="${choice.intent.type}" data-choice="${index}">${shotIcon(choice.intent,index,'wheel')}<span class="target-shot-copy"><span class="target-shot-label">${choice.label}</span>${timing?`<span class="target-shot-timing" data-timing="${choice.timing}">${timing}</span>`:''}<span class="target-shot-ratings">${meter('Risk',rating?.risk)}${meter('Pressure',rating?.pressure)}</span></span></button>`;
  };
  this.panel.innerHTML=`<div class="target-wheel" role="group" aria-label="Shot type"><div class="target-shots" role="group" aria-label="Shot options. Scroll for more shots.">${choices.map(tile).join('')}</div><form class="target-shot-description"><label><span class="sr-only">Describe your shot</span><input type="text" placeholder="Describe your shot…" maxlength="240" enterkeyhint="go" autocomplete="off" required></label><button type="submit" aria-label="Play described shot">Go</button></form><span class="target-picker-status" role="status"></span></div>`;
  if(this.source.incoming){
   const heading=document.createElement('p');heading.className='target-incoming-shot';heading.textContent=this.source.incoming;
   this.panel.querySelector('.target-wheel')!.prepend(heading);
  }
  const description=this.panel.querySelector<HTMLInputElement>('.target-shot-description input')!;
  description.value=this.shotDescription;
  description.addEventListener('input',()=>{this.shotDescription=description.value});
  this.panel.querySelector<HTMLFormElement>('.target-shot-description')!.addEventListener('submit',async event=>{
   event.preventDefault();
   if(this.interpretation)return;
   const controller=new AbortController();
   try{
    if(!this.active||!this.source.enabled)throw Error('Wait for your turn, then choose a target again.');
    if(!this.source.describe)throw Error('Shot interpretation is unavailable.');
    if(!description.value.trim())throw Error('Describe the shot you want to try.');
    this.interpretation=controller;
    this.panel.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input').forEach(control=>control.disabled=true);
    this.panel.setAttribute('aria-busy','true');this.status('Working...');
    await this.source.describe(description.value.trim(),this.point!,controller.signal);
    if(controller.signal.aborted)return;
    this.shotDescription='';description.blur();this.clear();
   }catch(error){
    if(!controller.signal.aborted){this.interpretation=null;this.draw();if(this.active)this.status((error as Error).message);}
   }finally{if(this.interpretation===controller)this.interpretation=null;this.panel.removeAttribute('aria-busy');}
  });

  for(const button of Array.from(this.panel.querySelectorAll<HTMLButtonElement>('[data-type]'))){
   const choice=choices[Number(button.dataset.choice)];
   button.title=`Play ${choice.label}${choice.timing?choice.timing==='air'?' · before bounce':' · after bounce':''}`;
   button.addEventListener('click',()=>{
    try{this.source.play(choice,this.point!);this.panel.hidden=true}
    catch(error){this.draw();if(this.active)this.status((error as Error).message)}

   });
  }
  this.sync(true);this.panel.focus({preventScroll:true});
 }
}

/** Single-player adapter shares the exact same wheel with remote play. */
export class TargetPicker extends CourtTargetPicker {
 constructor(match:Match,scene:CourtScene){
  super({
   get incoming(){return incomingShotLabel(match.state.shotHistory.at(-1),match.targetingMenu.some(c=>c.intent.type==='serve'))},
   get team(){return match.decisionTeam},
   get choices(){return match.targetingMenu},
   get context(){return match.engine},
   get decision(){return `${match.state.shotIndex}:${match.receptionDecision}`},
   get enabled(){return match.replayIndex===null&&!match.customBusy&&!match.thinking&&(match.manualReceptionDecision||match.humanContact)},
   async describe(text,point,signal){
    const engine=match.engine,decision=this.decision;
    const parsed=await interpretShot(text,{selectedTarget:point,contacts:match.selectionContexts,players:match.state.players,actingTeam:match.decisionTeam,roster:match.state.players.map(player=>({id:player.id,name:match.getPlayerDesign(player.id)?.name??(match.lineup[player.id]?ARCHETYPES[match.lineup[player.id]!]:PLAYER_PROFILES[player.id]).name,team:player.team}))},signal);
    signal.throwIfAborted();
    if(match.engine!==engine||this.decision!==decision||!this.enabled)throw Error('The decision changed. Choose a shot again.');
    match.playDescribedChoice(match.describedChoice(parsed,text,point),text);
   },
   assess:(choice,point)=>assessChoice(choice,point,match.shotAssessmentContexts),
   validate:(choice,point)=>match.previewMenuTarget(choice,point),
   play:(choice,point)=>match.playMenuTarget(choice,point),
  },scene);
 }
}
