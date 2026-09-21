/** Touch-only horizontal gesture; vertical scrolling and normal taps stay native. */
export function installSwipeLeft(card:HTMLElement,onSwipe:()=>void){
 let start:{id:number;x:number;y:number}|null=null,blocked=false,suppressClick=false;
 const reset=()=>{start=null;card.style.removeProperty('transform');};
 card.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch')return;
  if(!event.isPrimary){blocked=true;reset();return;}
  suppressClick=false;blocked=false;
  start={id:event.pointerId,x:event.clientX,y:event.clientY};
  card.setPointerCapture(event.pointerId);
 });
 card.addEventListener('pointermove',event=>{
  if(!start||event.pointerId!==start.id||blocked)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.abs(dy)>16&&Math.abs(dy)>Math.abs(dx)){blocked=true;reset();return;}
  if(Math.abs(dx)>12)suppressClick=true;
  if(dx<0)card.style.transform=`translateX(${Math.max(-64,dx*.5)}px)`;
 });
 card.addEventListener('pointerup',event=>{
  if(!start||event.pointerId!==start.id)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  const swiped=!blocked&&dx<=-72&&Math.abs(dx)>Math.abs(dy)*2;
  if(swiped)suppressClick=true;
  reset();
  if(swiped)onSwipe();
 });
 card.addEventListener('pointercancel',()=>{suppressClick=true;blocked=true;reset();});
 card.addEventListener('lostpointercapture',reset);
 card.addEventListener('click',event=>{
  if(suppressClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}
 },true);
}
