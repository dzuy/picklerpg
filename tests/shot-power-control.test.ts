import test from 'node:test';
import assert from 'node:assert/strict';
import {attachShotPower} from '../src/shot-power-control';

// A small DOM boundary lets real timers and pointer sequences exercise the gesture
// without depending on a browser or advancing a saved game.
class ElementStub {
 listeners=new Map<string,Array<(e:any)=>void>>();style:Record<string,string>={};className='';innerHTML='';textContent='';value='50';step='5';isConnected=true;offsetHeight=100;
 classList={add:()=>{},remove:()=>{}};
 children=new Map<string,ElementStub>();
 constructor(public rect={left:100,right:340,top:200,bottom:280,width:240,height:80}){}
 addEventListener(name:string,fn:(e:any)=>void){this.listeners.set(name,[...(this.listeners.get(name)??[]),fn])}
 fire(name:string,extra:Record<string,unknown>={}){const e={isPrimary:true,button:0,pointerId:1,clientX:220,clientY:240,preventDefault(){},stopPropagation(){},...extra};for(const fn of this.listeners.get(name)??[])fn(e)}
 setAttribute(){}setPointerCapture(){}focus(){}remove(){this.isConnected=false}
 getBoundingClientRect(){return this.rect}
 querySelector(selector:string){if(!this.children.has(selector))this.children.set(selector,new ElementStub());return this.children.get(selector)!}
}
function fixture(t:any,holdMs=100){
 t.mock.timers.enable({apis:['setTimeout']});
 let popup:ElementStub|undefined;
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldHeight=Object.getOwnPropertyDescriptor(globalThis,'innerHeight');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new ElementStub(),body:{append:(p:ElementStub)=>{popup=p}}}});
 Object.defineProperty(globalThis,'innerHeight',{configurable:true,value:800});
 t.after(()=>{if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else delete (globalThis as any).document;if(oldHeight)Object.defineProperty(globalThis,'innerHeight',oldHeight);else delete (globalThis as any).innerHeight});
 const button=new ElementStub(),wheel=new ElementStub({left:80,right:400,top:180,bottom:600,width:320,height:420}),plays:Array<number|undefined>=[],previews:number[]=[];
 const cleanup=attachShotPower(button as any,wheel as any,'Drive',{preview:p=>previews.push(p),play:p=>plays.push(p),cancel:()=>{}},holdMs);
 return {button,wheel,plays,previews,cleanup,popup:()=>popup};
}
test('zero delay opens immediately and accepts a swipe before any timer runs',t=>{
 const f=fixture(t,0);f.button.fire('pointerdown');
 assert.deepEqual(f.previews,[.5]);assert.ok(f.popup());
 f.button.fire('pointermove',{clientX:340});
 f.button.fire('pointerup',{clientX:340});f.button.fire('click');
 assert.deepEqual(f.plays,[1]);
});
test('tap plays once at the unchanged default and never opens a meter with a hold override',t=>{
 const f=fixture(t);f.button.fire('pointerdown');t.mock.timers.tick(99);assert.deepEqual(f.previews,[]);
 f.button.fire('pointerup');f.button.fire('click');t.mock.timers.tick(100);
 assert.deepEqual(f.plays,[undefined]);assert.equal(f.popup(),undefined);
});
test('hold opens at the midpoint; sliding and release commits only the adjusted shot',t=>{
 const f=fixture(t);f.button.fire('pointerdown');t.mock.timers.tick(100);
 assert.deepEqual(f.previews,[.5]);assert.deepEqual(f.plays,[]);
 assert.equal(f.popup()!.style.top,'202px');assert.equal(f.popup()!.style.width,'208px');
 f.button.fire('pointermove',{clientX:340});assert.equal(f.previews.at(-1),1);
 f.button.fire('pointerup',{clientX:340});f.button.fire('click');assert.deepEqual(f.plays,[1]);assert.equal(f.popup()!.isConnected,false);
});
for(const cancel of ['scroll','pointercancel','outside','cleanup'])test(`${cancel} cancels an adjustment without playing`,t=>{
  const f=fixture(t);f.button.fire('pointerdown');t.mock.timers.tick(100);
  if(cancel==='scroll')f.wheel.fire('scroll');else if(cancel==='cleanup')f.cleanup();else if(cancel==='outside')f.button.fire('pointerup',{clientX:800});else f.button.fire('pointercancel');
  assert.deepEqual(f.plays,[]);assert.equal(f.popup()!.isConnected,false);
});
test('moving to scroll before the hold threshold suppresses the synthetic click',t=>{
 const f=fixture(t);f.button.fire('pointerdown');f.button.fire('pointermove',{clientY:270});t.mock.timers.tick(100);f.button.fire('pointerup');f.button.fire('click');
 assert.deepEqual(f.plays,[]);assert.deepEqual(f.previews,[]);
});

test('dragging back to the starting position restores midpoint power',t=>{
 const f=fixture(t);f.button.fire('pointerdown');t.mock.timers.tick(100);
 f.button.fire('pointermove',{clientX:340});f.button.fire('pointermove',{clientX:220});
 assert.equal(f.previews.at(-1),.5);f.button.fire('pointerup');assert.deepEqual(f.plays,[.5]);
});

test('dragging advances smoothly between the old five-percent steps',t=>{
 const f=fixture(t);f.button.fire('pointerdown');t.mock.timers.tick(100);
 f.button.fire('pointermove',{clientX:223});const first=f.previews.at(-1)!;
 f.button.fire('pointermove',{clientX:224});const second=f.previews.at(-1)!;
 assert.ok(first>.5&&second>first&&second-first<.005);
 f.button.fire('pointerup');assert.equal(f.plays[0],second);
});
