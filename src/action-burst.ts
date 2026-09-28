export type ActionBurstTone='pink'|'cyan'|'lime';
export interface ActionBurstFrame {text:string;age:number;x:number;y:number;visible?:boolean;reduced?:boolean;tone?:ActionBurstTone;duration?:number}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Sample by age rather than CSS time so pause, replay and scrubbing stay exact. */
export function actionBurstMotion(age:number,duration=1.25,reduced=false){
 const visible=age>=0&&age<duration;
 const enter=clamp(age/.18),exit=clamp((age-(duration-.25))/.25);
 const pop=1+2.70158*Math.pow(enter-1,3)+1.70158*Math.pow(enter-1,2);
 return {visible,opacity:visible?1-exit:0,scale:reduced?1:.35+.65*pop+exit*.12,rotation:reduced?0:-8+Math.sin(age*24)*4*Math.max(0,1-age/.4)};
}
/** One reusable comic impact overlay; owns no game logic or timers. */
export class ActionBurst {
 readonly element:HTMLDivElement;
 private label:SVGTextElement;
 constructor(private host:HTMLElement){
  this.element=document.createElement('div');this.element.className='action-burst';this.element.hidden=true;this.element.setAttribute('aria-hidden','true');
  this.element.innerHTML=`<svg viewBox="0 0 320 190" focusable="false"><path class="burst-shadow" d="m36 66-17-24 60 8 5-30 40 24 26-34 23 34 46-28-2 34 66-12-23 31 44 15-40 21 33 27-60-1 5 37-48-20-25 32-26-29-50 22 7-36-60 6 29-29L9 84Z" transform="translate(5 7)"/><path class="burst-shape" d="m36 66-17-24 60 8 5-30 40 24 26-34 23 34 46-28-2 34 66-12-23 31 44 15-40 21 33 27-60-1 5 37-48-20-25 32-26-29-50 22 7-36-60 6 29-29L9 84Z"/><text x="160" y="109" text-anchor="middle" textLength="233" lengthAdjust="spacingAndGlyphs"></text></svg>`;
  this.label=this.element.querySelector('text')!;host.append(this.element);
 }
 render(frame:ActionBurstFrame){
  const motion=actionBurstMotion(frame.age,frame.duration,frame.reduced);
  this.element.hidden=!motion.visible||frame.visible===false;if(this.element.hidden)return;
  this.label.textContent=frame.text;this.element.dataset.tone=frame.tone??'pink';
  const half=Math.min(87,this.host.clientWidth*.204);
  this.element.style.left=`${Math.max(half,Math.min(this.host.clientWidth-half,frame.x))}px`;
  this.element.style.top=`${Math.max(51,Math.min(this.host.clientHeight-51,frame.y))}px`;
  this.element.style.opacity=String(motion.opacity);
  this.element.style.transform=`translate(-50%,-50%) rotate(${motion.rotation}deg) scale(${motion.scale})`;
 }
 clear(){this.element.hidden=true}
 dispose(){this.element.remove()}
}
