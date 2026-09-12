import type {PartnerCall} from './voice';
import {validatePlayer,type DesignedPlayer} from './player-design';
import {resolveBodyServe} from './engine/serve-body';
import {commandIntent,canParseInstantly,parseLocalCommand,requestsBounce,validateCommand,COMMAND_SCHEMA} from './engine/custom-command';
import {PATTERNS,recognizePatterns,assessChoice,type PatternId,type PracticeRecord} from './engine/patterns';
import {OpponentMemory,tacticalSnapshot,localDecision,requestOpponent,type Personality,type TacticalSnapshot} from './engine/opponent-brain';
import {PLAYER_PROFILES,ARCHETYPES} from './engine/player-profiles';
import {RallyEngine,sampleLeg,sampleVelocity} from './engine/rally-engine';
import {COURT,type PlayerState,type PlayerId,type RallyShot,type RallyProvider,type ShotIntent,type PointResult,type Vec3} from './engine/model';
import {type ShotContext,SHOT_FAMILIES} from './engine/shot-families';
import {buildDecisionMenu} from './engine/decision-menu';
import {chooseOpponentShot} from './engine/opponent-policy';
import {executeShot} from './engine/execution';
import {interceptFlight,reboundFlight} from './engine/trajectory';
import {planPositions} from './engine/positioning';
import {pressureMiddle} from './scenarios/pressure-middle';
import {DoublesScore,other} from './engine/scoring';

export class Match {
 customPreview:{intent:ShotIntent;note:string;text:string}|null=null;customStatus='';customBusy=false;customDraft='';customCounts=new Map<string,number>();private currentContext:ShotContext|null=null;private customIndex=0;
 practice:PatternId|null=null;variation=0;records:PracticeRecord[]=[];pointRecords:PracticeRecord[]=[];replayFrames:ReturnType<RallyEngine['snapshot']>[]=[];replayShots:RallyShot[]=[];replayIndex:number|null=null;replayPlaying=false;private replayClock=0;private replayElapsed=0;private replayAlpha=0;private replayEndHold=0;
 private designedPlayer:DesignedPlayer|null=null;
 get playerDesign(){return this.designedPlayer?structuredClone(this.designedPlayer):null}
 setPlayerDesign(player:DesignedPlayer|null){this.designedPlayer=player?validatePlayer(player):null;this.reset()}
 lineup:Partial<Record<PlayerId,keyof typeof ARCHETYPES>>={};
 brainMode:'local'|'llm'=typeof window==='undefined'?'local':'llm';personality:Personality='Chess Player';intelligence=.8;memory=new OpponentMemory();brainStatus=typeof window==='undefined'?'Local opponent':'LLM with local fallback';thinking=false;partnerAutonomy=false;lastSnapshot:TacticalSnapshot|null=null;private request:AbortController|null=null;private generation=0;private observed=0;
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
 get state(){return this.engine.state} get shot(){return this.engine.shot} get availableIntents(){return this.engine.availableIntents}
 previewIntent(intent:unknown){return this.engine.previewIntent(intent)}
 snapshot(){return this.engine.snapshot()}
 reset(){this.customPreview=null;this.customBusy=false;this.customStatus='';this.request?.abort();this.generation++;this.thinking=false;this.memory=new OpponentMemory();this.observed=0;this.scoring=new DoublesScore();this.point=0;this.lastResult=null;this.startPoint()}
 nextPoint(){if(this.state.phase!=='complete'||this.scoring.winner)throw new Error('Finish the current point first.');this.point++;this.variation++;this.startPoint()}
 submitIntent(intent:unknown){const before=this.snapshot(),actualShotIndex=before.shotIndex;if(this.practice)before.shotIndex+=before.shotHistory.length?2:0;this.engine.submitIntent(intent);if(before.possession==='home'){const selected=this.shot.intent;for(const pattern of this.practice?[this.practice]:recognizePatterns(before)){const assessment=assessChoice(before,selected,pattern);const row={pattern,...assessment,intent:structuredClone(selected),shotIndex:actualShotIndex};this.records.push(row);this.pointRecords.push(row)}this.records=this.records.slice(-500)}}
 startPractice(id:PatternId|null){this.practice=id;this.variation++;this.reset()}

