import {ActionBurst} from './action-burst';
import {BodyHitAngel} from './body-hit-angel';
import type {Group} from 'three';
import type {AthletePose} from './athlete-motion';
import type {PlayerId} from './engine/model';
import {BODY_HIT_REACTION_SECONDS,type ReplayBodyHit} from './body-hit-timing';
export {BODY_HIT_REACTION_SECONDS,type ReplayBodyHit} from './body-hit-timing';
export function bodyHitPose(pose:AthletePose,age:number,_headshot:boolean,reduced=false){
 if(age<0||age>=BODY_HIT_REACTION_SECONDS)return;
 const t=Math.max(0,Math.min(1,age/.32)),open=reduced?1:t*t*(3-2*t);
 const energy=reduced?0:Math.max(0,1-age/1.18);
 const flail=Math.sin(age*18)*energy,other=Math.sin(age*16+.7)*energy;
 const settle=reduced?1:Math.max(0,Math.min(1,(age-.72)/.5));
 pose.celebrate=false;pose.reaction=null;pose.stride=0;pose.torso=0;
 pose.armX=-.15-open*.8*(1-settle)+flail*.55;pose.armY=flail*.2;
 pose.armZ=.12+open*1.15*(1-settle)-flail*.3;
 pose.elbow=-.2-Math.abs(flail)*.6;pose.wrist=flail*.3;
 pose.offArm=-.15-open*.9*(1-settle)-other*.55;
 pose.offArmZ=-.12-open*1.15*(1-settle)-other*.3;pose.offElbow=-.2-Math.abs(other)*.5;pose.offWrist=other*.3;
 pose.crouch=0;pose.lean=0;
}
/** Presentation only: the point and collision result remain unchanged. */
export class BodyHitReaction {
 private angel=new BodyHitAngel();
 private started=-Infinity;
 private player:PlayerId|null=null;
 private burst:ActionBurst;
 constructor(host:HTMLElement){this.burst=new ActionBurst(host)}
 get active(){return this.player!==null}
 start(player:PlayerId,_height:number,time:number){
  if(this.player===player&&time-this.started<BODY_HIT_REACTION_SECONDS)return;
  this.clear();this.player=player;this.started=time;
 }
 update(time:number){if(time-this.started>=BODY_HIT_REACTION_SECONDS)this.clear()}
 seek(hit:ReplayBodyHit|null,time:number){
  if(!hit||hit.age<0||hit.age>=BODY_HIT_REACTION_SECONDS){this.clear();return;}
  if(hit.player!==this.player)this.clear();
  this.player=hit.player;this.started=time-hit.age;
 }
 clear(){this.burst.clear();this.angel.clear();this.player=null}
 pose(id:PlayerId,pose:AthletePose,time:number,reduced:boolean){if(id===this.player)bodyHitPose(pose,time-this.started,false,reduced)}
 visual(id:PlayerId,mesh:Group,time:number,reduced:boolean,point:{x:number;y:number;visible:boolean}){if(id===this.player){const age=time-this.started;this.angel.apply(mesh,age,reduced);this.burst.render({text:"BAGGED!",age,...point,reduced});}}
}
