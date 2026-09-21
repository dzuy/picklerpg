import * as THREE from 'three';
import {AtpCelebration} from './atp-celebration';
import type {PlayerState,Team} from './engine/model';
import type {AthletePose} from './athlete-motion';
export const MATCH_CELEBRATION_SECONDS=9;
export function matchCelebrationCopy(score:Record<Team,number>,viewer:Team,opponent:string){
 const other=viewer==='home'?'away':'home';
 return score[viewer]===0?'You got pickled!':score[other]===0?`You pickled ${opponent}!`:'Good game!';
}
/** Assign center spots by current court position, never by roster slot. */
export function celebrationSpot(player:PlayerState,players:readonly PlayerState[]){
 const teammates=players.filter(p=>p.team===player.team).sort((a,b)=>a.position.x-b.position.x||a.id.localeCompare(b.id));
 return {x:teammates[0]?.id===player.id?-.65:.65,z:player.team==='home'?.65:-.65};
}
/** Render-only choreography; the saved match and replay positions stay untouched. */
export class MatchCelebration {
 private seen=new Set<string>();
 private key='';
 private age=0;
 private previous:number|null=null;
 private fireworks:AtpCelebration;
 private burst=false;
 private holding=false;
 private winner:Team='home';
 private title:HTMLDivElement;
 private bubbles:HTMLDivElement[]=[];
 active=false;
 constructor(scene:THREE.Scene,host:HTMLElement){
  this.fireworks=new AtpCelebration(scene,host,'match-fireworks');
  this.title=document.createElement('div');this.title.className='match-celebration';this.title.hidden=true;this.title.setAttribute('role','status');host.append(this.title);
  for(const text of ['Good game!','GG!','Well played!','What a game!']){const bubble=document.createElement('div');bubble.className='match-good-game';bubble.textContent=text;bubble.hidden=true;host.append(bubble);this.bubbles.push(bubble)}
 }
 ready(key:string,score:Record<Team,number>,viewer:Team,opponent:string){
  if(this.seen.has(key))return true;
  if(this.key!==key){this.cancel();this.key=key;this.active=true;this.age=0;this.previous=null;this.burst=false;this.winner=score.home>score.away?'home':'away';this.title.textContent=matchCelebrationCopy(score,viewer,opponent)}
  return false;
 }
 cancel(){this.holding=false;this.active=false;this.key='';this.title.hidden=true;this.bubbles.forEach(b=>b.hidden=true);this.fireworks.stop()}
 update(time:number){
  if(!this.active)return;
  if(this.previous!==null&&!document.hidden)this.age+=Math.min(.1,Math.max(0,time-this.previous));this.previous=time;
  if(this.age>=MATCH_CELEBRATION_SECONDS){this.seen.add(this.key);this.cancel();this.holding=true;return}
  if(this.age>=3.4&&!this.burst){this.burst=true;this.fireworks.start(this.winner,time,{eyebrow:'THAT’S A WRAP',title:'GOOD GAME!',detail:'Four paddles. One great game.'})}
  this.fireworks.update(time);
  this.title.hidden=this.age<6.3;
 }
 pose(player:PlayerState,players:readonly PlayerState[],mesh:THREE.Group,pose:AthletePose,reduced:boolean){
  if(!this.active&&!this.holding)return;
  const t=reduced?1:Math.min(1,Math.max(0,(this.age-.4)/2.7)),ease=t*t*(3-2*t);
  const {x,z}=celebrationSpot(player,players);
  // The same easing preserves teammates’ left-to-right order for the whole approach.
  mesh.position.x=THREE.MathUtils.lerp(player.position.x,x,ease);mesh.position.z=THREE.MathUtils.lerp(player.position.z,z,ease);
  const facing=player.team==='home'?0:Math.PI;
  mesh.rotation.y=player.facing+Math.atan2(Math.sin(facing-player.facing),Math.cos(facing-player.facing))*ease;
  pose.celebrate=false;pose.offArm=-.2;pose.armX=t<1?-.25:-1.45;pose.armY=0;pose.armZ=0;pose.elbow=0;pose.wrist=0;pose.crouch=0;
  pose.stride=!reduced&&t<1?Math.sin(this.age*11)*.3:0;
  if(t===1&&!reduced){pose.armX-=Math.sin(Math.max(0,this.age-3.1)*5)*.12;if(this.age>4.4&&player.team===this.winner)mesh.position.y+=Math.abs(Math.sin((this.age-4.4)*5))*.16}
 }
 speech(index:number,point:{x:number;y:number;visible:boolean}){
  const bubble=this.bubbles[index];bubble.hidden=!this.active||this.age<3.1+index*.3||this.age>6.3||!point.visible;
  bubble.style.left=`${point.x+(index%2?40:-40)}px`;bubble.style.top=`${point.y+(index<2?20:-28)}px`;
 }
}
