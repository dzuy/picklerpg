/** Browser adapter kept independent of the game so late/duplicate events can be tested. */
export interface RecognitionResult {isFinal:boolean;[index:number]:{transcript:string}}
export interface Recognition {
 lang:string;continuous:boolean;interimResults:boolean;
 onresult:((event:{resultIndex:number;results:ArrayLike<RecognitionResult>})=>void)|null;
 onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;onstart:(()=>void)|null;
 start():void;abort():void;
}
export type RecognitionFactory=()=>Recognition;
export function browserRecognition():RecognitionFactory|undefined {
 const scope=globalThis as typeof globalThis & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
 const Constructor=scope.SpeechRecognition??scope.webkitSpeechRecognition;
 return Constructor?()=>new Constructor():undefined;
}
export class VoiceInput {
 active=false;private recognition:Recognition|null=null;private session=0;
 constructor(private factory:RecognitionFactory|undefined,private context:()=>unknown,private result:(text:string,context:unknown)=>void,private status:(message:string)=>void){}
 get supported(){return !!this.factory}
 start(){
  if(this.active||!this.factory)return;
  const session=++this.session,context=this.context();let consumed=false;
  const recognition=this.factory();this.recognition=recognition;this.active=true;
  recognition.lang='en-US';recognition.continuous=false;recognition.interimResults=true;
  const current=()=>this.session===session&&this.active;
  recognition.onstart=()=>{if(current())this.status('Listening… Say one shot or partner instruction.')};
  recognition.onresult=event=>{
   if(!current()||consumed)return;
   for(let i=event.resultIndex;i<event.results.length;i++){
    const row=event.results[i],text=row[0].transcript.trim();
    if(!row.isFinal){this.status(`Hearing: ${text}`);continue}
    if(!text)continue;consumed=true;this.stop();this.result(text,context);break;
   }
  };
  recognition.onerror=event=>{if(!current())return;this.stop();this.status(event.error==='not-allowed'||event.error==='service-not-allowed'?'Microphone permission denied. Enable it in your browser, then try again.':event.error==='no-speech'?'No speech heard. Try again.':event.error==='audio-capture'?'No microphone available. Check your input device.':`Voice unavailable (${event.error}). Try again or type your shot.`)};
  recognition.onend=()=>{if(!current())return;this.active=false;this.recognition=null;this.status('Microphone stopped. Tap Speak to try again.')};
  this.status('Starting microphone…');
  try{recognition.start()}catch{this.stop();this.status('Could not start the microphone. Try again or type your shot.')}
 }
 stop(){++this.session;this.active=false;const recognition=this.recognition;this.recognition=null;recognition?.abort()}
}

export type PartnerCall={kind:'backhand';target:'jules'|'rio'}|{kind:'crash'}|{kind:'soft';target:'jules'|'rio'}|{kind:'clear'};
export type VoiceCommand={kind:'shot';text:string}|{kind:'partner';call:PartnerCall}|{kind:'control';action:'next'|'pause'|'resume'|'stop'|'menus'|'focus'};
/** Pronouns refer to the explicitly displayed voice target, never inferred gender. */
export function voiceCommand(raw:string,target:'jules'|'rio'):VoiceCommand {
 let text=raw.toLowerCase().replace(/[.,!?]/g,'').trim().replace(/\s+/g,' ');
 const controls:Record<string,'next'|'pause'|'resume'|'stop'|'menus'|'focus'>={'next point':'next','next variation':'next','pause':'pause','resume':'resume','stop listening':'stop','show menus':'menus','voice mode':'focus'};
 if(controls[text])return {kind:'control',action:controls[text]};
 text=text.replace(/\b(him|her|his|them)\b/g,target);
 const call=text.replace(/^(?:finn|partner)[,:]?\s*/,'');
 const who=/\brio\b/.test(call)?'rio':/\bjules\b/.test(call)?'jules':target;
 if(/^target (?:jules|rio)(?:s|'s)? backhand$/.test(call))return {kind:'partner',call:{kind:'backhand',target:who}};
 if(call==='crash when i drive')return {kind:'partner',call:{kind:'crash'}};
 if(/^stop speeding up at (jules|rio)$/.test(call))return {kind:'partner',call:{kind:'soft',target:who}};
 if(call==='clear instructions')return {kind:'partner',call:{kind:'clear'}};
 if(/^(finn|partner)\b/.test(text))throw new Error('Try “Finn, target Jules backhand”, “crash when I drive”, or “clear instructions”.');
 text=text.replace(/^pull (jules|rio) wide and keep it soft$/,'dink wide soft');
 return {kind:'shot',text};
}

/** Point-end listening must remain available even if Finn played the final shot. */
export function voiceContactReady(state:{phase:string;possession:string|null;currentHitter:string|null},partnerAutonomy:boolean):boolean {
 return state.phase==='complete'||state.phase==='decision'&&state.possession==='home'&&(!partnerAutonomy||state.currentHitter!=='partner');
}
