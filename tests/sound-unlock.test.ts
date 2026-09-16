import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundEffects} from '../src/sound';

test('iPhone audio resumes interruptions, waits for first cue, and respects mute/visibility',async t=>{
 let context:Context,played=0;
 const parameter={value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}};
 class Context{
  state='suspended';currentTime=0;destination={};resumes=0;
  constructor(){context=this;}
  createGain(){return {gain:parameter,connect(){},disconnect(){}};}
  async resume(){this.resumes++;await Promise.resolve();this.state='running';}
  createOscillator(){return {type:'sine',frequency:parameter,connect(){},disconnect(){},start(){played++;},stop(){}};}
 }
 const document={hidden:false},session={type:'auto'};
 for(const [key,value] of Object.entries({AudioContext:Context,document,navigator:{audioSession:session}})){
  const original=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  t.after(()=>{if(original)Object.defineProperty(globalThis,key,original);else Reflect.deleteProperty(globalThis,key);});
 }
 t.mock.method(globalThis,'fetch',async()=>({ok:false}) as Response);
 const sounds=new SoundEffects();sounds.enabled=true;
 sounds.unlock('select');assert.equal(played,0);assert.equal(session.type,'playback');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(played,1);
 context!.state='interrupted';document.hidden=true;sounds.syncVisibility();assert.equal(context!.resumes,1);
 document.hidden=false;sounds.syncVisibility();await new Promise(resolve=>setImmediate(resolve));assert.equal(context!.state,'running');assert.equal(played,1,'no stale sound replay on foreground');
 sounds.setEnabled(false);context!.state='interrupted';sounds.unlock('select');assert.equal(context!.resumes,2);assert.equal(played,1);
 session.type='play-and-record';const voiceSounds=new SoundEffects();voiceSounds.enabled=true;voiceSounds.unlock();assert.equal(session.type,'play-and-record');
});
