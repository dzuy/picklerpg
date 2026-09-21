import {COURT,type Vec3,type PlayerJump} from './model';
import type {ShotContext} from './shot-families';

// Tuning distances in metres: both ball and receiver must already hug one sideline.
export const ERNE_BALL_SIDELINE_DISTANCE=.55;
export const ERNE_PLAYER_SIDELINE_DISTANCE=.65;
// Allow room for the animated stance and shoes, not just the player origin.
export const ERNE_LANDING_CLEARANCE=.55;
export const ERNE_FOOT_CLEARANCE=.45;
const nearSideline=(x:number,distance:number)=>Math.abs(Math.abs(x)-COURT.width/2)<=distance;

/** A sideline volley after a legal run-around or corner jump. */
export function erneAvailable(c:ShotContext):boolean{
 return c.erneEligible!==false&&c.opening==='rally'&&c.twoBounceSatisfied&&!c.bounced
  &&c.contact.y>=.9&&c.contact.y<=1.9
  &&Math.abs(c.contact.z)>=.35&&Math.abs(c.contact.z)<COURT.kitchen
  &&nearSideline(c.contact.x,ERNE_BALL_SIDELINE_DISTANCE)
  &&Math.abs(c.feet.x)>=COURT.width/2+ERNE_FOOT_CLEARANCE
  &&c.contact.x*c.feet.x>0&&c.contact.z*c.feet.z>0
  &&Math.hypot(c.contact.x-c.feet.x,c.contact.z-c.feet.z)<=1.2;
}

/** Both endpoints are on one side of the net. Check where a straight run crosses
 * the kitchen's baseline; the player's feet must already be outside its sideline. */
export function kitchenSafeRoute(from:Vec3,to:Vec3):boolean{
 const edge=COURT.width/2+ERNE_FOOT_CLEARANCE,depth=COURT.kitchen+.3;
 if(from.z*to.z<=0)return false;
 const outside=(p:Vec3)=>Math.abs(p.x)>=edge||Math.abs(p.z)>=depth;
 if(!outside(from)||!outside(to))return false;
 if(Math.abs(from.z)>=depth&&Math.abs(to.z)>=depth)return true;
 if(Math.abs(from.x)>=edge&&Math.abs(to.x)>=edge&&from.x*to.x>0)return true;
 const t=(Math.sign(from.z)*depth-from.z)/(to.z-from.z);
 return t>=0&&t<=1&&Math.abs(from.x+(to.x-from.x)*t)>=edge;
}

export function erneReceptionFeet(contact:Vec3,from:Vec3):Vec3|undefined{
 if(!nearSideline(contact.x,ERNE_BALL_SIDELINE_DISTANCE)||!nearSideline(from.x,ERNE_PLAYER_SIDELINE_DISTANCE)||contact.x*from.x<=0||contact.z*from.z<=0)return;
 const feet={x:Math.sign(contact.x)*(COURT.width/2+ERNE_LANDING_CLEARANCE),y:0,z:contact.z+Math.sign(contact.z)*.15};
 const context:ShotContext={contact,feet,bounced:false,opening:'rally',twoBounceSatisfied:true,incomingSpeed:0};
 return erneAvailable(context)&&(kitchenSafeRoute(from,feet)||erneJumpReachable(from,feet))?feet:undefined;
}


/** Take off behind the kitchen line and land beyond its sideline on the same half. */
export function erneJumpReachable(from:Vec3,to:Vec3):boolean{
 return nearSideline(from.x,ERNE_PLAYER_SIDELINE_DISTANCE)&&from.z*to.z>0&&from.x*to.x>0
  &&Math.abs(from.z)>=COURT.kitchen+.3&&Math.abs(from.z)<=COURT.kitchen+1
  &&Math.abs(to.x)>=COURT.width/2+ERNE_FOOT_CLEARANCE
  &&Math.hypot(to.x-from.x,to.z-from.z)<=2.1;
}
export function samplePlayerJump(jump:PlayerJump,time:number):Vec3{
 const t=Math.max(0,Math.min(1,(time-jump.start)/jump.duration));
 return {x:jump.from.x+(jump.to.x-jump.from.x)*t,y:4*jump.height*t*(1-t),z:jump.from.z+(jump.to.z-jump.from.z)*t};
}
