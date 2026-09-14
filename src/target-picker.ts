import {isOpposingTarget} from './engine/controllers';
import {COURT,type PlayerId} from './engine/model';
import {shotIcon} from './shot-illustration';
import type {Match} from './match';
import {choiceCopy} from './shot-choice';
import {SHOT_FAMILIES} from './engine/shot-families';
import type {CourtScene} from './scene';
/** Court coordinates survive camera movement; selections belong to one contact. */
export class TargetPicker {
 private panel=document.createElement('section');
 private point:{x:number;z:number;playerId?:PlayerId}|null=null;
 private engine:Match['engine']|null=null;
 private index=-1;
 private reception=false;
 private enabled=false;
 get active(){return !!this.point&&!this.panel.hidden}
 constructor(private match:Match,private scene:CourtScene){
  this.panel.className='target-picker';this.panel.hidden=true;this.panel.setAttribute('aria-label','Court target shot picker');
  document.body.append(this.panel);
  scene.onCourtTap=point=>{
   if(!this.enabled||!this.match.decisionTeam||!isOpposingTarget(point,this.match.decisionTeam))return false;
   const serving=match.targetingMenu.some(choice=>choice.intent.type==='serve');
   if(!serving&&(Math.abs(point.x)>COURT.width/2||Math.abs(point.z)>COURT.length/2))return false;
   this.point=point;this.engine=match.engine;this.index=match.state.shotIndex;this.reception=match.receptionDecision;
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
  const s=this.match.state;
  this.enabled=active&&this.match.replayIndex===null&&!this.match.customBusy&&!this.match.thinking&&(this.match.manualReceptionDecision||this.match.humanContact);
  if(this.point&&(!active||this.engine!==this.match.engine||this.index!==s.shotIndex||this.reception!==this.match.receptionDecision||s.phase==='complete'||this.match.replayIndex!==null)){this.clear();return}
  const target=this.match.shot.intent.target;
  if(this.point&&s.phase==='flight'&&!this.match.receptionDecision&&(target.kind!=='point'||target.x!==this.point.x||target.z!==this.point.z)){this.clear();return}
  this.panel.hidden=!this.point||!this.enabled;
  if(this.point&&!this.panel.hidden){
   const p=this.scene.projectTarget(this.point),width=this.panel.offsetWidth,height=this.panel.offsetHeight;
   const left=Math.max(8,Math.min(innerWidth-width-8,p.x-width/2)),top=Math.max(8,Math.min(innerHeight-height-8,p.y-height/2));
   this.panel.style.left=`${left}px`;this.panel.style.top=`${top}px`;
   // Keep the aperture and reticle on the exact court point, even when the wheel is clamped at a screen edge.
   this.panel.style.setProperty('--aim-x',`${p.x-left-2}px`);this.panel.style.setProperty('--aim-y',`${p.y-top-2}px`);
  }
 }
 private status(text:string){this.panel.querySelector<HTMLElement>('.target-picker-status')!.textContent=text}
 private draw(){
  this.panel.hidden=false;
  const seen=new Set<string>();
  const choices=this.match.targetingMenu.flatMap(choice=>{
   try{this.match.previewMenuTarget(choice,this.point!)}catch{return []}
   // Reception choices are air-first. Keep one playable Lob, with a bounced fallback.
   const key=choice.intent.type==='lob'?'lob':JSON.stringify({...choice.intent,target:undefined,source:undefined,timing:choice.timing});
   if(seen.has(key))return [];seen.add(key);
   const label=['serve','return'].includes(choice.intent.type)?choiceCopy(choice.intent).name:SHOT_FAMILIES[choice.intent.type].name;
   return [{...choice,label}];
  });
  if(!choices.length){this.clear();return}
  const slice=(choice:typeof choices[number],index:number)=>{
   const type=choice.intent.type,caption=choice.label;
   const step=360/choices.length,angle=index*step-90,start=angle-step/2+.35,end=angle+step/2-.35;
   const at=(degrees:number,radius:number)=>({x:50+radius*Math.cos(degrees*Math.PI/180),y:50+radius*Math.sin(degrees*Math.PI/180)});
   const edge=Array.from({length:17},(_,i)=>at(start+(end-start)*i/16,50));
   const clip=choices.length===1?'none':`polygon(50% 50%,${edge.map(p=>`${p.x}% ${p.y}%`).join(',')})`;
   const label=at(angle,33);
   return `<button type="button" class="target-slice" style="clip-path:${clip}" data-type="${type}" data-choice="${index}"><span class="target-slice-content" style="left:${label.x}%;top:${label.y}%">${shotIcon(choice.intent,index,'wheel')}<span class="target-slice-label">${caption}</span></span></button>`;
  };
  this.panel.innerHTML=`<div class="target-wheel" role="group" aria-label="Shot type"><div class="target-slices">${choices.map(slice).join('')}</div><span class="target-wheel-center" aria-hidden="true"><svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="34"/><circle cx="40" cy="40" r="12"/><path d="M40 2v16M40 62v16M2 40h16M62 40h16"/><circle class="reticle-dot" cx="40" cy="40" r="2"/></svg></span></div><span class="target-picker-status sr-only" role="status"></span>`;

  for(const button of Array.from(this.panel.querySelectorAll<HTMLButtonElement>('[data-type]'))){
   const choice=choices[Number(button.dataset.choice)];
   button.title=`Play ${choice.label}${choice.timing?choice.timing==='air'?' · before bounce':' · after bounce':''}`;
   button.addEventListener('click',()=>{
    try{this.match.playMenuTarget(choice,this.point!);this.panel.hidden=true}
    catch(error){this.status((error as Error).message);this.draw()}

   });
  }
  this.sync(true);this.panel.querySelector<HTMLButtonElement>('[data-type]')?.focus({preventScroll:true});
 }
}
