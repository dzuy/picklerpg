import {buildDecisionMenu,type DecisionOption} from './engine/decision-menu';
import {parseShotIntent,sameShotIntent} from './engine/shot-intent';
import {chooseOpponentShot,type OpponentDecision} from './engine/opponent-policy';
import {executeShot,type ShotExecution} from './engine/execution';
import {generateTrajectory,type GeneratedTrajectory} from './engine/trajectory';
import {Simulation} from './simulation';
import {sampleLeg,sampleVelocity} from './engine/rally-engine';
import {contactIssue,SHOT_FAMILIES,type ShotContext} from './engine/shot-families';
import type {GameState,RallyShot,ShotType,Vec3,ShotTarget,ShotIntent,SpinIntent} from './engine/model';
export const LAB_TYPES:ShotType[]=['serve','drive','drop','dink','volley','reset','lob','overhead','counter','return','block','flick'];
export type LabCondition='typical'|'low'|'kitchen';
export function labSetup(type:ShotType,condition:LabCondition='typical'):{context:ShotContext;landing:Vec3}{
 const family=SHOT_FAMILIES[type];const near=['dink','volley','counter','block','flick'].includes(type);
 const z=type==='serve'?7:near?2.7:type==='overhead'?3.5:5.4;
 const height=type==='overhead'?2.35:type==='reset'||type==='dink'?.4:type==='volley'||type==='counter'||type==='block'?1.15:.75;
 const context:ShotContext={contact:{x:1.1,y:height,z},feet:{x:.7,y:0,z:z+.35},bounced:family.mode!=='volley',opening:type==='serve'?'serve':type==='return'?'return':'rally',twoBounceSatisfied:type!=='serve'&&type!=='return',incomingSpeed:12};
 if(condition==='low')context.contact.y=.12;
 if(condition==='kitchen'){context.feet.z=1.8;context.contact.z=1.5;context.bounced=false}
 return {context,landing:{x:-1.2,y:.037,z:['drop','dink','reset','block'].includes(type)?-1.25:-5.5}};
}
/** Isolated shot preview: no rally outcome, score award or opponent policy. */
export class ShotLab {
 decisionSituation='off';decisionChoice:ShotType|null=null;decisionOptions:DecisionOption[]=[];
 opponentSituation='off';opponentAggression=.7;opponentDecision:OpponentDecision|null=null;
 difficultyPreset='comfortable';comparison:{skill:number;quality:number;dispersion:number}[]=[];
 variance=false;seed=1;skill=70;balance=1;incomingSpeed=12;execution:ShotExecution|null=null;
 pace:ShotIntent['pace']|'default'='default';shape:ShotIntent['shape']|'default'='default';spinSide:SpinIntent['side']='none';verticalSpin:SpinIntent['vertical']='none';spinStrength:SpinIntent['strength']='medium';clearance=.12;tactic:ShotIntent['tacticalIntent']='sustain';aggression=.5;generated:GeneratedTrajectory|null=null;target:ShotTarget|null=null;opponentLayout:'balanced'|'left'|'right'='balanced';opponentHand:'right'|'left'='right';type:ShotType='drive';condition:LabCondition='typical';state!:GameState;shot!:RallyShot;issue:string|null=null;private elapsed=0;
 constructor(){this.reset()}
 reset(){
  const contextual=this.decisionSituation!=='off';const ai=!contextual&&this.opponentSituation!=='off';
  const prepared:ShotType=this.opponentSituation==='high'?'overhead':this.opponentSituation==='low'?'reset':this.opponentSituation==='return'?'return':this.opponentSituation==='deep'?'drive':this.opponentSituation==='dink'?'dink':'counter';
  const {context,landing:defaultLanding}=labSetup(contextual?this.decisionSituation as ShotType:ai?prepared:this.type,contextual||ai?'typical':this.condition);let landing=defaultLanding;context.incomingSpeed=this.incomingSpeed;this.issue=contactIssue(this.type,context);
  this.state=new Simulation().snapshot();this.state.rallyHistory=[];this.state.ball.position={...context.contact};this.state.stage=this.type==='serve'?'serve':'transition';
  this.state.players[0].position={...context.feet};this.state.players[1].position.z=2.8;
  this.state.players[2].position={x:-1.4,y:0,z:-2.7};this.state.players[3].position={x:1.4,y:0,z:-2.7};
  if(this.opponentLayout!=='balanced'){const shift=this.opponentLayout==='left'?-1:1;this.state.players[2].position.x=shift*1.1;this.state.players[3].position.x=shift*2.4}
  const target:ShotTarget=this.target??{kind:'zone',zone:'crosscourt',depth:Math.abs(defaultLanding.z)<2?'kitchen':'deep'};
  if(target.kind==='player')this.state.players.find(p=>p.id===target.playerId)!.handedness=this.opponentHand;
  let family=SHOT_FAMILIES[this.type];
  let intent:ShotIntent={schemaVersion:1,actor:'you',type:this.type,target,pace:this.pace==='default'?(family.speed>=10?'fast':'soft'):this.pace,shape:this.shape==='default'?(this.type==='overhead'?'descending':family.lift>=1?'arc':'flat'):this.shape,intendedNetClearance:this.clearance,tacticalIntent:this.tactic,aggression:this.aggression,source:'menu',...(this.spinSide!=='none'||this.verticalSpin!=='none'?{spin:{side:this.spinSide,vertical:this.verticalSpin,strength:this.spinStrength}}:{})};
  this.decisionOptions=[];
  if(contextual){
   this.decisionOptions=buildDecisionMenu('you',context,this.state.players);
   const selected=this.decisionOptions.find(o=>o.intent.type===this.decisionChoice)??this.decisionOptions[0];
   this.issue=selected?null:'No legal shot from this contact.';
   if(selected){intent=selected.intent;family=SHOT_FAMILIES[intent.type];this.decisionChoice=intent.type}
  }
  this.opponentDecision=null;
  if(ai){
   for(const point of [context.contact,context.feet]){point.x=-point.x;point.z=-point.z}
   const opponent=this.state.players[2];opponent.position={...context.feet};opponent.tendencies.aggression=this.opponentAggression;
   for(const key of Object.keys(opponent.skills) as (keyof typeof opponent.skills)[])opponent.skills[key]=this.skill;
   this.opponentDecision=chooseOpponentShot(opponent.id,context,this.state.players);
   this.issue=this.opponentDecision?null:'No legal response from this contact.';
   if(this.opponentDecision){intent=this.opponentDecision.intent;family=SHOT_FAMILIES[intent.type]}
   this.state.ball.position={...context.contact};this.state.currentHitter=opponent.id;this.state.possession=opponent.team;
  }
  if(this.difficultyPreset==='stretched')context.feet.x=context.contact.x-1.4;
  if(this.difficultyPreset==='backhand'){context.contact.y=.35;context.feet.x=context.contact.x+.5}
  if(this.difficultyPreset==='backward')context.movementZ=intent.actor==='opponent-left'?-2:2;
  if(this.difficultyPreset==='feet'){context.contact.y=.3;context.contact.z=intent.actor==='opponent-left'?-4:4;context.feet.z=context.contact.z+.3}
  this.state.players.find(p=>p.id===intent.actor)!.position={...context.feet};this.state.ball.position={...context.contact};
  this.generated=null;this.execution=null;this.comparison=[];
  for(const key of Object.keys(this.state.players[0].skills) as (keyof typeof this.state.players[0]['skills'])[])this.state.players[0].skills[key]=this.skill;
  try{this.generated=generateTrajectory(intent,context,this.state.players);landing=this.generated.aimPoint;if(this.variance)this.execution=executeShot(intent,context,this.state.players,{seed:this.seed,balance:this.balance})}catch(error){this.issue??=(error as Error).message}
  if(this.generated&&!this.issue){this.comparison=[62,92].map(skill=>{const players=structuredClone(this.state.players);const p=players.find(p=>p.id===intent.actor)!;for(const k of Object.keys(p.skills) as (keyof typeof p.skills)[])p.skills[k]=skill;const e=executeShot(intent,context,players,{seed:this.seed,balance:this.balance});return {skill,quality:e.quality,dispersion:e.dispersion}})}
  const leg=this.execution?.leg??this.generated?.leg??{from:{...context.contact},to:{...context.contact},duration:1,arc:0};
  this.shot={actor:intent.actor,contact:{...context.contact},aimPoint:landing,title:family.name,description:family.description,cue:'',positions:Object.fromEntries(this.state.players.map(p=>[p.id,p.position])) as RallyShot['positions'],legs:[leg],intent};
  this.elapsed=0;
 }
 chooseIntent(value:unknown){
  const intent=parseShotIntent(value);
  if(this.state.phase!=='decision'||!this.decisionOptions.some(o=>sameShotIntent(o.intent,intent)))throw new Error('Choose an available shot at this contact.');
  this.decisionChoice=intent.type;this.reset();
 }
 select(type:ShotType,condition:LabCondition){this.type=type;this.condition=condition;this.reset()}
 play(){if(this.issue)throw new Error(this.issue);this.reset();this.state.phase='flight';this.state.ball.velocity=sampleVelocity(this.shot.legs[0],0)}
 update(dt:number){if(this.state.phase!=='flight'||this.state.paused)return;this.elapsed=Math.min(this.shot.legs[0].duration,this.elapsed+dt);this.state.elapsed=this.elapsed;this.state.simulationTime=this.elapsed;this.state.ball.velocity=sampleVelocity(this.shot.legs[0],this.elapsed/this.shot.legs[0].duration);this.state.ball.position=sampleLeg(this.shot.legs[0],this.elapsed/this.shot.legs[0].duration);if(this.elapsed>=this.shot.legs[0].duration){this.state.phase='complete';this.state.bounces=this.shot.legs[0].bounceAtEnd?1:0;this.state.currentHitter=null;this.state.possession=null;this.state.ball.velocity={x:0,y:0,z:0}}}
}
