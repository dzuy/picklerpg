import {browserStorage} from './browser-storage';

export type SoundCue='hover'|'select'|'toggle'|'paddle'|'bounce'|'net'|'point-win'|'point-loss'|'match-win'|'listen';
const preferenceKey='picklebash-sound-enabled-v1';
const paddleFiles=['/audio/universfield-wine-cork-pop-352701.mp3','/audio/dragon-studio-pop-402322.mp3'];

/** Recorded paddle pops with synthesized UI feedback; no audio before a gesture. */
export class SoundEffects {
 enabled=browserStorage.getItem(preferenceKey)!=='off';
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private lastHover=0;
 private paddleSamples:Array<{buffer:AudioBuffer;offset:number;gain:number}>=[];
 private paddleLoading:Promise<void>|null=null;
 private nextPaddle=0;
 private loadPaddles(ctx:AudioContext){
  if(this.paddleLoading)return;
  this.paddleLoading=Promise.all(paddleFiles.map(async url=>{
   try{
    const response=await fetch(url);if(!response.ok)return null;
    const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
    let peak=0;
    for(const channel of channels)for(const value of channel)peak=Math.max(peak,Math.abs(value));
    if(peak===0)return null;
    // Remove encoder padding/leading silence without cutting the pop's attack.
    let onset=0;
    while(onset<buffer.length&&channels.every(channel=>Math.abs(channel[onset])<peak*.01))onset++;
    return {buffer,offset:Math.max(0,onset/buffer.sampleRate-.002),gain:Math.min(1.5,.5/peak)};
   }catch{return null;}
  })).then(samples=>{this.paddleSamples=samples.filter(sample=>sample!==null);});
 }
 unlock(){
  if(!this.enabled)return;
  try{
   if(!this.context){
    this.context=new AudioContext();this.master=this.context.createGain();
    this.master.gain.value=.65;this.master.connect(this.context.destination);
   }
   if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
   this.loadPaddles(this.context);
  }catch{/* Audio is optional on unsupported devices. */}
 }
 setEnabled(enabled:boolean){
  this.enabled=enabled;browserStorage.setItem(preferenceKey,enabled?'on':'off');
  if(this.context&&this.master)this.master.gain.setTargetAtTime(enabled?.65:0,this.context.currentTime,.01);
  if(enabled)this.unlock();
 }
 syncVisibility(){
  if(this.context&&this.master)this.master.gain.setTargetAtTime(!document.hidden&&this.enabled?.65:0,this.context.currentTime,.01);
 }
 play(cue:SoundCue){
  const ctx=this.context,out=this.master;
  if(!this.enabled||!ctx||!out||ctx.state!=='running'||document.hidden)return;
  const now=ctx.currentTime;
  if(cue==='paddle'){
   const sample=this.paddleSamples[this.nextPaddle%this.paddleSamples.length];
   // Loading must never delay a hit or reintroduce the old synthesized noise.
   if(!sample)return;
   this.nextPaddle++;
   const source=ctx.createBufferSource(),gain=ctx.createGain();
   source.buffer=sample.buffer;gain.gain.value=sample.gain;
   source.connect(gain);gain.connect(out);source.start(now,sample.offset);
   source.onended=()=>{source.disconnect();gain.disconnect()};
   return;
  }
  if(cue==='hover'){if(now-this.lastHover<.09)return;this.lastHover=now;}
  const tone=(frequency:number,end:number,duration:number,volume:number,delay=0,type:OscillatorType='sine')=>{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=now+delay;
   oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(end,start+duration);
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.003);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   oscillator.connect(gain);gain.connect(out);oscillator.start(start);oscillator.stop(start+duration+.01);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
  };
  const noise=(duration:number,frequency:number,volume:number)=>{
   const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**3;
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.8;gain.gain.value=volume;
   source.connect(filter);filter.connect(gain);gain.connect(out);source.start(now);
   source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
  };
  switch(cue){
   case 'hover':tone(740,820,.035,.025);break;
   case 'select':tone(650,1050,.075,.10);break;
   case 'toggle':tone(850,1150,.065,.08);break;
   case 'bounce':tone(330,125,.075,.19);noise(.025,1100,.12);break;
   case 'net':noise(.13,650,.25);break;
   case 'point-win':tone(880,1100,.14,.10);tone(1320,1450,.19,.08,.10);break;
   case 'point-loss':tone(440,300,.18,.09);break;
   case 'match-win':tone(880,1320,.20,.12);tone(1760,1980,.25,.09,.15);break;
   case 'listen':tone(880,1175,.18,.08);break;
  }
 }
}
export const sounds=new SoundEffects();

export function installMenuSounds(){
 const selector='button, a[href], [role="button"], input[type="checkbox"], input[type="radio"], select';
 const control=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLElement>(selector):null;
 const enabled=(element:HTMLElement|null)=>!!element&&!element.matches(':disabled, [aria-disabled="true"]')&&!element.closest('[inert], [data-sound="none"]');
 document.addEventListener('pointerdown',()=>sounds.unlock(),{capture:true});
 document.addEventListener('keydown',()=>sounds.unlock(),{capture:true});
 // Capture before handlers replace menus or disable submitted buttons.
 document.addEventListener('click',event=>{
  const item=control(event.target);if(!enabled(item)||item!.matches('input,select,[data-sound-toggle]'))return;
  sounds.unlock();sounds.play('select');
 },true);
 document.addEventListener('change',event=>{const item=control(event.target);if(enabled(item)&&!item!.hasAttribute('data-sound-toggle'))sounds.play('toggle');},true);
 document.addEventListener('pointerover',event=>{
  if(event.pointerType!=='mouse')return;
  const item=control(event.target);if(enabled(item)&&!(event.relatedTarget instanceof Node&&item!.contains(event.relatedTarget)))sounds.play('hover');
 });
 document.addEventListener('focusin',event=>{const item=control(event.target);if(enabled(item)&&item!.matches(':focus-visible'))sounds.play('hover');});
 document.addEventListener('visibilitychange',()=>{
  sounds.syncVisibility();
 });
}

export function installSoundSetting(dialog:HTMLElement,options:{checkbox?:boolean;before?:HTMLElement}={}){
 const label=document.createElement('label');label.className='settings-toggle';
 label.innerHTML='<span>Sound effects<small>Menu clicks, paddle hits, and point feedback.</small></span><span class="settings-switch-control"><strong></strong><input type="checkbox" role="switch" data-sound-toggle aria-label="Sound effects"></span>';
 if(options.checkbox){const input=label.querySelector('input')!;label.querySelector('.settings-switch-control')!.replaceWith(input);}
 const input=label.querySelector('input')!,state=label.querySelector('strong');
 const sync=()=>{input.checked=sounds.enabled;if(state)state.textContent=sounds.enabled?'On':'Off';};sync();
 input.addEventListener('change',()=>{sounds.setEnabled(input.checked);sync();sounds.play('toggle');});
 if(options.before)options.before.before(label);else dialog.querySelector('.settings-heading')!.after(label);
}
