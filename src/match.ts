import {receptionTiming,receptionRoll,swingMissChance} from './engine/reception-timing';
import type {PartnerCall} from './voice';
import {validatePlayer,type DesignedPlayer} from './player-design';
import {resolveBodyServe} from './engine/serve-body';
import {commandIntent,canParseInstantly,parseLocalCommand,requestsBounce,validateCommand,COMMAND_SCHEMA} from './engine/custom-command';
import {PATTERNS,recognizePatterns,assessChoice,type PatternId,type PracticeRecord} from './engine/patterns';
import {OpponentMemory,tacticalSnapshot,localDecision,intendedReceiver,type OpponentChoiceHistory,requestStrategy,type OpponentStrategy,type Personality,type TacticalSnapshot} from './engine/opponent-brain';
import {PLAYER_PROFILES,ARCHETYPES} from './engine/player-profiles';
import {RallyEngine,sampleLeg,sampleVelocity} from './engine/rally-engine';
import {COURT,type FlightLeg,type PlayerState,type PlayerId,type RallyShot,type RallyProvider,type ShotIntent,type ShotType,type PointResult,type Vec3} from './engine/model';
import {contactIssue,type ShotContext,SHOT_FAMILIES} from './engine/shot-families';
import {buildDecisionMenu} from './engine/decision-menu';
import {sameShotIntent} from './engine/shot-intent';
import {chooseOpponentShot} from './engine/opponent-policy';
import {executeShot} from './engine/execution';
import {interceptFlight,reboundFlight,outBallContinuation} from './engine/trajectory';
import {planPositions} from './engine/positioning';
import {DoublesScore,other} from './engine/scoring';

export type TargetServeStyle='flat'|'topspin'|'slice'|'lob'|'shallow';
const TARGET_SERVES:Record<TargetServeStyle,Partial<ShotIntent>>={
 flat:{pace:'fast',shape:'flat',intendedNetClearance:.12,aggression:.75},
 topspin:{pace:'medium',shape:'arc',spin:{side:'none',vertical:'topspin',strength:'strong'},intendedNetClearance:.35,aggression:.65},
 slice:{pace:'medium',shape:'flat',spin:{side:'right',vertical:'slice',strength:'medium'},intendedNetClearance:.18,aggression:.55},
 lob:{pace:'soft',shape:'arc',intendedNetClearance:2.5,tacticalIntent:'sustain',aggression:.2},
 shallow:{pace:'soft',shape:'arc',intendedNetClearance:.3,tacticalIntent:'sustain',aggression:.3},
};

