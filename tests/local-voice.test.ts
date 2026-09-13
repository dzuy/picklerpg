import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LocalRecognition} from '../src/local-voice';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function environment(getStream:()=>Promise<unknown>){
 const names=['AudioContext','AudioWorkletNode','navigator'] as const,original=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
 const contexts:Array<{closes:number}>=[],nodes:Array<{port:{onmessage:((event:{data:Float32Array})=>void)|null}}>=[];
 class Context{state='running';closes=0;sampleRate=16000;destination={};audioWorklet={addModule:async()=>{}};constructor(){contexts.push(this)}async resume(){}async close(){this.closes++;this.state='closed'}createMediaStreamSource(){return {connect(){}}}createGain(){return {gain:{value:1},connect(){}}}}
 class Node{port:{onmessage:((event:{data:Float32Array})=>void)|null}={onmessage:null};constructor(){nodes.push(this)}connect(){}disconnect(){}}
 for(const [index,value]of [Context,Node,{mediaDevices:{getUserMedia:getStream}}].entries())Object.defineProperty(globalThis,names[index],{value,configurable:true,writable:true});
 return {contexts,nodes,restore(){names.forEach((name,index)=>{const value=original[index];if(value)Object.defineProperty(globalThis,name,value);else Reflect.deleteProperty(globalThis,name)})}};
}
test('capture starts before model readiness and manual finish retains early quiet speech',async()=>{
 let ready!:()=>void,stops=0,transcriptions=0,started=false;const env=environment(async()=>({getTracks:()=>[{stop(){stops++}}]}));
 try{const r=new LocalRecognition(audio=>{if(!audio)return new Promise(resolve=>ready=()=>resolve(''));transcriptions++;assert.equal(audio.length,4800);assert.equal(stops,1);return Promise.resolve('Serve flat.')});const heard:string[]=[];r.onstart=()=>started=true;r.onresult=e=>heard.push(e.results[0][0].transcript);r.start();await tick();assert.equal(started,true);env.nodes[0].port.onmessage!({data:new Float32Array(4800).fill(.006)});r.stop();await tick();assert.equal(transcriptions,0);assert.equal(stops,1);ready();await tick();assert.deepEqual(heard,['Serve flat.']);assert.equal(transcriptions,1);assert.equal(env.contexts[0].closes,1)}finally{env.restore()}
});
test('cancelling during model loading releases capture and never transcribes the cancelled audio',async()=>{
 let ready!:()=>void,stops=0;const env=environment(async()=>({getTracks:()=>[{stop(){stops++}}]}));
 try{const r=new LocalRecognition(audio=>{assert.equal(audio,undefined);return new Promise(resolve=>ready=()=>resolve(''))});r.start();await tick();r.abort();ready();await tick();assert.equal(stops,1);assert.equal(env.contexts[0].closes,1)}finally{env.restore()}
});
test('late microphone permission after cancellation releases the newly granted track',async()=>{
 let grant!:(value:unknown)=>void,stops=0;const env=environment(()=>new Promise(resolve=>grant=resolve));
 try{const r=new LocalRecognition(async()=> '');r.start();await tick();r.abort();grant({getTracks:()=>[{stop(){stops++}}]});await tick();assert.equal(stops,1);assert.equal(env.contexts[0].closes,1)}finally{env.restore()}
});
test('speech followed by silence releases capture before local transcription and yields one final result',async()=>{
 let stops=0,calls=0;const env=environment(async()=>({getTracks:()=>[{stop(){stops++}}]})),results:string[]=[];
 try{const r=new LocalRecognition(async(audio)=>{if(!audio)return '';calls++;assert.equal(stops,1);assert.equal(audio.length,19200);return 'Serve flat.'});r.onresult=event=>results.push(event.results[0][0].transcript);r.start();await tick();
 const receive=env.nodes[0].port.onmessage!;receive({data:new Float32Array(4800).fill(.08)});receive({data:new Float32Array(14400)});await tick();assert.deepEqual(results,['Serve flat.']);assert.equal(calls,1);r.abort();assert.equal(stops,1);assert.equal(env.contexts[0].closes,1);
 }finally{env.restore()}
});
test('silence reports no-speech without sending audio to Whisper',async()=>{
 let calls=0;const env=environment(async()=>({getTracks:()=>[{stop(){}}]}));
 try{const r=new LocalRecognition(async(audio)=>{if(audio)calls++;return ''});const errors:string[]=[];r.onerror=event=>{errors.push(event.error);r.abort()};r.start();await tick();env.nodes[0].port.onmessage!({data:new Float32Array(96000)});assert.deepEqual(errors,['no-speech']);assert.equal(calls,0);assert.equal(env.contexts[0].closes,1)}finally{env.restore()}
});
