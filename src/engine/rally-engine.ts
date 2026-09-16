import {parseShotIntent,sameShotIntent} from './shot-intent';
import {sampleFlight,sampleFlightVelocity} from './trajectory';
import {COURT, SKILLS, type Contact, type GameState, type PlayerId, type RallyProvider, type RallyShot, type RallyStage, type ShotIntent, type Vec3, type FlightLeg} from './model';

const PLAYER_IDS:PlayerId[]=['you','partner','opponent-left','opponent-right'];
const near=(a:Vec3,b:Vec3)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-7;
const finitePoint=(p:Vec3)=>p&&[p.x,p.y,p.z].every(Number.isFinite);

export function sampleLeg(leg:FlightLeg,t:number):Vec3 {
 return sampleFlight(leg,t);
}

/** Analytic derivative of the authored path, in metres per simulation second.
 * Playback speed and decision pauses do not change the incoming tactical velocity. */
export function sampleVelocity(leg:FlightLeg,t:number):Vec3 {
 return sampleFlightVelocity(leg,t);
}

/** Pause three quarters of the way to the earliest available receiving contact. */
export function receptionPauseTime(shot:RallyShot){
 const duration=(legs:FlightLeg[])=>legs.reduce((sum,leg)=>sum+leg.duration,0);
 return .75*Math.min(duration(shot.legs),...Object.values(shot.receptionChoice??{}).map(branch=>duration(branch.legs)));
}
export function flightCursor(legs:FlightLeg[],time:number){
 let legIndex=0,elapsed=time;
 while(legIndex<legs.length-1&&elapsed>=legs[legIndex].duration-1e-9){elapsed=Math.max(0,elapsed-legs[legIndex].duration);legIndex++;}
 return {legIndex,elapsed};
}

/** Opening stages depend on completed contacts; later stages depend on tactical state. */
export function classifyStage(completedShots:number,intent:ShotIntent,players:GameState['players']):RallyStage {
 if(completedShots<4)return (['serve','return','third','fourth'] as const)[completedShots];
 if(intent.type==='counter')return 'counter';
 if(intent.type==='reset')return 'reset';
 if(intent.type==='drive'||intent.type==='overhead'||intent.type==='volley')return 'attack';
 if(players.every(player=>Math.abs(player.position.z)<=COURT.kitchen+1))return 'kitchen-exchange';
 return 'transition';
}

/** Internal execution copy. Never write this playback structure to storage. */
export interface RallyRuntime {
 state:GameState; options:RallyShot[]; shot:RallyShot;
 movementStart:Record<PlayerId,Vec3>; shotElapsed:number; receptionPrompt:boolean;
}

/** Owns time, control flow, contact validation, and point lifecycle. No scenario imports. */
export class RallyEngine {
 state!:GameState;
 private options:RallyShot[]=[];
 private activeShot!:RallyShot;
 private movementStart!:Record<PlayerId,Vec3>;
 private shotElapsed=0;
 private receptionPrompt=false;
 constructor(private readonly provider:RallyProvider, runtime?:RallyRuntime){if(runtime)this.restoreRuntime(runtime);else this.reset()}