export class Match {
 customPreview:{intent:ShotIntent;note:string;text:string}|null=null;customStatus='';customBusy=false;customDraft='';customCounts=new Map<string,number>();private currentContext:ShotContext|null=null;private customIndex=0;private queuedReceptionIntent:ShotIntent|null=null;private queuedReceptionShot:{shot:RallyShot;text:string}|null=null;
 practice:PatternId|null=null;variation=0;records:PracticeRecord[]=[];pointRecords:PracticeRecord[]=[];replayFrames:ReturnType<RallyEngine['snapshot']>[]=[];replayShots:RallyShot[]=[];replayIndex:number|null=null;replayPlaying=false;private replayClock=0;private replayElapsed=0;private replayAlpha=0;private replayEndHold=0;
 private designedPlayer:DesignedPlayer|null=null;
 get playerDesign(){return this.designedPlayer?structuredClone(this.designedPlayer):null}
 setPlayerDesign(player:DesignedPlayer|null){this.designedPlayer=player?validatePlayer(player):null;this.reset()}
 private substitutes:Partial<Record<PlayerId,DesignedPlayer>>={};
 getPlayerDesign(id:PlayerId){const player=id==='you'?this.designedPlayer:this.substitutes[id];return player?structuredClone(player):null}
 /** Replace the occupant of a court slot without resetting its position or the rally. */
 substitutePlayer(id:PlayerId,design:DesignedPlayer|null){
  const player=design?validatePlayer(design):null;
  if(id==='you')this.designedPlayer=player;else if(player)this.substitutes[id]=player;else delete this.substitutes[id];
  const current=this.state.players.find(p=>p.id===id)!;
  const profile=this.lineup[id]?ARCHETYPES[this.lineup[id]!]:PLAYER_PROFILES[id];
  current.skills={...(player?.skills??profile.skills)};current.handedness=player?.handedness??'right';
  current.tendencies=structuredClone(profile.tendencies);
  this.request?.abort();this.request=null;this.strategy=undefined;this.strategyPoint=-1;this.generation++;this.thinking=false;
 }
 lineup:Partial<Record<PlayerId,keyof typeof ARCHETYPES>>={};
 brainMode:'local'|'llm'=typeof window==='undefined'?'local':'llm';personality:Personality='Chess Player';intelligence=.8;memory=new OpponentMemory();brainStatus=typeof window==='undefined'?'Local opponent':'Background LLM strategy';thinking=false;partnerAutonomy=false;lastSnapshot:TacticalSnapshot|null=null;private request:AbortController|null=null;private generation=0;private observed=0;private strategy:OpponentStrategy|undefined;private strategyPoint=-1;
 scoring=new DoublesScore();engine!:RallyEngine;point=0;seed=1741;lastResult:PointResult|null=null;private awarded=false;
 constructor(){this.startPoint()}
 partnerInstructions:{backhand?:'jules'|'rio';soft?:'jules'|'rio';crash?:boolean}={};
 partnerStatus='No partner instructions.';
 instructPartner(call:PartnerCall){
  if(call.kind==='clear'){this.partnerInstructions={};this.partnerStatus='Finn: instructions cleared.'}
  else if(call.kind==='crash'){this.partnerInstructions.crash=true;this.partnerStatus='Finn: I’ll move forward when you drive, within my movement limits.'}
  else {this.partnerInstructions[call.kind]=call.target;this.partnerStatus=call.kind==='backhand'?`Finn: I’ll look for ${call.target === 'jules'?'Jules':'Rio'}’s backhand.`:`Finn: I’ll favor soft shots instead of speed-ups at ${call.target === 'jules'?'Jules':'Rio'}.`}
  this.partnerStatus+=' Applies from the next team contact; manual choices stay yours.';
 }
 recommendationType:string|null=null;
 get state(){return this.engine.state} get shot(){return this.engine.shot} get availableIntents(){return this.engine.availableIntents} get receptionDecision(){return this.engine.needsReceptionChoice}
 get partnerReceptionDecision(){return this.receptionDecision&&this.partnerAutonomy&&this.shot.resolution?.receiver==='partner'}
 get manualReceptionDecision(){return this.receptionDecision&&!this.partnerReceptionDecision}
 get canTakeAir(){return !!this.shot.receptionChoice?.airborne} get canLetBounce(){return !!this.shot.receptionChoice?.bounced}
 get receptionOptions(){
  const options:Array<{intent:ShotIntent;timing:'air'|'bounce'}>=[];
  for(const timing of ['air','bounce'] as const){const setup=this.receptionSetup(timing);if(!setup)continue;for(const choice of buildDecisionMenu(setup.actor,setup.context,setup.players)){const intent={...choice.intent,source:'menu' as const};if(!options.some(option=>option.timing===timing&&sameShotIntent(option.intent,intent)))options.push({intent,timing})}}
  return options;
 }
 get displayedReceptionOptions(){return this.receptionOptions}
 /** The same menu choices shown in the shot dock, retaining their actual flight and timing. */
 get targetingMenu(){
  if(this.manualReceptionDecision)return this.displayedReceptionOptions;
  if(this.state.phase!=='decision'||this.state.possession!=='home'||this.partnerAutonomy&&this.state.currentHitter==='partner')return [];
  return this.availableIntents.filter(intent=>intent.source!=='text').map(intent=>({intent,timing:undefined as 'air'|'bounce'|undefined}));
 }
 previewMenuTarget(choice:{intent:ShotIntent;timing?:'air'|'bounce'},point:{x:number;z:number;playerId?:PlayerId}){
  if(this.replayIndex!==null||this.customBusy||this.thinking||!this.targetingMenu.some(o=>o.timing===choice.timing&&sameShotIntent(o.intent,choice.intent)))throw new Error('That shot is no longer available.');
  const bodyServe=choice.intent.type==='serve'&&!!point.playerId;
  const opponent=point.playerId?this.state.players.find(p=>p.id===point.playerId&&p.team!==this.state.possession):undefined;
  if(bodyServe&&!opponent)throw new Error('Tap an opponent to aim a body serve.');
  const setup=choice.timing?this.receptionSetup(choice.timing):null;
  if(choice.timing&&!setup)throw new Error('That contact is no longer available.');
  const intent:ShotIntent={...structuredClone(choice.intent),target:bodyServe?{kind:'player',playerId:opponent!.id,aim:'body'}:{kind:'point',x:point.x,z:point.z}};
  return this.plan(intent,'Aim at your selected court target.',setup?.context??this.currentContext!,setup?.players??this.state.players,setup?.index??this.customIndex);
 }
 playMenuTarget(choice:{intent:ShotIntent;timing?:'air'|'bounce'},point:{x:number;z:number;playerId?:PlayerId}){
  const shot=this.previewMenuTarget(choice,point);
  if(choice.timing){this.queuedReceptionShot={shot,text:`${shot.intent.type} to court target`};this.chooseReception(choice.timing)}
  else {this.engine.offerCustom(shot);this.submitIntent(shot.intent)}
 }
 chooseReception(choice:'air'|'bounce'){this.engine.chooseReception(choice==='air'?'airborne':'bounced')}
 chooseReceptionIntent(option:{intent:ShotIntent;timing:'air'|'bounce'}){
  if(!this.receptionOptions.some(candidate=>candidate.timing===option.timing&&sameShotIntent(candidate.intent,option.intent)))throw new Error('That shot is not available for this ball.');
  this.queuedReceptionIntent=structuredClone(option.intent);this.customStatus='';this.chooseReception(option.timing);
 }
 async queueReceptionCommand(text:string,source:'text'|'voice'='text'){
  if(!this.receptionDecision)throw new Error('Wait for the ball to cross the net.');
  const command=text.trim();if(!command||command.length>300)throw new Error('Use 1–300 characters.');
  this.customBusy=true;this.customStatus='Interpreting…';let parsed;
  try{if(canParseInstantly(command))parsed=parseLocalCommand(command);else {const response=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({version:1,command,schema:COMMAND_SCHEMA,context:{ball:this.state.ball,players:this.state.players},options:[{}]})});if(!response.ok)throw new Error('Could not understand that shot right now. Try a simpler command.');parsed=validateCommand(await response.json())}}
  finally{this.customBusy=false}
  if(!this.receptionDecision)throw new Error('That contact is no longer available.');
  let wantsBounce=requestsBounce(command),type=parsed.shot==='roll'?'volley':parsed.shot==='lob-serve'?'serve':parsed.shot==='atp'?'drive':parsed.shot;const family=SHOT_FAMILIES[type];const wantsAir=!wantsBounce&&family?.mode==='volley';wantsBounce=wantsBounce||family?.mode==='ground';
  const choice=wantsAir?'air':wantsBounce?'bounce':this.canTakeAir?'air':'bounce';
  if(choice==='air'&&!this.canTakeAir)throw new Error('This ball cannot be reached before its bounce.');if(choice==='bounce'&&!this.canLetBounce)throw new Error('This ball must be taken out of the air.');
  const setup=this.receptionSetup(choice)!;const preview=commandIntent(parsed,setup.actor,setup.context,setup.players);preview.intent.source=source;if(parsed.shot==='serve'&&/\bflat\b/i.test(command))preview.intent.shape='flat';
  const shot=this.plan(preview.intent,'Custom tactical choice',setup.context,setup.players,setup.index);this.queuedReceptionShot={shot,text:command};this.customDraft=command;this.customStatus='';this.chooseReception(choice);
 }
 /** Families that allow either timing prefer a legal airborne contact, then a bounce. */
 private targetReceptionTiming(type:ShotType):'air'|'bounce'{
  const mode=SHOT_FAMILIES[type].mode;
  if(mode==='volley')return 'air';
  if(mode==='ground')return 'bounce';
  for(const timing of ['air','bounce'] as const){const setup=this.receptionSetup(timing);if(setup&&!contactIssue(type,setup.context))return timing}
  return this.canTakeAir?'air':'bounce';
 }
 /** Build a fresh execution for an exact court target using the current hitter's skills. */
 targetShot(type:ShotType,point:{x:number;z:number},serveStyle?:TargetServeStyle){
  if(this.replayIndex!==null||this.customBusy||this.thinking)throw new Error('Wait for your next contact.');
  const timing=this.targetReceptionTiming(type);
  const setup=this.receptionDecision?this.receptionSetup(timing):null;
  if(this.receptionDecision&&!setup)throw new Error(timing==='air'?'This ball cannot be taken before its bounce.':'This ball cannot be reached after its bounce.');
  if(!setup&&(this.state.phase!=='decision'||this.state.possession!=='home'||!this.currentContext))throw new Error('Wait for your next contact.');
  const actor=setup?.actor??this.state.currentHitter!;
  if(this.partnerAutonomy&&actor==='partner')throw new Error('Finn is choosing his own shot.');
  const soft=['drop','dink','reset','block'].includes(type),high=type==='overhead';
  const intent:ShotIntent={schemaVersion:1,actor,type,target:{kind:'point',x:point.x,z:point.z},pace:soft?'soft':['drive','counter','overhead','flick'].includes(type)?'fast':'medium',shape:high?'descending':soft||['serve','return','lob'].includes(type)?'arc':'flat',intendedNetClearance:type==='lob'?2.5:type==='serve'?.35:soft?.25:.12,tacticalIntent:high?'finish':soft?'neutralize':'pressure',aggression:high?.8:soft?.3:.6,source:'menu',...(type==='flick'?{spin:{side:'none' as const,vertical:'topspin' as const,strength:'medium' as const}}:{})};
  if(serveStyle){if(type!=='serve'||!Object.hasOwn(TARGET_SERVES,serveStyle))throw new Error('Serve styles only apply to serves.');Object.assign(intent,structuredClone(TARGET_SERVES[serveStyle]))}
  return this.plan(intent,'Aim at your selected court target.',setup?.context??this.currentContext!,setup?.players??this.state.players,setup?.index??this.customIndex);
 }
 playTargetShot(type:ShotType,point:{x:number;z:number},serveStyle?:TargetServeStyle){
  const shot=this.targetShot(type,point,serveStyle);
  if(this.receptionDecision){this.queuedReceptionShot={shot,text:`${type} to court target`};this.chooseReception(this.targetReceptionTiming(type))}
  else {this.engine.offerCustom(shot);this.submitIntent(shot.intent)}
 }
 previewIntent(intent:unknown){return this.engine.previewIntent(intent)}
 snapshot(){return this.engine.snapshot()}
 reset(){this.opponentChoices=[];this.stopReplay();this.gameReplay=[];this.customPreview=null;this.customBusy=false;this.customStatus='';this.queuedReceptionIntent=null;this.queuedReceptionShot=null;this.request?.abort();this.request=null;this.strategy=undefined;this.strategyPoint=-1;this.generation++;this.thinking=false;this.memory=new OpponentMemory();this.observed=0;this.scoring=new DoublesScore();this.point=0;this.lastResult=null;this.startPoint()}
 nextPoint(){if(this.state.phase!=='complete'||this.scoring.winner)throw new Error('Finish the current point first.');this.point++;this.variation++;this.startPoint()}
 submitIntent(intent:unknown){const before=this.snapshot(),actualShotIndex=before.shotIndex;if(this.practice)before.shotIndex+=before.shotHistory.length?2:0;this.engine.submitIntent(intent);if(before.possession==='home'){const selected=this.shot.intent;for(const pattern of this.practice?[this.practice]:recognizePatterns(before)){const assessment=assessChoice(before,selected,pattern);const row={pattern,...assessment,intent:structuredClone(selected),shotIndex:actualShotIndex};this.records.push(row);this.pointRecords.push(row)}this.records=this.records.slice(-500)}}
 startPractice(id:PatternId|null){this.practice=id;this.variation++;this.reset()}

 private gameReplay:{frames:ReturnType<RallyEngine['snapshot']>[];shots:RallyShot[]}[]=[];
 private pointReplay:{frames:ReturnType<RallyEngine['snapshot']>[];shots:RallyShot[]}|null=null;
 private replayBreaks=new Set<number>();
 get replayScope(){return this.pointReplay?'game':'point'}
 get recordedPoints(){return this.gameReplay.length}
 startGameReplay(){
  if(!this.scoring.winner||!this.gameReplay.length)return;
  this.stopReplay();this.pointReplay={frames:this.replayFrames,shots:this.replayShots};
  this.replayFrames=[];this.replayShots=[];this.replayBreaks.clear();let time=0,shotOffset=0;
  for(const point of this.gameReplay){
   const first=point.frames[0]?.simulationTime??0;
   if(this.replayFrames.length)this.replayBreaks.add(this.replayFrames.length-1);
   for(let i=0;i<point.frames.length;i++){
    const frame=point.frames[i];this.replayFrames.push({...frame,simulationTime:time+frame.simulationTime-first,shotIndex:frame.shotIndex+shotOffset});this.replayShots.push(point.shots[i]);
   }
   time=(this.replayFrames.at(-1)?.simulationTime??time)+1.5;
   shotOffset+=Math.max(...point.frames.map(frame=>frame.shotIndex))+1;
  }
  this.startReplay();
 }
 startReplay(){if(this.state.phase!=='complete'||!this.replayFrames.length)return;this.replayIndex=0;this.replayElapsed=0;this.replayAlpha=0;this.replayEndHold=0;this.replayPlaying=true}
 stopReplay(){if(this.pointReplay){this.replayFrames=this.pointReplay.frames;this.replayShots=this.pointReplay.shots;this.pointReplay=null}this.replayBreaks.clear();this.replayIndex=null;this.replayPlaying=false;this.replayElapsed=0;this.replayAlpha=0;this.replayEndHold=0}
 pauseReplay(){this.replayPlaying=false;this.replayEndHold=0}
 resumeReplay(){if(this.replayIndex===null||this.replayIndex>=this.replayFrames.length-1){this.startReplay();return}const start=this.replayFrames[0].simulationTime,a=this.replayFrames[this.replayIndex],b=this.replayFrames[this.replayIndex+1]??a,at=a.simulationTime+(b.simulationTime-a.simulationTime)*this.replayAlpha;this.replayElapsed=Math.max(0,(at-start)/1.5);this.replayEndHold=0;this.replayPlaying=true}
 scrubReplay(position:number){if(!this.replayFrames.length)return;const value=Math.max(0,Math.min(this.replayFrames.length-1,position));this.replayIndex=Math.floor(value);this.replayAlpha=value-this.replayIndex;this.replayPlaying=false;this.replayEndHold=0}
 /** Seek by video time, including unevenly spaced contact and bounce frames. */
 scrubReplayTime(seconds:number){
  if(!this.replayFrames.length||!Number.isFinite(seconds))return;
  const target=this.replayFrames[0].simulationTime+Math.max(0,seconds)*1.5;
  const next=this.replayFrames.findIndex(frame=>frame.simulationTime>target);
  if(next<0){this.scrubReplay(this.replayFrames.length-1);return}
  if(next===0){this.scrubReplay(0);return}
  const a=this.replayFrames[next-1].simulationTime,b=this.replayFrames[next].simulationTime;
  this.scrubReplay(next-1+(b>a?(target-a)/(b-a):0));
 }
 get replayPosition(){return this.replayIndex===null?0:this.replayIndex+this.replayAlpha}
 replayView(){
  if(this.replayIndex===null)return null;const index=this.replayIndex,a=this.replayFrames[index],b=this.replayFrames[index+1]??a,t=this.replayBreaks.has(index)?0:this.replayAlpha,state=structuredClone(a),lerp=(x:number,y:number)=>x+(y-x)*t;
  state.simulationTime=lerp(a.simulationTime,b.simulationTime);state.elapsed=lerp(a.elapsed,b.elapsed);state.ball.position={x:lerp(a.ball.position.x,b.ball.position.x),y:lerp(a.ball.position.y,b.ball.position.y),z:lerp(a.ball.position.z,b.ball.position.z)};state.ball.velocity={x:lerp(a.ball.velocity.x,b.ball.velocity.x),y:lerp(a.ball.velocity.y,b.ball.velocity.y),z:lerp(a.ball.velocity.z,b.ball.velocity.z)};
  state.players=a.players.map(player=>{const next=b.players.find(candidate=>candidate.id===player.id)??player;const turn=Math.atan2(Math.sin(next.facing-player.facing),Math.cos(next.facing-player.facing));return {...structuredClone(player),position:{x:lerp(player.position.x,next.position.x),y:lerp(player.position.y,next.position.y),z:lerp(player.position.z,next.position.z)},facing:player.facing+turn*t}});
  return {state,shot:this.replayShots[index]};
 }
 update(dt:number){if(this.replayIndex!==null){if(this.replayPlaying){this.replayElapsed+=dt;const start=this.replayFrames[0].simulationTime,last=this.replayFrames.at(-1)!.simulationTime,target=start+this.replayElapsed*1.5;while(this.replayIndex<this.replayFrames.length-1&&this.replayFrames[this.replayIndex+1].simulationTime<=target)this.replayIndex++;const a=this.replayFrames[this.replayIndex],b=this.replayFrames[this.replayIndex+1];this.replayAlpha=b&&b.simulationTime>a.simulationTime?Math.max(0,Math.min(1,(target-a.simulationTime)/(b.simulationTime-a.simulationTime))):0;if(target>=last){this.replayEndHold+=dt;if(this.replayEndHold>=.65){this.replayIndex=this.replayFrames.length-1;this.replayAlpha=0;this.replayPlaying=false;this.replayEndHold=0}}}return}this.refreshStrategy();this.engine.update(dt);
  if(this.partnerReceptionDecision&&!this.customBusy){
   const preferred=this.shot.resolution!.bounced?'bounce':'air';
   const timing=([preferred,preferred==='air'?'bounce':'air'] as const).find(t=>this.receptionSetup(t)?.actor==='partner');
   if(timing)this.chooseReception(timing);
  }
  this.replayClock+=dt;if(this.state.phase==='flight'&&this.replayClock>=1/30||this.replayFrames.length===0||this.replayFrames.at(-1)?.phase!==this.state.phase){this.replayClock=0;this.replayFrames.push(this.snapshot());this.replayShots.push(structuredClone(this.shot))};
  if(this.state.phase==='decision'&&this.state.possession==='home'&&!this.customBusy){
   if(this.queuedReceptionShot){const queued=this.queuedReceptionShot;this.queuedReceptionShot=null;try{this.engine.offerCustom(queued.shot);this.submitIntent(queued.shot.intent);this.customCounts.set(queued.text,(this.customCounts.get(queued.text)??0)+1)}catch(error){this.customStatus=(error as Error).message}}
   else if(this.queuedReceptionIntent){const queued=this.queuedReceptionIntent;this.queuedReceptionIntent=null;const available=this.availableIntents.find(intent=>sameShotIntent(intent,queued));if(available)this.submitIntent({...available,source:queued.source});else this.customStatus='That shot is no longer available at contact.'}
  }
  if(this.state.phase==='decision'&&this.state.possession==='away'&&!this.thinking&&!this.state.paused)this.decideOpponent();else if(this.state.phase==='decision'&&this.state.currentHitter==='partner'&&this.partnerAutonomy&&!this.thinking&&!this.state.paused)this.decidePartner();if(this.state.phase==='complete'&&!this.awarded){this.awarded=true;this.lastResult=this.state.result;if(!this.practice){this.scoring.award(this.state.result!.winner);const last=this.replayFrames.at(-1);if(last)last.score={...this.scoring.score};this.gameReplay.push({frames:this.replayFrames,shots:this.replayShots})}}this.state.score={...this.scoring.score}}
 async submitCommand(text:string,source:'text'|'voice'='text'){
  if(this.customBusy)return;
  this.customDraft=text;
  const engine=this.engine,generation=this.generation,index=this.state.shotIndex;
  await this.previewCommand(text,!canParseInstantly(text),source);
  if(this.engine===engine&&this.generation===generation&&this.state.shotIndex===index&&this.state.phase==='decision'&&this.customPreview){this.playCustom();this.customDraft=''}
 }
 async previewCommand(text:string,useLLM=false,source:'text'|'voice'='text'){
  if(this.state.phase!=='decision'||this.state.possession!=='home'||!this.currentContext)throw new Error('Wait for your team contact.');
  if(!text.trim()||text.length>300)throw new Error('Use 1–300 characters.');
  const engine=this.engine,index=this.state.shotIndex,actor=this.state.currentHitter!,generation=this.generation,c=structuredClone(this.currentContext);
  this.customPreview=null;this.customBusy=true;this.customStatus='Interpreting…';
  try{let parsed;
   if(useLLM){const response=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({version:1,command:text,schema:COMMAND_SCHEMA,context:{actor,contact:c,players:this.state.players},options:[{}]})});if(!response.ok)throw new Error('Could not understand that shot right now. Try a simpler command.');parsed=validateCommand(await response.json())}else parsed=parseLocalCommand(text);
   if(this.engine!==engine||this.generation!==generation||this.state.shotIndex!==index||this.state.phase!=='decision')return;
   const preview=commandIntent(parsed,actor,c,this.state.players);preview.intent.source=source;if(parsed.shot==='serve'&&/\bflat\b/i.test(text))preview.intent.shape='flat';
   const highDrive=preview.intent.type==='drive'&&preview.intent.technique!=='atp'&&c.contact.y>SHOT_FAMILIES.drive.maxHeight&&c.opening==='rally'&&c.twoBounceSatisfied;
   const deferred=requestsBounce(text)||highDrive;
   const shot=deferred?this.planAfterBounce(preview.intent,'Custom tactical choice',c,this.state.players,this.customIndex):this.plan(preview.intent,'Custom tactical choice',c,this.state.players,this.customIndex);
   this.engine.offerCustom(shot);this.customPreview={...preview,text};this.customStatus=preview.note?`Shot understood. ${preview.note}`:'Shot understood.';
  }catch(e){if(this.engine===engine&&this.generation===generation&&this.state.shotIndex===index&&this.state.phase==='decision')this.customStatus=(e as Error).message}
  finally{if(this.engine===engine&&this.generation===generation)this.customBusy=false}
 }
 playCustom(){if(!this.customPreview)throw new Error('Preview a command first.');const {intent,text}=this.customPreview;this.submitIntent(intent);this.customCounts.set(text,(this.customCounts.get(text)??0)+1);if(this.customCounts.size>30)this.customCounts.delete(this.customCounts.keys().next().value!);this.customPreview=null}
 private planAfterBounce(intent:ShotIntent,reason:string,c:ShotContext,players:PlayerState[],index:number):RallyShot{
  if(c.opening!=='rally'||!c.twoBounceSatisfied)throw new Error('You cannot wait for another bounce during the serve or return sequence.');
  if(c.bounced){
   if(intent.type!=='drive'||c.contact.y<=SHOT_FAMILIES.drive.maxHeight)return this.plan(intent,reason,c,players,index);
   // A ball that already bounced must be hit before its second bounce.
   const lower={...c.contact,y:.65};
   const planned=this.plan(intent,`${reason}. Wait for the ball to drop; the delayed drive loses effectiveness.`,{...c,contact:lower},players,index,undefined,.7);
   planned.feedback?.difficulty.push('Delayed drive');
   return {...planned,contact:{...c.contact},legs:[{from:{...c.contact},to:lower,duration:.4,arc:0},...planned.legs]};
  }
  const velocity=this.state.ball.velocity,side=Math.sign(c.contact.z)||1,clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
  const fallDuration=clamp(.3+c.contact.y*.08,.34,.58);
  const bounce:Vec3={x:clamp(c.contact.x+velocity.x*fallDuration*.35,-COURT.width/2+.15,COURT.width/2-.15),y:.037,z:side*clamp(Math.abs(c.contact.z+velocity.z*fallDuration*.35),.35,COURT.length/2-.2)};
  const reboundDuration=.18,rebound:Vec3={x:clamp(bounce.x+velocity.x*.04,-COURT.width/2+.15,COURT.width/2-.15),y:.34,z:side*clamp(Math.abs(bounce.z+velocity.z*.04),.35,COURT.length/2-.2)};
  const bouncedContext:ShotContext={...c,contact:rebound,bounced:true,opening:'rally',twoBounceSatisfied:true,allowRisky:true,incomingSpeed:Math.max(2,c.incomingSpeed*.35)};
  const delayedDrive=intent.type==='drive';
  const planned=this.plan(intent,`${reason}. Let the ball bounce first.${delayedDrive?' The delayed drive loses effectiveness.':''}`,bouncedContext,players,index,undefined,delayedDrive?.7:1);
  if(delayedDrive)planned.feedback?.difficulty.push('Delayed drive');
  return {...planned,contact:{...c.contact},legs:[{from:{...c.contact},to:bounce,duration:fallDuration,arc:0,bounceAtEnd:true},{from:bounce,to:rebound,duration:reboundDuration,arc:.08},...planned.legs]};
 }
 /** At most one background request per point; an unfinished request never blocks play. */
 private refreshStrategy(){
  if(this.brainMode!=='llm'){
   this.request?.abort();this.request=null;this.strategy=undefined;
   this.brainStatus='Local adaptive opponent';return;
  }
  if(this.practice||this.state.paused||this.strategyPoint===this.point||this.request)return;
  this.strategyPoint=this.point;
  const generation=this.generation,controller=new AbortController();this.request=controller;
  const snapshot=tacticalSnapshot(this.state,[],this.memory,this.personality,this.intelligence);
  this.brainStatus=this.strategy?`Playing ${this.strategy.name.toLowerCase()} · refreshing strategy`:'Local tactics · strategy updating';
  const timer=setTimeout(()=>controller.abort(),6000);
  requestStrategy(snapshot,controller.signal).then(strategy=>{
   if(this.generation!==generation||this.request!==controller||this.brainMode!=='llm'||controller.signal.aborted)return;
   this.strategy=strategy;this.brainStatus=`LLM strategy · ${strategy.name}`;
  }).catch(()=>{
   if(this.generation!==generation||this.request!==controller)return;
   this.brainStatus=this.strategy?`Keeping strategy · ${this.strategy.name}`:'Local fallback · strategy unavailable';
  }).finally(()=>{clearTimeout(timer);if(this.request===controller)this.request=null;});
 }
 private opponentChoices:OpponentChoiceHistory[]=[];
 private decideOpponent(){
  const snapshot=tacticalSnapshot(this.state,this.availableIntents,this.memory,this.personality,this.intelligence);this.lastSnapshot=snapshot;
  const choice=localDecision(snapshot,this.brainMode==='llm'?this.strategy:undefined,{seed:(this.seed+this.point*104729+this.state.shotIndex*7919)>>>0,recent:this.opponentChoices});
  const intent=snapshot.options[choice];this.opponentChoices.push({intent:structuredClone(intent),receiver:intendedReceiver(snapshot,intent)});this.opponentChoices=this.opponentChoices.slice(-8);
  this.engine.submitIntent({...snapshot.options[choice],source:'ai'});
 }
 private decidePartner(){
  const engine=this.engine,generation=this.generation,index=this.state.shotIndex;
  this.thinking=true;
  globalThis.setTimeout(()=>{if(this.engine!==engine||this.generation!==generation||this.state.phase!=='decision'||this.state.shotIndex!==index||this.state.currentHitter!=='partner'||!this.partnerAutonomy||this.state.paused){this.thinking=false;return}const choice=this.availableIntents.find(intent=>intent.type===this.recommendationType)??this.availableIntents[0];if(choice)this.submitIntent({...choice,source:'ai'});this.thinking=false},550);
 }
 private startPoint(){
  this.awarded=false;this.observed=0;this.queuedReceptionIntent=null;this.queuedReceptionShot=null;this.pointRecords=[];this.replayFrames=[];this.replayShots=[];this.replayIndex=null;this.replayPlaying=false;this.replayClock=0;this.replayElapsed=0;this.replayAlpha=0;this.replayEndHold=0;
  const players:PlayerState[]=(Object.keys(PLAYER_PROFILES) as PlayerId[]).map(id=>({id,position:{x:0,y:0,z:0},team:id==='you'||id==='partner'?'home':'away',handedness:'right',facing:id==='you'||id==='partner'?0:Math.PI,skills:{...PLAYER_PROFILES[id].skills},tendencies:{...PLAYER_PROFILES[id].tendencies}}));
  for(const p of players){const side=p.team==='home'?1:-1,right=this.scoring.right[p.team]===p.id;p.position={x:(right?1:-1)*side*1.5,y:0,z:side*7};const profile=this.lineup[p.id]?ARCHETYPES[this.lineup[p.id]!]:PLAYER_PROFILES[p.id];p.tendencies=structuredClone(profile.tendencies);p.skills=structuredClone(profile.skills);const design=this.getPlayerDesign(p.id);if(design){p.skills={...design.skills};p.handedness=design.handedness}}
  const server=players.find(p=>p.id===this.scoring.server)!;
  // Only the diagonally designated receiver may return serve.
  const receiving=players.filter(p=>p.team!==server.team),receiver=receiving.find(p=>p.position.x*server.position.x<0)!;
  receiving.find(p=>p.id!==receiver.id)!.position.z=(server.team==='home'?-1:1)*(COURT.kitchen+.45);
  let contact={...server.position,y:.65};
  let opening:ShotContext={contact,feet:server.position,bounced:false,opening:'serve',twoBounceSatisfied:false,incomingSpeed:0};
  let firstActor=server.id;
  if(this.practice){const pattern=PATTERNS.find(p=>p.id===this.practice)!;const flip=this.variation%2?1:-1;const offset=(this.variation%5)*.12;
   for(const p of players)p.position={x:(p.id==='you'||p.id==='opponent-left'?1:-1)*flip*1.4,y:0,z:(p.team==='home'?1:-1)*2.8};
   const low=this.practice==='height'&&this.variation%2===0;
   contact={x:flip*(1+offset),y:low?.35:pattern.height,z:pattern.depth+offset};players[0].position={x:contact.x-.3,y:0,z:contact.z+.3};firstActor='you';
   if(this.practice==='split')players[2].position.z=-5.8;
   if(this.practice==='behind'){players[2].position.x=-.5;players[3].position.x=.5}
   if(this.practice==='weak')players[2].skills.reset=35;
   opening={contact,feet:players[0].position,bounced:!['counter','overhead'].includes(pattern.type)||low,opening:'rally',twoBounceSatisfied:true,incomingSpeed:this.practice==='counter'?16:8};
  }
  const provider:RallyProvider={
   setup:()=>({players,contact:{options:this.options(firstActor,opening,players,this.practice?2:0,this.practice?undefined:receiver.id)}}),
   shouldAutoPlay:()=>false,
   next:(state,shot)=>{
    const r=shot.resolution!;if(shot.actor==='you'||shot.actor==='partner')this.memory.add({intent:shot.intent,lowBackhandError:!!r.result&&r.result.winner==='away'&&!!shot.feedback?.difficulty.includes('Low backhand'),crash:Math.abs(shot.contact.z)-Math.abs(shot.positions[shot.actor].z)>1.2});if(r.result)return {kind:'point-end',result:r.result};
    const actor=state.players.find(p=>p.id===r.receiver)!;
    const context:ShotContext={contact:{...state.ball.position},feet:{...actor.position},bounced:r.bounced,opening:!this.practice&&state.shotHistory.length===1?'return':'rally',twoBounceSatisfied:state.bounces>=2,timingPressure:r.timingPressure,movementZ:r.movementZ,incomingSpeed:Math.hypot(state.ball.velocity.x,state.ball.velocity.y,state.ball.velocity.z)};
    const options=this.options(actor.id,context,state.players,state.shotHistory.length+(this.practice?2:0));
    return options.length?{kind:'contact',contact:{options}}:{kind:'point-end',result:{winner:other(actor.team),reason:'failed-return',playerId:actor.id}};
   }
  };
  this.engine=new RallyEngine(provider);this.state.score={...this.scoring.score};if(this.practice){this.state.bounces=2;this.state.shotIndex=2}
 }
 private receptionSetup(timing:'air'|'bounce'){
  if(!this.receptionDecision)return null;const branch=timing==='air'?this.shot.receptionChoice?.airborne:this.shot.receptionChoice?.bounced,actor=branch?.resolution.receiver;if(!branch||!actor)return null;
  const leg=branch.legs.at(-1)!;const players=this.state.players.map(player=>({...structuredClone(player),position:{...(branch.positions[player.id]??player.position)}}));const hitter=players.find(player=>player.id===actor)!;
  const context:ShotContext={contact:{...leg.to},feet:{...hitter.position},bounced:timing==='bounce',opening:'rally',twoBounceSatisfied:true,timingPressure:branch.resolution.timingPressure,movementZ:branch.resolution.movementZ,incomingSpeed:Math.hypot(...Object.values(sampleVelocity(leg,.99)))};
  return {actor,context,players,index:this.state.shotHistory.length+(this.practice?2:0)};
 }
 private options(actor:PlayerId,c:ShotContext,players:PlayerState[],index:number,serveReceiver?:PlayerId):RallyShot[]{
  const hitter=players.find(p=>p.id===actor)!;if(hitter.team==='home'){this.currentContext=structuredClone(c);this.customIndex=index;this.customPreview=null;this.customStatus=''}
  let policy=chooseOpponentShot(actor,c,players);
  if(actor==='partner'){
   if(this.partnerInstructions.soft){const soft=buildDecisionMenu(actor,c,players).find(o=>['dink','drop','reset','block'].includes(o.intent.type));if(soft)policy=soft}
   if(policy&&this.partnerInstructions.backhand&&policy.intent.type!=='serve'){
    const aimed=commandIntent({...parseLocalCommand(`${policy.intent.type} ${this.partnerInstructions.backhand} backhand`),pace:policy.intent.pace},actor,c,players);
    policy={intent:aimed.intent,reason:'Finn follows your backhand instruction.'};
   }
  }if(hitter.team==='home')this.recommendationType=actor==='partner'?policy?.intent.type??null:null;
  const menu=buildDecisionMenu(actor,c,players).map(o=>({intent:{...o.intent,source:hitter.team==='away'?'ai' as const:'menu' as const},reason:o.reason}));const choices=hitter.team==='home'?(actor==='partner'&&policy&&(this.partnerInstructions.backhand||this.partnerInstructions.soft)?[policy,...menu]:menu):policy?[policy,...menu.filter(o=>o.intent.type!==policy.intent.type)]:menu;
  const expanded=choices.flatMap(choice=>{
   if(choice.intent.type==='serve'&&hitter.team==='home')return [
    {intent:{...choice.intent,pace:'medium' as const,shape:'arc' as const,spin:{side:'none' as const,vertical:'topspin' as const,strength:'strong' as const},intendedNetClearance:.35},reason:'Topspin pulls the serve down into the court.'},
    {intent:{...choice.intent,pace:'medium' as const,shape:'flat' as const,spin:{side:'right' as const,vertical:'none' as const,strength:'strong' as const},intendedNetClearance:.25},reason:'Slice curves the serve sideways.'},
    {intent:{...choice.intent,pace:'medium' as const,shape:'arc' as const,spin:{side:'none' as const,vertical:'slice' as const,strength:'strong' as const},intendedNetClearance:.4},reason:'Backspin floats the serve and slows its rebound.'},
    {intent:{...choice.intent,pace:'fast' as const,shape:'flat' as const,spin:{side:'none' as const,vertical:'none' as const,strength:'medium' as const},intendedNetClearance:.12,aggression:.8},reason:'Fast serve puts the receiver under time pressure.'},
    {intent:{...choice.intent,pace:'soft' as const,shape:'arc' as const,spin:{side:'none' as const,vertical:'none' as const,strength:'medium' as const},intendedNetClearance:.65,aggression:.25},reason:'Slow serve changes the pace with a gentle arc.'},
   ];
   return choice.intent.type==='serve'?[choice]:[choice,{intent:{...choice.intent,target:{kind:'zone' as const,zone:'wide' as const,depth:['drop','reset','dink','block'].includes(choice.intent.type)?'kitchen' as const:'deep' as const}},reason:choice.reason+' Aim wider to move the defenders.'}];
  });
  if(!choices.some(choice=>choice.intent.type==='serve')){
   const zones=['middle','crosscourt','line','open-court'] as const;
   for(const choice of choices){
    const depth=['drop','reset','dink','block'].includes(choice.intent.type)?'kitchen' as const:'deep' as const;
    const currentZone=choice.intent.target.kind==='zone'?choice.intent.target.zone:null;
    for(const zone of zones)if(zone!==currentZone)expanded.push({intent:{...choice.intent,target:{kind:'zone',zone,depth}},reason:`${choice.reason} Target ${zone.replace('-',' ')} for a different look.`});
   }
  }
    if(hitter.team==='away'&&index>1){const base=choices.find(o=>['drive','counter','volley'].includes(o.intent.type));if(base)for(const p of players.filter(p=>p.team!==hitter.team))expanded.push({intent:{...base.intent,target:{kind:'player',playerId:p.id,aim:'feet'}},reason:'Pressure a low contact.'})}
  return expanded.flatMap(({intent,reason})=>{try{return [{...this.plan(intent,reason,c,players,index,serveReceiver),recommendation:actor==='partner'&&intent.type===policy?.intent.type?`Finn prefers ${intent.type}: ${policy.reason}`:undefined}]}catch{return []}});
 }
 private plan(intent:ShotIntent,reason:string,c:ShotContext,players:PlayerState[],index:number,serveReceiver?:PlayerId,balance=1):RallyShot{
  const hitter=players.find(p=>p.id===intent.actor)!,team=hitter.team;
  const execution=executeShot(intent,c,players,{seed:(this.seed+this.point*104729+index*7919)>>>0,balance});
  let legs=[execution.leg],result:PointResult|undefined,receiver:PlayerId|null=null,bounced=false;
  type Candidate={leg:FlightLeg;offset:number;bounce:boolean};
  type Reception={candidate:Candidate;t:number;receiver:PlayerId;feet:Vec3;overhead:boolean;pressure:number;miss:boolean};
  let receptions:Reception[]=[];
  let dodge:{id:PlayerId;position:Vec3}|undefined;
  const bodyServe=intent.type==='serve'&&intent.target.kind==='player'&&intent.target.aim==='body';
  if(bodyServe&&execution.outcome!=='net'&&intent.target.kind==='player'){
   const targetId=intent.target.playerId,target=players.find(p=>p.id===targetId)!;
   const attempt=resolveBodyServe(legs[0],target,(this.seed+this.point*104729+index*7919)>>>0);
   legs=[attempt.leg];
   if(attempt.hit){result={winner:team,reason:'body-hit',playerId:targetId};reason+=' Serve hits the opponent before bouncing.'}
   else {reason+=' Body serve missed or was dodged; its landing must be in the diagonal service box.';if(attempt.dodge)dodge={id:target.id,position:attempt.dodge}}
  }
  const endpoint=legs[0].to;
  if(execution.outcome==='net'){
   result={winner:other(team),reason:'net',playerId:intent.actor};
   const netContact={...legs[0].to},side=Math.sign(c.contact.z)||1;
   legs=[legs[0],{from:netContact,to:{x:netContact.x,y:.037,z:netContact.z+side*.42},duration:.48,arc:.025,bounceAtEnd:true}];
  }
  else if(!result&&(execution.outcome==='out'||(intent.type==='serve'&&(endpoint.x*c.contact.x>=0||Math.abs(endpoint.z)<=COURT.kitchen+.037||Math.abs(endpoint.x)>COURT.width/2+.037||Math.abs(endpoint.z)>COURT.length/2+.037))))result={winner:other(team),reason:'out',playerId:intent.actor};
  const opponents=players.filter(p=>p.team!==team&&(intent.type==='serve'?p.position.x*c.contact.x<0:!serveReceiver||p.id===serveReceiver));
  let receiveFeet:Vec3|undefined;
  if(!result){
   const base=legs[0],rebound=base.bounceAtEnd?reboundFlight(base):{...base,from:base.to,to:{...base.to,y:.037},duration:.4,arc:0,bounceAtEnd:true};
   // Search airborne contacts first after the two-bounce opening, then a first-bounce pickup.
   const candidates:Candidate[]=index<2?[{leg:rebound,offset:base.duration,bounce:true}]:[{leg:base,offset:0,bounce:false},{leg:rebound,offset:base.duration,bounce:true}];
   for(const candidate of candidates){
    let found=false;
    for(let step=1;step<40&&!found;step++){
     const t=step/40,p=sampleLeg(candidate.leg,t),elapsed=candidate.offset+t*candidate.leg.duration;
     if(p.z*c.contact.z>=0||p.y<(candidate.bounce?.7:.3)||p.y>SHOT_FAMILIES.overhead.maxHeight)continue;
     for(const player of [...opponents].sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z))){
      const side=player.team==='home'?1:-1;
      const lateral=p.x-player.position.x;
      const rawFeetZ=p.z+side*.3;
      if(!candidate.bounce&&Math.abs(p.z)<COURT.kitchen-1.55)continue;
      const feet={x:p.x-Math.sign(lateral||side)*Math.min(1,Math.max(.25,Math.abs(lateral)*.35)),y:0,z:candidate.bounce?rawFeetZ:side*Math.max(Math.abs(rawFeetZ),COURT.kitchen+.08)};
      const distance=Math.hypot(feet.x-player.position.x,feet.z-player.position.z);
      const testContext:ShotContext={contact:p,feet,bounced:candidate.bounce,opening:index===0?'return':'rally',twoBounceSatisfied:index>=1,incomingSpeed:Math.hypot(...Object.values(sampleVelocity(candidate.leg,t)))};
      const menu=buildDecisionMenu(player.id,testContext,players);if(!menu.length)continue;
      const overhead=menu.some(option=>option.intent.type==='overhead');
      const speed=testContext.incomingSpeed;
      const timing=receptionTiming(player,distance,elapsed,speed,candidate.bounce);
      // A high pop-up may be chased aggressively; movementZ then makes the overhead execution difficult.
      if(!timing.reachable)continue;
      receptions.push({candidate,t,receiver:player.id,feet,overhead,pressure:timing.pressure,miss:receptionRoll(execution.seed,player)<swingMissChance(player,timing.pressure,speed)});found=true;break;
     }
    }
   }
   const chosen=receptions[0];
   if(chosen&&!chosen.miss){receiver=chosen.receiver;receiveFeet=chosen.feet;bounced=chosen.candidate.bounce;legs=chosen.candidate.bounce?[base,interceptFlight(rebound,chosen.t)]:[interceptFlight(base,chosen.t)]}
   if(!receiver){
    const second={from:{...rebound.to},to:{x:rebound.to.x,y:.037,z:rebound.to.z},duration:.45,arc:.1,bounceAtEnd:true};legs=[base,rebound,second];
    const nearest=[...opponents].sort((a,b)=>Math.hypot(a.position.x-base.to.x,a.position.z-base.to.z)-Math.hypot(b.position.x-base.to.x,b.position.z-base.to.z))[0];
    result={winner:team,playerId:chosen?.receiver??nearest?.id,reason:chosen?.miss?'missed-swing':intent.type==='overhead'?'winner':['drive','counter','volley','flick'].includes(intent.type)?'unreturned-attack':'double-bounce'};
   }
  }
  if(!bodyServe&&index>=2&&execution.outcome!=='net'){
   const flight=execution.leg;
   const paddleAt=receiver?legs.reduce((n,l)=>n+l.duration,0):Infinity;
   outer:for(let step=1;step<100;step++){
    const t=step/100,elapsed=t*flight.duration;if(elapsed>=paddleAt)break;
    const ball=sampleLeg(flight,t);if(ball.y<.4||ball.y>1.6)continue;
    for(const player of players.filter(p=>p.team!==team)){
     if(Math.hypot(ball.x-player.position.x,ball.z-player.position.z)>.38)continue;
     const speed=Math.hypot(...Object.values(sampleVelocity(flight,t)));
     const timing=receptionTiming(player,0,elapsed,speed,false);
     const chance=Math.min(.85,(1-player.skills.hands/100)*(.12+timing.pressure*.75)+(1-player.skills.movement/100)*.12);
     if(receptionRoll(execution.seed^0x5f3759df,player)>=chance)continue;
     result={winner:team,reason:'body-hit',playerId:player.id};
     receiver=null;legs=[interceptFlight(flight,t)];reason+=' The defender was too slow to block or dodge the body shot.';break outer;
    }
   }
  }
  if(result?.reason==='out')legs.push(...outBallContinuation(legs.at(-1)!));
  const duration=legs.reduce((n,l)=>n+l.duration,0);
  const positioningPlayers=this.partnerInstructions.crash&&intent.actor==='you'&&intent.type==='drive'?players.map(p=>p.id==='partner'?{...p,tendencies:{...p.tendencies,kitchenApproach:1}}:p):players;
  const positions=planPositions({players:positioningPlayers,intent,endpoint:result?.reason==='out'?execution.leg.to:legs.at(-1)!.to,receiver:null,completedShots:index,duration});
  if(bodyServe&&intent.target.kind==='player'){const id=intent.target.playerId;positions[id]={...players.find(p=>p.id===id)!.position}}
  if(dodge)positions[dodge.id]=dodge.position;
  if(receiver&&receiveFeet)positions[receiver]=receiveFeet;
  const missed=receptions[0]?.miss&&result?.reason==='missed-swing'?receptions[0]:undefined;
  if(missed)positions[missed.receiver]=missed.feet;
  if(result?.reason==='body-hit'&&result.playerId)positions[result.playerId]={...players.find(p=>p.id===result!.playerId)!.position};
  let receptionChoice:RallyShot['receptionChoice'];
  const airborne=receptions.find(item=>!item.miss&&!item.candidate.bounce),afterBounce=receptions.find(item=>!item.miss&&item.candidate.bounce);
  if(!result&&team==='away'&&index>=2&&(airborne||afterBounce)){
   const branch=(item:Reception)=>{
    const branchLegs=item.candidate.bounce?[execution.leg,interceptFlight(item.candidate.leg,item.t)]:[interceptFlight(execution.leg,item.t)];
    const branchDuration=branchLegs.reduce((sum,leg)=>sum+leg.duration,0);
    const branchPositions=planPositions({players:positioningPlayers,intent,endpoint:branchLegs.at(-1)!.to,receiver:null,completedShots:index,duration:branchDuration});
    branchPositions[item.receiver]=item.feet;
    return {legs:branchLegs,positions:branchPositions,resolution:{timingPressure:item.pressure,receiver:item.receiver,bounced:item.candidate.bounce,movementZ:(branchPositions[item.receiver].z-players.find(player=>player.id===item.receiver)!.position.z)/branchDuration}};
   };
   receptionChoice={...(airborne?{airborne:branch(airborne)}:{}),...(afterBounce?{bounced:branch(afterBounce)}:{})};
  }
  return {...(missed?{missedSwing:{playerId:missed.receiver,time:missed.candidate.offset+missed.t*missed.candidate.leg.duration}}:{}),intent,actor:intent.actor,contact:{...c.contact},aimPoint:execution.intended.aimPoint,legs,positions,title:`${intent.actor==='partner'?'Finn':intent.actor==='you'?'You':'Opponent'} · ${intent.technique==='atp'?'ATP':SHOT_FAMILIES[intent.type].name}`,description:reason,cue:reason,feedback:{skill:execution.skill,quality:execution.quality,difficulty:execution.difficulty,deviation:execution.endpointError,mishit:execution.mishit},resolution:{timingPressure:receptions[0]?.pressure,receiver,bounced,result,movementZ:receiver?(positions[receiver].z-players.find(p=>p.id===receiver)!.position.z)/duration:0},...(receptionChoice?{receptionChoice}:{})};
 }
}
