import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundEffects} from '../src/sound';

test('recorded paddle pops load once, alternate, and respect mute and hidden tabs',async t=>{
 const requests:string[]=[],played:Array<{buffer:unknown;offset:number}>=[];
 const buffers=[0,1].map(id=>({id,numberOfChannels:1,length:6,sampleRate:1000,getChannelData:()=>new Float32Array([0,0,0,0,.8,.2])}));
 let decoded=0;
 const gain=()=>({gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}});
 class Context {
  state='running';currentTime=0;destination={};
  createGain= gain;
  async decodeAudioData(){return buffers[decoded++];}
  createBufferSource(){return {buffer:null as unknown,connect(){},disconnect(){},start(_time:number,offset:number){played.push({buffer:this.buffer,offset});}};}
  createOscillator(){throw Error('Paddle hits must not use synthesized tones');}
 }
 const document={hidden:false};
 for(const [key,value] of Object.entries({AudioContext:Context,document})){
  const original=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  t.after(()=>{if(original)Object.defineProperty(globalThis,key,original);else Reflect.deleteProperty(globalThis,key);});
 }
 t.mock.method(globalThis,'fetch',async (url:string)=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};});
 const sounds=new SoundEffects();sounds.enabled=true;
 sounds.play('paddle');assert.equal(requests.length,0,'no audio context or fetch before interaction');
 sounds.unlock();sounds.play('paddle');assert.equal(played.length,0,'no delayed hit queued while loading');
 await new Promise(resolve=>setImmediate(resolve));
 sounds.unlock();sounds.play('paddle');sounds.play('paddle');sounds.play('paddle');
 assert.deepEqual(played.map(item=>item.buffer),[buffers[0],buffers[1],buffers[0]]);
 assert.equal(requests.length,2);assert.equal(played[0].offset,.002);
 sounds.setEnabled(false);sounds.play('paddle');assert.equal(played.length,3);
 sounds.setEnabled(true);document.hidden=true;sounds.play('paddle');assert.equal(played.length,3);
 document.hidden=false;sounds.play('paddle');assert.equal(played.length,4);assert.equal(played[3].buffer,buffers[1]);
});
