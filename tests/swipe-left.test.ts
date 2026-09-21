import test from 'node:test';
import assert from 'node:assert/strict';
import {installSwipeLeft} from '../src/swipe-left';

class Card extends EventTarget{
 style={transform:'',removeProperty:()=>{this.style.transform='';}};
 setPointerCapture(){}
}
function setup(){
 const card=new Card();let swipes=0;
 installSwipeLeft(card as unknown as HTMLElement,()=>swipes++);
 const send=(type:string,x=0,y=0,extra={})=>{
  const event=new Event(type,{cancelable:true});
  Object.assign(event,{pointerType:'touch',isPrimary:true,pointerId:1,clientX:x,clientY:y,detail:1,...extra});
  card.dispatchEvent(event);return event;
 };
 return {card,send,count:()=>swipes};
}
test('left swipe opens confirmation once and suppresses the card navigation click',()=>{
 const s=setup();s.send('pointerdown',200,50);s.send('pointermove',100,54);s.send('pointerup',100,54);
 assert.equal(s.count(),1);assert.equal(s.card.style.transform,'');
 assert.equal(s.send('click').defaultPrevented,true);
 s.send('pointerdown',100,50);s.send('pointerup',100,50);
 assert.equal(s.send('click').defaultPrevented,false);
});
test('scrolling, taps, right swipes and mouse drags do not trigger exit',()=>{
 for(const [dx,dy,extra] of [[0,0,{}],[10,100,{}],[100,0,{}],[-100,0,{pointerType:'mouse'}]] as const){
  const s=setup();s.send('pointerdown',200,0,extra);s.send('pointermove',200+dx,dy,extra);s.send('pointerup',200+dx,dy,extra);
  assert.equal(s.count(),0);
 }
});
test('cancelled gestures and multi-touch do not trigger exit',()=>{
 for(const cancel of ['pointercancel','secondTouch']){
  const s=setup();s.send('pointerdown',200);s.send('pointermove',100);
  if(cancel==='secondTouch')s.send('pointerdown',100,0,{pointerId:2,isPrimary:false});
  else s.send('pointercancel');
  s.send('pointerup',100);assert.equal(s.count(),0);
 }
});
