import {hudButtonIcon} from './hud-button';
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
 readonly team:Team|null;
 readonly choices:TargetChoice[];
 readonly context:unknown;
 readonly decision:string;
 readonly enabled:boolean;
 aim?():void;
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
 private page=0;
 get active(){return !!this.point&&!this.panel.hidden}
 constructor(private source:TargetingSource,private scene:CourtScene){
  this.panel.className='target-picker';this.panel.hidden=true;this.panel.setAttribute('aria-label','Court target shot picker');
  document.body.append(this.panel);
  scene.onCourtTap=point=>{
   if(!this.enabled||!this.source.team||!isOpposingTarget(point,this.source.team))return false;
   const serving=this.source.choices.some(choice=>choice.intent.type==='serve');
   if(!serving&&(Math.abs(point.x)>COURT.width/2||Math.abs(point.z)>COURT.length/2))return false;
   this.source.aim?.();this.page=0;this.point=point;this.context=this.source.context;this.decision=this.source.decision;
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
 clear(){this.point=null;this.panel.hidden=true;this.scene.setSelectedTarget(null);this.scene.setShotPreview(null)}
 sync(active:boolean){
  this.enabled=active&&this.source.enabled;
  if(this.point&&(!this.enabled||this.context!==this.source.context||this.decision!==this.source.decision)){this.clear();return}
  this.panel.hidden=!this.point||!this.enabled;
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
  const pageCount=Math.ceil(choices.length/4);this.page=Math.min(this.page,pageCount-1);
  const visible=choices.slice(this.page*4,this.page*4+4);
  const tile=(choice:typeof choices[number],index:number)=>{
   const timing=choice.timing?(choice.timing==='air'?'Before bounce':'After bounce'):'';
   return `<button type="button" class="target-shot" data-type="${choice.intent.type}" data-choice="${this.page*4+index}">${shotIcon(choice.intent,index,'wheel')}<span class="target-shot-label">${choice.label}</span>${timing?`<span class="target-shot-timing" data-timing="${choice.timing}">${timing}</span>`:''}</button>`;
  };
  this.panel.innerHTML=`<div class="target-wheel" role="group" aria-label="Shot type"><header class="target-picker-heading"><span>Choose your shot</span><button type="button" class="target-picker-close" aria-label="Close shot picker">${hudButtonIcon('close')}</button></header><div class="target-shots" data-has-timing="${choices.some(choice=>!!choice.timing)}">${visible.map(tile).join('')}</div>${pageCount>1?`<nav class="target-picker-pages" aria-label="Shot options pages"><button type="button" data-page-prev aria-label="Previous shots" ${this.page===0?'disabled':''}>‹</button><span aria-live="polite">${this.page+1} / ${pageCount}</span><button type="button" data-page-next aria-label="More shots" ${this.page===pageCount-1?'disabled':''}>More shots <span aria-hidden="true">›</span></button></nav>`:''}<span class="target-picker-status" role="status"></span></div>`;
  this.panel.querySelector('.target-picker-close')!.addEventListener('click',()=>this.clear());
  this.panel.querySelector('[data-page-prev]')?.addEventListener('click',()=>{this.page--;this.draw()});
  this.panel.querySelector('[data-page-next]')?.addEventListener('click',()=>{this.page++;this.draw()});

  for(const button of Array.from(this.panel.querySelectorAll<HTMLButtonElement>('[data-type]'))){
   const choice=choices[Number(button.dataset.choice)];
   button.title=`Play ${choice.label}${choice.timing?choice.timing==='air'?' · before bounce':' · after bounce':''}`;
   button.addEventListener('click',()=>{
    try{this.source.play(choice,this.point!);this.panel.hidden=true}
    catch(error){this.draw();if(this.active)this.status((error as Error).message)}

   });
  }
  this.sync(true);this.panel.querySelector<HTMLButtonElement>('[data-type]')?.focus({preventScroll:true});
 }
}

/** Single-player adapter shares the exact same wheel with remote play. */
export class TargetPicker extends CourtTargetPicker {
 constructor(match:Match,scene:CourtScene){
  super({
   get team(){return match.decisionTeam},
   get choices(){return match.targetingMenu},
   get context(){return match.engine},
   get decision(){return `${match.state.shotIndex}:${match.receptionDecision}`},
   get enabled(){return match.replayIndex===null&&!match.customBusy&&!match.thinking&&(match.manualReceptionDecision||match.humanContact)},
   validate:(choice,point)=>match.previewMenuTarget(choice,point),
   play:(choice,point)=>match.playMenuTarget(choice,point),
  },scene);
 }
}
