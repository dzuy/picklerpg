import type {AthletePose} from './athlete-motion';
import type {PlayerId} from './engine/model';
export const BODY_HIT_REACTION_SECONDS=1.9;
export interface ReplayBodyHit {player:PlayerId;height:number;age:number}
export function bodyHitPose(pose:AthletePose,age:number,headshot:boolean,reduced=false){
 if(age<0||age>=BODY_HIT_REACTION_SECONDS)return;
 const fade=Math.min(1,(BODY_HIT_REACTION_SECONDS-age)/.55);
 const flail=reduced?0:Math.sin(age*11)*fade;
 pose.celebrate=false;pose.reaction=null;pose.stride=0;pose.torso=0;
 pose.armX=(-1.8+flail*.85)*fade;pose.armY=flail*.3;pose.armZ=(.65+flail*.65)*fade;
 pose.elbow=(-.5-flail*.6)*fade;pose.wrist=flail*.6;
 pose.offArm=(-2.2-flail*.8)*fade;pose.crouch=(headshot?.12:.2)*fade;
 pose.lean=reduced?0:Math.sin(age*8)*.08*fade;
}
/** A short visual reaction, with no effect on the collision or point result. */
export class BodyHitReaction {
 private started=-Infinity;
 private player:PlayerId|null=null;
 private headshot=false;
 private bubble:HTMLDivElement;
 constructor(host:HTMLElement){
  this.bubble=document.createElement('div');this.bubble.className='body-hit-bubble';this.bubble.hidden=true;this.bubble.setAttribute('role','status');host.append(this.bubble);
 }
 get active(){return this.player!==null}
 start(player:PlayerId,height:number,time:number){
  if(this.player===player&&time-this.started<BODY_HIT_REACTION_SECONDS)return;
  this.player=player;this.started=time;this.headshot=height>=1.3;
  this.bubble.textContent=this.headshot?'🤬':'!@#$';
  this.bubble.setAttribute('aria-label',this.headshot?'Ouch! Hit in the head!':'Ouch! Hit by the ball!');
 }
 update(time:number){if(time-this.started>=BODY_HIT_REACTION_SECONDS)this.clear()}
 seek(hit:ReplayBodyHit|null,time:number){
  this.clear();
  if(hit&&hit.age>=0&&hit.age<BODY_HIT_REACTION_SECONDS){this.start(hit.player,hit.height,time-hit.age)}
 }
 clear(){this.player=null;this.bubble.hidden=true}
 pose(id:PlayerId,pose:AthletePose,time:number,reduced:boolean){if(id===this.player)bodyHitPose(pose,time-this.started,this.headshot,reduced)}
 speech(id:PlayerId,point:{x:number;y:number;visible:boolean}){
  if(id!==this.player)return;
  this.bubble.hidden=!point.visible;this.bubble.style.left=`${point.x}px`;this.bubble.style.top=`${point.y-24}px`;
 }
}