 reset(){
  const setup=structuredClone(this.provider.setup());
  if(setup.players.length!==4||new Set(setup.players.map(p=>p.id)).size!==4||setup.players.some(p=>!PLAYER_IDS.includes(p.id)||!finitePoint(p.position)||!['home','away'].includes(p.team)||!['left','right'].includes(p.handedness)||!Number.isFinite(p.facing)||SKILLS.some(skill=>!Number.isFinite(p.skills?.[skill])||p.skills[skill]<0||p.skills[skill]>100)||['aggression','middlePreference','kitchenApproach'].some(key=>{const value=p.tendencies?.[key as keyof typeof p.tendencies];return typeof value!=='number'||!Number.isFinite(value)||value<0||value>1})))throw new Error('A rally requires four distinct valid players.');
  const options=this.validateContact(setup.contact,undefined,setup.players);
  const first=options[0];
  this.state={schemaVersion:2,simulationTime:0,rallyHistory:[{type:'rally-start',time:0}],phase:'decision',stage:'serve',shotIndex:0,legIndex:0,elapsed:0,ball:{position:{...first.contact},velocity:{x:0,y:0,z:0}},players:setup.players,shotHistory:[],bounces:0,score:{home:0,away:0},paused:false,currentHitter:first.actor,possession:setup.players.find(p=>p.id===first.actor)!.team,result:null};
  this.shotElapsed=0;
  this.receptionPrompt=false;
  this.acceptContact(options);
 }
 /** In-memory copies let presentation consume an already committed boundary. */
 runtime():RallyRuntime{return structuredClone({state:this.state,options:this.options,shot:this.activeShot,movementStart:this.movementStart??Object.fromEntries(this.state.players.map(p=>[p.id,p.position])),shotElapsed:this.shotElapsed,receptionPrompt:this.receptionPrompt})}
 restoreRuntime(runtime:RallyRuntime){const r=structuredClone(runtime);this.state=r.state;this.options=r.options;this.activeShot=r.shot;this.movementStart=r.movementStart;this.shotElapsed=r.shotElapsed;this.receptionPrompt=r.receptionPrompt}
 private committedBoundary:RallyRuntime|null=null;
 playToCommittedBoundary(runtime:RallyRuntime){this.committedBoundary=structuredClone(runtime)}
 private acceptCommittedBoundary(){if(!this.committedBoundary)return false;const end=this.committedBoundary;this.committedBoundary=null;this.restoreRuntime(end);return true}
 /** Advance through authored leg endpoints, never through a browser clock or CPU policy. */
 advanceToBoundary(){
  if(this.state.phase!=='flight'||this.receptionPrompt)return;
  this.state.paused=false;
  for(let steps=0;steps<1000;steps++){
   if(this.state.phase!=='flight'||this.receptionPrompt)return;
   const leg=this.shot.legs[this.state.legIndex];
   this.update(Math.max(1e-8,leg.duration-this.state.elapsed));
  }
  throw new Error('Flight did not reach a logical boundary.');
 }
 /** Detached, JSON-serializable state for adapters and future tactical snapshots. */
 snapshot():GameState{return structuredClone(this.state)}
 get shot():RallyShot{return this.activeShot}
 get needsReceptionChoice(){return this.receptionPrompt}
 get availableIntents():ShotIntent[]{return this.state.phase==='decision'?this.options.map(shot=>structuredClone(shot.intent)):[]}
 previewIntent(value:unknown):RallyShot|null{if(this.state.phase!=='decision')return null;const intent=parseShotIntent(value);const shot=this.options.find(option=>sameShotIntent(intent,option.intent));return shot?structuredClone(shot):null}

 /** Menu, text, voice and automatic contacts enter through the same validator. */
 submitIntent(value:unknown){
  if(this.state.phase!=='decision')throw new Error('Wait for a decision window.');
  const v=parseShotIntent(value);
  const shot=this.options.find(({intent})=>sameShotIntent(v,intent));
  if(!shot)throw new Error('Choose an available shot intent for this contact.');
  this.activeShot=structuredClone(shot);
  this.receptionPrompt=false;
  this.state.stage=classifyStage(this.state.shotHistory.length,shot.intent,this.state.players);
  this.state.shotHistory.push({...structuredClone(shot.intent),source:v.source});
  this.state.rallyHistory.push({type:'shot',time:this.state.simulationTime,shotIndex:this.state.shotIndex,intent:structuredClone(this.state.shotHistory.at(-1)!),contact:{...shot.contact}});
  this.state.ball.velocity=sampleVelocity(shot.legs[0],0);
  this.state.phase='flight';this.state.elapsed=0;this.state.legIndex=0;this.shotElapsed=0;
  this.movementStart=Object.fromEntries(this.state.players.map(p=>[p.id,{...p.position}])) as Record<PlayerId,Vec3>;
 }