 startReplay(){if(this.state.phase!=='complete'||!this.replayFrames.length)return;this.replayIndex=0;this.replayElapsed=0;this.replayAlpha=0;this.replayEndHold=0;this.replayPlaying=true}
 stopReplay(){this.replayIndex=null;this.replayPlaying=false;this.replayElapsed=0;this.replayAlpha=0;this.replayEndHold=0}
 pauseReplay(){this.replayPlaying=false;this.replayEndHold=0}
 resumeReplay(){if(this.replayIndex===null||this.replayIndex>=this.replayFrames.length-1){this.startReplay();return}const start=this.replayFrames[0].simulationTime,a=this.replayFrames[this.replayIndex],b=this.replayFrames[this.replayIndex+1]??a,at=a.simulationTime+(b.simulationTime-a.simulationTime)*this.replayAlpha;this.replayElapsed=Math.max(0,(at-start)/1.5);this.replayEndHold=0;this.replayPlaying=true}
 scrubReplay(position:number){if(!this.replayFrames.length)return;const value=Math.max(0,Math.min(this.replayFrames.length-1,position));this.replayIndex=Math.floor(value);this.replayAlpha=value-this.replayIndex;this.replayPlaying=false;this.replayEndHold=0}
 get replayPosition(){return this.replayIndex===null?0:this.replayIndex+this.replayAlpha}
 replayView(){
  if(this.replayIndex===null)return null;const index=this.replayIndex,a=this.replayFrames[index],b=this.replayFrames[index+1]??a,t=this.replayAlpha,state=structuredClone(a),lerp=(x:number,y:number)=>x+(y-x)*t;
  state.simulationTime=lerp(a.simulationTime,b.simulationTime);state.elapsed=lerp(a.elapsed,b.elapsed);state.ball.position={x:lerp(a.ball.position.x,b.ball.position.x),y:lerp(a.ball.position.y,b.ball.position.y),z:lerp(a.ball.position.z,b.ball.position.z)};state.ball.velocity={x:lerp(a.ball.velocity.x,b.ball.velocity.x),y:lerp(a.ball.velocity.y,b.ball.velocity.y),z:lerp(a.ball.velocity.z,b.ball.velocity.z)};
  state.players=a.players.map(player=>{const next=b.players.find(candidate=>candidate.id===player.id)??player;const turn=Math.atan2(Math.sin(next.facing-player.facing),Math.cos(next.facing-player.facing));return {...structuredClone(player),position:{x:lerp(player.position.x,next.position.x),y:lerp(player.position.y,next.position.y),z:lerp(player.position.z,next.position.z)},facing:player.facing+turn*t}});
  return {state,shot:this.replayShots[index]};
 }
 update(dt:number){if(this.replayIndex!==null){if(this.replayPlaying){this.replayElapsed+=dt;const start=this.replayFrames[0].simulationTime,last=this.replayFrames.at(-1)!.simulationTime,target=start+this.replayElapsed*1.5;while(this.replayIndex<this.replayFrames.length-1&&this.replayFrames[this.replayIndex+1].simulationTime<=target)this.replayIndex++;const a=this.replayFrames[this.replayIndex],b=this.replayFrames[this.replayIndex+1];this.replayAlpha=b&&b.simulationTime>a.simulationTime?Math.max(0,Math.min(1,(target-a.simulationTime)/(b.simulationTime-a.simulationTime))):0;if(target>=last){this.replayEndHold+=dt;if(this.replayEndHold>=.65){this.replayIndex=this.replayFrames.length-1;this.replayAlpha=0;this.replayPlaying=false;this.replayEndHold=0}}}return}this.engine.update(dt);this.replayClock+=dt;if(this.state.phase==='flight'&&this.replayClock>=1/30||this.replayFrames.length===0||this.replayFrames.at(-1)?.phase!==this.state.phase){this.replayClock=0;if(this.replayFrames.length<3000){this.replayFrames.push(this.snapshot());this.replayShots.push(structuredClone(this.shot))}};
  if(this.state.phase==='decision'&&this.state.possession==='away'&&!this.thinking&&!this.state.paused)this.decideOpponent();else if(this.state.phase==='decision'&&this.state.currentHitter==='partner'&&this.partnerAutonomy&&!this.thinking&&!this.state.paused)this.decidePartner();if(this.state.phase==='complete'&&!this.awarded){this.awarded=true;this.lastResult=this.state.result;if(!this.practice)this.scoring.award(this.state.result!.winner)}this.state.score={...this.scoring.score}}
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
   const preview=commandIntent(parsed,actor,c,this.state.players);preview.intent.source=source;
   const deferred=requestsBounce(text);
   const shot=deferred?this.planAfterBounce(preview.intent,'Custom tactical choice',c,this.state.players,this.customIndex):this.plan(preview.intent,'Custom tactical choice',c,this.state.players,this.customIndex);
   this.engine.offerCustom(shot);this.customPreview={...preview,text};this.customStatus=preview.note?`Shot understood. ${preview.note}`:'Shot understood.';
  }catch(e){if(this.engine===engine&&this.generation===generation&&this.state.shotIndex===index&&this.state.phase==='decision')this.customStatus=(e as Error).message}
  finally{if(this.engine===engine&&this.generation===generation)this.customBusy=false}
 }
 playCustom(){if(!this.customPreview)throw new Error('Preview a command first.');const {intent,text}=this.customPreview;this.submitIntent(intent);this.customCounts.set(text,(this.customCounts.get(text)??0)+1);if(this.customCounts.size>30)this.customCounts.delete(this.customCounts.keys().next().value!);this.customPreview=null}
 private planAfterBounce(intent:ShotIntent,reason:string,c:ShotContext,players:PlayerState[],index:number):RallyShot{
  if(c.opening!=='rally'||!c.twoBounceSatisfied)throw new Error('You cannot wait for another bounce during the serve or return sequence.');
  if(c.bounced)return this.plan(intent,reason,c,players,index);
  const velocity=this.state.ball.velocity,side=Math.sign(c.contact.z)||1,clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
  const fallDuration=clamp(.3+c.contact.y*.08,.34,.58);
  const bounce:Vec3={x:clamp(c.contact.x+velocity.x*fallDuration*.35,-COURT.width/2+.15,COURT.width/2-.15),y:.037,z:side*clamp(Math.abs(c.contact.z+velocity.z*fallDuration*.35),.35,COURT.length/2-.2)};
  const reboundDuration=.18,rebound:Vec3={x:clamp(bounce.x+velocity.x*.04,-COURT.width/2+.15,COURT.width/2-.15),y:.34,z:side*clamp(Math.abs(bounce.z+velocity.z*.04),.35,COURT.length/2-.2)};
  const bouncedContext:ShotContext={...c,contact:rebound,bounced:true,opening:'rally',twoBounceSatisfied:true,allowRisky:true,incomingSpeed:Math.max(2,c.incomingSpeed*.35)};
  const planned=this.plan(intent,`${reason}. You chose to let the ball bounce first.`,bouncedContext,players,index);
  return {...planned,contact:{...c.contact},legs:[{from:{...c.contact},to:bounce,duration:fallDuration,arc:0,bounceAtEnd:true},{from:bounce,to:rebound,duration:reboundDuration,arc:.08},...planned.legs]};
 }
 private decideOpponent(){
  const engine=this.engine,generation=this.generation;
  const snapshot=tacticalSnapshot(this.state,this.availableIntents,this.memory,this.personality,this.intelligence);this.lastSnapshot=snapshot;
  const apply=(i:number)=>{if(this.engine!==engine||this.generation!==generation)return;engine.submitIntent({...snapshot.options[i],source:'ai'});this.thinking=false};
  if(this.brainMode==='local'){this.brainStatus='Local adaptive opponent';apply(localDecision(snapshot));return}
  this.thinking=true;this.brainStatus='Opponent thinking…';const controller=new AbortController();this.request=controller;const timer=setTimeout(()=>controller.abort(),30000);
  requestOpponent(snapshot,controller.signal).then(i=>{if(this.generation!==generation)return;this.brainStatus='LLM selected intent';apply(i)}).catch(()=>{if(this.generation!==generation)return;this.brainStatus='Local fallback · model unavailable or invalid';apply(localDecision(snapshot))}).finally(()=>clearTimeout(timer));
 }
 private decidePartner(){
  const engine=this.engine,generation=this.generation,index=this.state.shotIndex;
  this.thinking=true;
  globalThis.setTimeout(()=>{if(this.engine!==engine||this.generation!==generation||this.state.phase!=='decision'||this.state.shotIndex!==index||this.state.currentHitter!=='partner'){this.thinking=false;return}const choice=this.availableIntents.find(intent=>intent.type===this.recommendationType)??this.availableIntents[0];if(choice)this.submitIntent({...choice,source:'ai'});this.thinking=false},550);
 }
 private startPoint(){
  this.awarded=false;this.observed=0;this.pointRecords=[];this.replayFrames=[];this.replayShots=[];this.replayIndex=null;this.replayPlaying=false;this.replayClock=0;this.replayElapsed=0;this.replayAlpha=0;this.replayEndHold=0;
  const players=pressureMiddle.setup().players;
  for(const p of players){const side=p.team==='home'?1:-1,right=this.scoring.right[p.team]===p.id;p.position={x:(right?1:-1)*side*1.5,y:0,z:side*7};const profile=this.lineup[p.id]?ARCHETYPES[this.lineup[p.id]!]:PLAYER_PROFILES[p.id];p.tendencies=structuredClone(profile.tendencies);p.skills=structuredClone(profile.skills);if(p.id==='you'&&this.designedPlayer){p.skills={...this.designedPlayer.skills};p.handedness=this.designedPlayer.handedness}}
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
    const context:ShotContext={contact:{...state.ball.position},feet:{...actor.position},bounced:r.bounced,opening:!this.practice&&state.shotHistory.length===1?'return':'rally',twoBounceSatisfied:state.bounces>=2,movementZ:r.movementZ,incomingSpeed:Math.hypot(state.ball.velocity.x,state.ball.velocity.y,state.ball.velocity.z)};
    const options=this.options(actor.id,context,state.players,state.shotHistory.length+(this.practice?2:0));
    return options.length?{kind:'contact',contact:{options}}:{kind:'point-end',result:{winner:other(actor.team),reason:'failed-return'}};
   }
  };
  this.engine=new RallyEngine(provider);this.state.score={...this.scoring.score};if(this.practice){this.state.bounces=2;this.state.shotIndex=2}
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
    {intent:{...choice.intent,target:{kind:'zone' as const,zone:'crosscourt' as const,depth:'deep' as const},pace:'fast' as const,shape:'flat' as const,intendedNetClearance:.12,tacticalIntent:'pressure' as const,aggression:.75},reason:'Drive a firm, low serve to the back of the diagonal service box.'},
    {intent:{...choice.intent,target:{kind:'zone' as const,zone:'crosscourt' as const,depth:'deep' as const},pace:'medium' as const,shape:'arc' as const,spin:{side:'none' as const,vertical:'topspin' as const,strength:'strong' as const},intendedNetClearance:.35,tacticalIntent:'pressure' as const,aggression:.65},reason:'Use strong topspin to pull a higher-margin serve down into the back of the box.'},
    {intent:{...choice.intent,target:{kind:'zone' as const,zone:'wide' as const,depth:'deep' as const},pace:'medium' as const,shape:'flat' as const,spin:{side:'right' as const,vertical:'slice' as const,strength:'medium' as const},intendedNetClearance:.18,tacticalIntent:'pressure' as const,aggression:.55},reason:'Use right slice to bend the serve toward the sideline.'},
    {intent:{...choice.intent,target:{kind:'zone' as const,zone:'wide' as const,depth:'transition' as const},pace:'soft' as const,shape:'arc' as const,intendedNetClearance:.3,tacticalIntent:'sustain' as const,aggression:.3},reason:'Change the rhythm with a shorter serve near the outside corner.'},
    {intent:{...choice.intent,target:{kind:'zone' as const,zone:'crosscourt' as const,depth:'deep' as const},pace:'soft' as const,shape:'arc' as const,intendedNetClearance:2.5,tacticalIntent:'sustain' as const,aggression:.2},reason:'Send a high lob serve deep to change the receiver’s contact point.'},
    {intent:{...choice.intent,target:{kind:'zone' as const,zone:'wide' as const,depth:'deep' as const},pace:'fast' as const,shape:'flat' as const,intendedNetClearance:.12,tacticalIntent:'pressure' as const,aggression:.85},reason:'Trade margin for pace and drive the serve toward the outside line.'},
    {intent:{...choice.intent,target:{kind:'zone' as const,zone:'crosscourt' as const,depth:'transition' as const},pace:'medium' as const,shape:'arc' as const,spin:{side:'none' as const,vertical:'topspin' as const,strength:'medium' as const},intendedNetClearance:.45,tacticalIntent:'sustain' as const,aggression:.4},reason:'Use topspin and shorter depth to disrupt the receiver’s setup.'},
    ...(serveReceiver?[{intent:{...choice.intent,target:{kind:'player' as const,playerId:serveReceiver,aim:'body' as const},pace:'fast' as const,shape:'flat' as const,intendedNetClearance:.12,tacticalIntent:'pressure' as const,aggression:.8},reason:'Jam the designated receiver with a legal body serve.'}]:[]),
   ];
   return choice.intent.type==='serve'?[choice]:[choice,{intent:{...choice.intent,target:{kind:'zone' as const,zone:'wide' as const,depth:['drop','reset','dink','block'].includes(choice.intent.type)?'kitchen' as const:'deep' as const}},reason:choice.reason+' Aim wider to move the defenders.'}];
  });
  if(hitter.team==='home'&&!choices.some(choice=>choice.intent.type==='serve')){
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
 private plan(intent:ShotIntent,reason:string,c:ShotContext,players:PlayerState[],index:number,serveReceiver?:PlayerId):RallyShot{
  const hitter=players.find(p=>p.id===intent.actor)!,team=hitter.team;
  const execution=executeShot(intent,c,players,{seed:(this.seed+this.point*104729+index*7919)>>>0,balance:1});
  let legs=[execution.leg],result:PointResult|undefined,receiver:PlayerId|null=null,bounced=false;
  let dodge:{id:PlayerId;position:Vec3}|undefined;
  const bodyServe=intent.type==='serve'&&intent.target.kind==='player'&&intent.target.aim==='body';
  if(bodyServe&&execution.outcome!=='net'&&intent.target.kind==='player'){
   const targetId=intent.target.playerId,target=players.find(p=>p.id===targetId)!;
   const attempt=resolveBodyServe(legs[0],target,(this.seed+this.point*104729+index*7919)>>>0);
   legs=[attempt.leg];
   if(attempt.hit){result={winner:team,reason:'body-hit'};reason+=' Serve hits the opponent before bouncing.'}
   else {reason+=' Body serve missed or was dodged; its landing must be in the diagonal service box.';if(attempt.dodge)dodge={id:target.id,position:attempt.dodge}}
  }
  const endpoint=legs[0].to;
  if(execution.outcome==='net'){
   result={winner:other(team),reason:'net'};
   const netContact={...legs[0].to},side=Math.sign(c.contact.z)||1;
   legs=[legs[0],{from:netContact,to:{x:netContact.x,y:.037,z:netContact.z+side*.42},duration:.48,arc:.025,bounceAtEnd:true}];
  }
  else if(!result&&(execution.outcome==='out'||(intent.type==='serve'&&(endpoint.x*c.contact.x>=0||Math.abs(endpoint.z)<=COURT.kitchen+.037||Math.abs(endpoint.x)>COURT.width/2+.037||Math.abs(endpoint.z)>COURT.length/2+.037))))result={winner:other(team),reason:'out'};
  const opponents=players.filter(p=>p.team!==team&&(intent.type==='serve'?p.position.x*c.contact.x<0:!serveReceiver||p.id===serveReceiver));
  let receiveFeet:Vec3|undefined;
  if(!result){
   const base=legs[0],rebound=base.bounceAtEnd?reboundFlight(base):{...base,from:base.to,to:{...base.to,y:.037},duration:.4,arc:0,bounceAtEnd:true};
   // Search airborne contacts first after the two-bounce opening, then a first-bounce pickup.
   const candidates=index<2?[{leg:rebound,offset:base.duration,bounce:true}]:[{leg:base,offset:0,bounce:false},{leg:rebound,offset:base.duration,bounce:true}];
   for(const candidate of candidates){
    for(let step=1;step<40&&!receiver;step++){
     const t=step/40,p=sampleLeg(candidate.leg,t),elapsed=candidate.offset+t*candidate.leg.duration;
     if(p.z*c.contact.z>=0||p.y<(candidate.bounce?.7:.3)||p.y>2.7)continue;
     for(const player of [...opponents].sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z))){
      const side=player.team==='home'?1:-1;
      const lateral=p.x-player.position.x;
      const feet={x:p.x-Math.sign(lateral||side)*Math.min(1,Math.max(.25,Math.abs(lateral)*.35)),y:0,z:p.z+side*.3};
      if(!candidate.bounce&&Math.abs(feet.z)<COURT.kitchen+.15)continue;
      const distance=Math.hypot(feet.x-player.position.x,feet.z-player.position.z);
      if(distance>(1.8+player.skills.movement/100*2)*Math.max(0,elapsed-.12)+.35)continue;
      const testContext:ShotContext={contact:p,feet,bounced:candidate.bounce,opening:index===0?'return':'rally',twoBounceSatisfied:index>=1,incomingSpeed:Math.hypot(...Object.values(sampleVelocity(candidate.leg,t)))};
      if(!buildDecisionMenu(player.id,testContext,players).length)continue;
      receiver=player.id;receiveFeet=feet;bounced=candidate.bounce;
      legs=candidate.bounce?[base,interceptFlight(rebound,t)]:[interceptFlight(base,t)];break;
     }
    }
    if(receiver)break;
   }
   if(!receiver){
    const second={from:{...rebound.to},to:{x:rebound.to.x,y:.037,z:rebound.to.z},duration:.45,arc:.1,bounceAtEnd:true};legs=[base,rebound,second];
    result={winner:team,reason:intent.type==='overhead'?'winner':['drive','counter','volley'].includes(intent.type)?'unreturned-attack':'double-bounce'};
   }
  }
  const duration=legs.reduce((n,l)=>n+l.duration,0);
  const positioningPlayers=this.partnerInstructions.crash&&intent.actor==='you'&&intent.type==='drive'?players.map(p=>p.id==='partner'?{...p,tendencies:{...p.tendencies,kitchenApproach:1}}:p):players;
  const positions=planPositions({players:positioningPlayers,intent,endpoint:legs.at(-1)!.to,receiver:null,completedShots:index,duration});
  if(bodyServe&&intent.target.kind==='player'){const id=intent.target.playerId;positions[id]={...players.find(p=>p.id===id)!.position}}
  if(dodge)positions[dodge.id]=dodge.position;
  if(receiver&&receiveFeet)positions[receiver]=receiveFeet;
  return {intent,actor:intent.actor,contact:{...c.contact},aimPoint:execution.intended.aimPoint,legs,positions,title:`${intent.actor==='partner'?'Finn':intent.actor==='you'?'You':'Opponent'} · ${SHOT_FAMILIES[intent.type].name}`,description:reason,cue:reason,feedback:{skill:execution.skill,quality:execution.quality,difficulty:execution.difficulty,deviation:execution.endpointError,mishit:execution.mishit},resolution:{receiver,bounced,result,movementZ:receiver?(positions[receiver].z-players.find(p=>p.id===receiver)!.position.z)/duration:0}};
 }
}
