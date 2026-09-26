/** Shared tuning for mouse, pen and touch. Try ?shotHoldMs=600 during playtesting. */
export const SHOT_POWER_UI={holdMs:100,moveTolerance:10,step:.1};
export function shotHoldDelay(search:string):number{
 const raw=new URLSearchParams(search).get('shotHoldMs');
 const value=raw===null?NaN:Number(raw);
 return Number.isFinite(value)&&value>=0&&value<=2000?value:SHOT_POWER_UI.holdMs;
}
export function attachShotPower(button:HTMLButtonElement,wheel:HTMLElement,label:string,callbacks:{begin?:()=>void;preview:(power:number)=>void;play:(power?:number)=>void;cancel:()=>void},holdMs:number){
 let timer:ReturnType<typeof setTimeout>|undefined,pointer:number|null=null,startX=0,startY=0,openedX=0,active=false,suppressClick=false,hasMoved=false,value=50;
 let popup:HTMLDivElement|null=null,range:HTMLInputElement|null=null;
 const stopTimer=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined};
 const close=()=>{stopTimer();active=false;popup?.remove();popup=null;range=null;button.classList.remove('is-power-adjusting');callbacks.cancel()};
 const preview=()=>{if(range){range.value=String(value);range.setAttribute('aria-valuetext',`${Math.round(value)}% power`);}callbacks.preview(value/100)};
 const open=(keyboard=false)=>{
  active=true;value=50;hasMoved=false;button.classList.add('is-power-adjusting');
  popup=document.createElement('div');popup.className='shot-power-popover'+(keyboard?' is-keyboard':'');popup.setAttribute('role','group');popup.setAttribute('aria-label',`${label} control and power`);
  popup.innerHTML='<input type="range" min="0" max="100" step="0.1" value="50" aria-label="Control to power" aria-description="Arrow keys to adjust, Enter to play, Escape to cancel">';
  document.body.append(popup);range=popup.querySelector('input')!;range.step=String(SHOT_POWER_UI.step);
  const rect=button.getBoundingClientRect();popup.style.width=`${Math.max(0,rect.width-32)}px`;popup.style.left=`${rect.left+16}px`;
  // Anchor the track just inside this shot’s top edge, above the holding finger.
  popup.style.top=`${Math.max(8,rect.top+2)}px`;
  range.addEventListener('input',()=>{value=Number(range!.value);preview()});
  popup.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();button.focus()}
   if(event.key==='Enter'){event.preventDefault();const power=value/100;close();callbacks.play(power)}
  });
  preview();
 };
 button.addEventListener('contextmenu',event=>event.preventDefault());
 // Keep normal list scrolling until the hold activates, then let the finger
 // travel onto the meter without Safari scrolling the selector underneath it.
 button.addEventListener('touchmove',event=>{if(active)event.preventDefault()},{passive:false});
 button.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  callbacks.begin?.();close();suppressClick=false;pointer=event.pointerId;button.setPointerCapture(pointer);startX=event.clientX;startY=event.clientY;
  const activate=()=>{timer=undefined;if(pointer===null||!button.isConnected)return;openedX=startX;button.setPointerCapture(pointer);suppressClick=true;open()};
  if(holdMs<=0)activate();else timer=setTimeout(activate,holdMs);
 });
 button.addEventListener('pointermove',event=>{
  if(event.pointerId!==pointer)return;
  if(!active){if(Math.hypot(event.clientX-startX,event.clientY-startY)>SHOT_POWER_UI.moveTolerance){stopTimer();suppressClick=true}return;}
  if(!hasMoved&&Math.abs(event.clientX-openedX)<1)return;
  hasMoved=true;
  const rect=range!.getBoundingClientRect();
  const next=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100));
  if(next!==value){value=next;preview()}
 });
 button.addEventListener('pointerup',event=>{
  if(event.pointerId!==pointer)return;stopTimer();pointer=null;
  if(!active)return;
  const rect=wheel.getBoundingClientRect(),meter=popup!.getBoundingClientRect();
  const inside=(r:DOMRect)=>event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
  const play=inside(rect)||inside(meter),power=value/100;close();
  if(play)callbacks.play(power);
 });
 button.addEventListener('pointercancel',()=>{pointer=null;suppressClick=true;close()});
 button.addEventListener('lostpointercapture',()=>{if(pointer!==null){pointer=null;suppressClick=true;close()}});
 button.addEventListener('click',event=>{if(suppressClick){event.preventDefault();suppressClick=false;return}callbacks.play()});
 button.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();callbacks.begin?.();close();open(true);range!.focus()}});
 wheel.addEventListener('scroll',()=>{if(active||timer!==undefined){pointer=null;suppressClick=true;close()}},true);
 return ()=>{pointer=null;close()};
}