 /** Continue an incoming pop-up to an airborne interception or its first bounce. */
 chooseReception(kind:'airborne'|'bounced'){
  if(this.state.phase!=='flight'||!this.state.paused||!this.receptionPrompt||!this.shot.receptionChoice)throw new Error('Wait for a reception choice.');
  const selected=this.shot.receptionChoice[kind];if(!selected)throw new Error(kind==='airborne'?'This ball cannot be reached before its bounce.':'This ball must be taken out of the air.');
  const branch=structuredClone(selected);
  if(this.shotElapsed>=branch.legs.reduce((sum,leg)=>sum+leg.duration,0))throw new Error('The reception choice is no longer available.');
  Object.assign(this.state,flightCursor(branch.legs,this.shotElapsed));
  this.activeShot.legs=branch.legs;this.activeShot.positions=branch.positions;this.activeShot.resolution=branch.resolution;delete this.activeShot.receptionChoice;
  this.receptionPrompt=false;this.state.paused=false;
 }

 /** Adds a locally planned, validated custom option only at the current contact. */
 offerCustom(shot:RallyShot){if(this.state.phase!=='decision')throw new Error('Wait for your contact.');const options=this.validateContact({options:[shot]},this.state.ball.position);if(shot.actor!==this.state.currentHitter)throw new Error('Wrong hitter.');this.options.push(options[0])}
 private validateContact(contact:Contact,expectedBall?:Vec3,players:GameState['players']=this.state.players):RallyShot[]{
  if(!contact||!Array.isArray(contact.options)||!contact.options.length)throw new Error('A contact must offer at least one shot.');
  const options=structuredClone(contact.options),first=options[0];
  for(const shot of options){
   shot.intent=parseShotIntent(shot.intent);
   if(shot.intent.target.kind==='player'){
    const targetId=shot.intent.target.playerId;
    if(players.find(p=>p.id===targetId)?.team===players.find(p=>p.id===shot.actor)?.team)throw new Error('Shot target must be an opponent.');
   }
   if(!PLAYER_IDS.includes(shot.actor)||shot.intent?.actor!==shot.actor||!finitePoint(shot.contact)||shot.actor!==first.actor||!near(shot.contact,first.contact)||!finitePoint(shot.aimPoint)||!Number.isFinite(shot.intent.intendedNetClearance))throw new Error('Invalid contact actor or intent.');
   if(expectedBall&&!near(shot.contact,expectedBall))throw new Error('Next contact must continue from the ball endpoint.');
   if(!shot.legs?.length||!near(shot.legs[0].from,shot.contact))throw new Error('Flight must begin at contact.');
   for(let i=0;i<shot.legs.length;i++){
    const leg=shot.legs[i];
    if(!finitePoint(leg.from)||!finitePoint(leg.to)||!Number.isFinite(leg.duration)||leg.duration<=0||!Number.isFinite(leg.arc)||!Number.isFinite(leg.sideCurve??0)||!Number.isFinite(leg.verticalSpin??0)||(i>0&&!near(shot.legs[i-1].to,leg.from)))throw new Error('Invalid or disconnected flight legs.');
   }
   if(PLAYER_IDS.some(id=>!finitePoint(shot.positions?.[id])))throw new Error('Missing player movement target.');
  }
  return options;
 }
 private acceptContact(options:RallyShot[]){
  this.options=options;this.activeShot=options[0];
  this.state.shotIndex=this.state.shotHistory.length;
  this.state.currentHitter=this.shot.actor;
  this.state.possession=this.state.players.find(p=>p.id===this.shot.actor)!.team;
  this.state.stage=classifyStage(this.state.shotHistory.length,this.shot.intent,this.state.players);
  this.state.legIndex=0;this.state.elapsed=0;this.state.phase='decision';
  this.state.rallyHistory.push({type:'contact',time:this.state.simulationTime,shotIndex:this.state.shotIndex,hitter:this.shot.actor,position:{...this.state.ball.position},incomingVelocity:{...this.state.ball.velocity}});
  // Only the user's own contacts pause. Partner/opponent policy is replaceable later.
  if(this.provider.shouldAutoPlay?this.provider.shouldAutoPlay(this.shot,this.snapshot()):this.state.currentHitter!=='you')this.submitIntent({...this.shot.intent,source:this.shot.intent.source==='ai'?'ai':'script'});
 }
 private finishFlight(){
  if(this.acceptCommittedBoundary())return;
  const outcome=structuredClone(this.provider.next(this.snapshot(),structuredClone(this.shot)));
  if(outcome.kind==='point-end'){
   if(!outcome.result||!['home','away'].includes(outcome.result.winner)||!['missed-swing','winner','net','out','double-bounce','failed-return','unreturned-attack','body-hit'].includes(outcome.result.reason))throw new Error('Invalid point result.');
   this.state.result=outcome.result;this.state.phase='complete';this.state.stage='point-end';this.state.paused=false;
   // Demonstration point tally only. Doubles side-out scoring is backlog item 13.
   this.state.score[outcome.result.winner]++;this.options=[];
   this.state.currentHitter=null;this.state.possession=null;this.state.ball.velocity={x:0,y:0,z:0};
   this.state.rallyHistory.push({type:'point-end',time:this.state.simulationTime,result:structuredClone(outcome.result)});return;
  }
  if(outcome.kind!=='contact')throw new Error('Expected next contact or explicit point result.');
  const options=this.validateContact(outcome.contact,this.state.ball.position);
  const receiver=this.state.players.find(p=>p.id===options[0].actor)!;
  if(receiver.team===this.state.possession)throw new Error('A rally contact must alternate teams.');
  this.acceptContact(options);
 }
 update(dt:number){
  if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid time step');
  if(this.state.phase!=='flight'||this.state.paused)return;
  let remaining=dt;
  while(remaining>0&&this.state.phase==='flight'){
   const leg=this.shot.legs[this.state.legIndex];
   let step=Math.min(remaining,leg.duration-this.state.elapsed),pauseForReception=false;
   if(this.shot.receptionChoice&&!this.receptionPrompt){
    const pauseTime=receptionPauseTime(this.shot);
    if(pauseTime>=this.shotElapsed-1e-9&&pauseTime<=this.shotElapsed+step+1e-9){step=Math.max(0,pauseTime-this.shotElapsed);pauseForReception=true}
   }
   remaining-=step;this.state.elapsed+=step;this.shotElapsed+=step;this.state.simulationTime+=step;
   this.state.ball.position=sampleLeg(leg,this.state.elapsed/leg.duration);
   this.state.ball.velocity=sampleVelocity(leg,this.state.elapsed/leg.duration);
   const total=this.shot.legs.reduce((sum,l)=>sum+l.duration,0);
   const alpha=Math.min(1,this.shotElapsed/total),smooth=alpha*alpha*(3-2*alpha);
   for(const player of this.state.players){const from=this.movementStart[player.id],to=this.shot.positions[player.id];player.position={x:from.x+(to.x-from.x)*smooth,y:0,z:from.z+(to.z-from.z)*smooth}}
   if(pauseForReception&&this.acceptCommittedBoundary())return;
   if(pauseForReception){
    // A pause exactly at a bounce owns that boundary before either branch resumes.
    if(this.state.elapsed>=leg.duration-1e-9&&this.state.legIndex<this.shot.legs.length-1){
     if(leg.bounceAtEnd){this.state.bounces++;this.state.rallyHistory.push({type:'bounce',time:this.state.simulationTime,shotIndex:this.state.shotIndex,position:{...leg.to}})}
     this.state.legIndex++;this.state.elapsed=0;
    }
    this.state.paused=true;this.receptionPrompt=true;return;
   }
   if(this.state.elapsed>=leg.duration-1e-9){
    this.state.ball.position={...leg.to};
    if(leg.bounceAtEnd){this.state.bounces++;this.state.rallyHistory.push({type:'bounce',time:this.state.simulationTime,shotIndex:this.state.shotIndex,position:{...leg.to}})}
    if(this.state.legIndex===this.shot.legs.length-1){
     this.finishFlight();
     // Never spend leftover frame time past a human decision window.
     if(this.state.phase!=='flight')return;
    }else{this.state.legIndex++;this.state.elapsed=0;this.state.ball.velocity=sampleVelocity(this.shot.legs[this.state.legIndex],0)}
   }
  }
 }
}
