import type {Recognition,RecognitionFactory} from './voice';
let worker:Worker|undefined,sequence=0;
const pending=new Map<number,{resolve:(text:string)=>void;reject:(error:Error)=>void;progress:(text:string)=>void;partial:(text:string)=>void;timer:ReturnType<typeof setTimeout>}>();
function resetWorker(error:Error){for(const request of pending.values()){clearTimeout(request.timer);request.reject(error)}pending.clear();worker?.terminate();worker=undefined}
function transcribe(audio:Float32Array|undefined,progress:(text:string)=>void,partial:(text:string)=>void=()=>{}):Promise<string>{
 if(!worker){
  worker=new Worker(new URL('./voice-worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=event=>{
   const {id,text,error,partial:words,progress:message}=event.data,request=pending.get(id);if(!request)return;
   if(words!==undefined){request.partial(words);return}
   if(message){request.progress(message);return}
   clearTimeout(request.timer);pending.delete(id);error?request.reject(new Error(error)):request.resolve(text??'');
  };
  worker.onerror=()=>resetWorker(new Error('Local voice worker failed to load.'));
 }
 return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>resetWorker(new Error(audio?'Local transcription timed out. Try a shorter command.':'Voice model download timed out. Check your connection and retry.')),audio?45000:180000);pending.set(id,{resolve,reject,progress,partial,timer});worker!.postMessage({id,audio},audio?[audio.buffer]:[])});
}
/** Silence stops capture; cancellation releases all tracks even during async permission prompts. */
export class LocalRecognition implements Recognition {
 constructor(private request:typeof transcribe=transcribe,private microphone=()=>navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}})){}
 lang='en-US';continuous=false;interimResults=false;
 onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onstart:Recognition['onstart']=null;onstatus:Recognition['onstatus']=undefined;onphase:Recognition['onphase']=undefined;onlevel:Recognition['onlevel']=undefined;
 private warming:Promise<Error|null>=Promise.resolve(null);private modelReady=false;private lastMeter=0;
 private cancelled=false;private stream?:MediaStream;private context?:AudioContext;private node?:AudioWorkletNode;private timer?:ReturnType<typeof setTimeout>;
 private chunks:Float32Array[]=[];private samples=0;private voicedSamples=0;private lastSpeech=0;private finishing=false;
 start(){void this.capture()}
 private async capture(){
  try{
   this.context=new AudioContext({sampleRate:16000});if(this.context.sampleRate!==16000)throw new Error('This browser cannot capture 16 kHz audio');await this.context.resume();
   if(this.cancelled)return;
   // Warm the model in parallel; never discard speech while waiting for the model.
   this.warming=this.request(undefined,message=>{if(!this.cancelled&&this.finishing)this.onstatus?.('Recording saved · '+message)}).then(()=>{this.modelReady=true;return null},error=>error instanceof Error?error:new Error(String(error)));
   const stream=await this.microphone();
   if(this.cancelled){stream.getTracks().forEach(track=>track.stop());return}
   this.stream=stream;
   await this.context.audioWorklet.addModule('/voice-capture-worklet.js');if(this.cancelled)return;
   const node=new AudioWorkletNode(this.context,'voice-capture');this.node=node;
   const source=this.context.createMediaStreamSource(stream),mute=this.context.createGain();mute.gain.value=0;source.connect(node);node.connect(mute);mute.connect(this.context.destination);
   node.port.onmessage=event=>this.receive(event.data as Float32Array);
   this.timer=setTimeout(()=>{if(this.voicedSamples>=3200)void this.finish();else this.fail('no-speech')},12000);
   this.onstart?.();
  }catch(error){if(!this.cancelled){const denied=error instanceof DOMException&&error.name==='NotAllowedError';this.fail(denied?'not-allowed':'local-unavailable',denied?undefined:`Local voice could not start: ${error instanceof Error?error.message:'unknown error'}. Check the model download connection and retry.`)}}
 }
 private receive(chunk:Float32Array){
  if(this.cancelled||this.finishing)return;
  this.chunks.push(chunk);this.samples+=chunk.length;
  const rms=Math.sqrt(chunk.reduce((sum,sample)=>sum+sample*sample,0)/chunk.length);
  if(this.samples-this.lastMeter>=1600){this.onlevel?.(Math.min(1,rms*30));this.lastMeter=this.samples}
  if(rms>.004){this.voicedSamples+=chunk.length;this.lastSpeech=this.samples}
  if(this.voicedSamples>=3200&&this.samples-this.lastSpeech>=14400)void this.finish();
  else if(this.samples>=96000&&this.voicedSamples<3200)this.fail('no-speech');
 }
 stop(){if(this.finishing||this.cancelled)return;if(this.voicedSamples>=800)void this.finish();else this.fail('no-speech')}
 private async finish(){
  if(this.finishing||this.cancelled)return;this.finishing=true;this.release();
  const audio=new Float32Array(this.samples);let offset=0;for(const chunk of this.chunks){audio.set(chunk,offset);offset+=chunk.length}this.chunks=[];
  this.onphase?.('transcribing');this.onlevel?.(0);
  this.onstatus?.(this.modelReady?'Microphone off · transcribing locally…':'Recording saved · loading voice model for transcription…');
  try{const error=await this.warming;if(this.cancelled)return;if(error)throw error;const text=await this.request(audio,()=>{},partial=>{if(!this.cancelled&&partial)this.onresult?.({resultIndex:0,results:[{isFinal:false,0:{transcript:partial}}]})});if(this.cancelled)return;if(!text.trim()){this.fail('no-speech');return}this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:text}}]});this.onend?.()}
  catch(error){if(!this.cancelled)this.fail('local-unavailable',`Local transcription failed: ${error instanceof Error?error.message:'unknown error'}.`)}
 }
 private fail(error:string,message?:string){this.release();this.onerror?.({error,message})}
 private release(){clearTimeout(this.timer);if(this.node){this.node.port.onmessage=null;this.node.disconnect();this.node=undefined}this.stream?.getTracks().forEach(track=>track.stop());this.stream=undefined;const context=this.context;this.context=undefined;if(context&&context.state!=='closed')void context.close().catch(()=>{})}
 abort(){this.cancelled=true;this.chunks=[];this.release()}
}
export function localRecognition():RecognitionFactory|undefined {
 return typeof AudioContext!=='undefined'&&typeof AudioWorkletNode!=='undefined'&&!!navigator.mediaDevices?.getUserMedia?()=>new LocalRecognition():undefined;
}
