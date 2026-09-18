import test from 'node:test';
import assert from 'node:assert/strict';
import {installMenuSounds,sounds} from '../src/sound';
test('refreshing cards beneath an idle pointer does not play hover sounds',t=>{
 const listeners=new Map<string,(event:any)=>void>();
 class Control{closest(selector:string){return selector.startsWith('button')?this:null;}matches(){return false;}}
 for(const [key,value] of Object.entries({Element:Control,document:{addEventListener(name:string,listener:(e:any)=>void){listeners.set(name,listener);}}})){
  const original=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,value});
  t.after(()=>{if(original)Object.defineProperty(globalThis,key,original);else Reflect.deleteProperty(globalThis,key);});
 }
 const play=t.mock.method(sounds,'play',()=>{});installMenuSounds();
 const first=new Control(),replacement=new Control();
 listeners.get('pointermove')!({pointerType:'mouse',target:first,clientX:20,clientY:20});assert.equal(play.mock.callCount(),1);
 listeners.get('pointerover')?.({pointerType:'mouse',target:replacement});assert.equal(play.mock.callCount(),1);
 listeners.get('pointermove')!({pointerType:'mouse',target:replacement,clientX:20,clientY:20});assert.equal(play.mock.callCount(),1);
 listeners.get('pointermove')!({pointerType:'mouse',target:new Control(),clientX:30,clientY:20});assert.equal(play.mock.callCount(),2);
});
