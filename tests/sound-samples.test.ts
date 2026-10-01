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

test('iOS bundled media with status zero decodes while failed web requests stay silent',async t=>{
 const played:unknown[]=[],decoded:unknown[]=[],requests:string[]=[];
 const buffer={numberOfChannels:1,length:2,sampleRate:1000,getChannelData:()=>new Float32Array([.8,.2])};
 class Context {
  state='running';currentTime=0;destination={};
  createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}};}
  async decodeAudioData(data:ArrayBuffer){decoded.push(data);return buffer;}
  createBufferSource(){return {buffer:null as unknown,connect(){},disconnect(){},start(){played.push(this.buffer);}};}
 }
 for(const [key,value] of Object.entries({AudioContext:Context,document:{hidden:false}})){
  const original=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  t.after(()=>{if(original)Object.defineProperty(globalThis,key,original);else Reflect.deleteProperty(globalThis,key);});
 }
 let origin='capacitor://localhost',status=0;
 t.mock.method(globalThis,'fetch',async (url:string)=>{
  requests.push(url);
  return {ok:false,status,url:origin+url,arrayBuffer:async()=>new ArrayBuffer(1)};
 });
 const native=new SoundEffects();native.enabled=true;native.unlock();
 await new Promise(resolve=>setImmediate(resolve));
 native.play('paddle');native.play('paddle');
 assert.equal(decoded.length,2,'both bundled MP3s decode despite ok=false');
 assert.deepEqual(played,[buffer,buffer]);
 native.unlock();assert.equal(requests.length,2,'samples are loaded only once');
 for(const failure of [{origin:'https://picklebash.app',status:0},{origin:'capacitor://localhost',status:404}]){
  origin=failure.origin;status=failure.status;
  const failed=new SoundEffects();failed.enabled=true;failed.unlock();
  await new Promise(resolve=>setImmediate(resolve));failed.play('paddle');
 }
 assert.equal(decoded.length,2,'failed responses are never decoded');
 assert.equal(played.length,2,'failed loads do not produce paddle sounds');
});
