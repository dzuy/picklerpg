import type {GameState,PlayerState,RallyShot} from './engine/model';
export type SwingStyle='ready'|'serve'|'forehand'|'backhand'|'soft'|'lob'|'overhead';
export type Reaction='Stretched'|'Jammed'|'Late'|'Pop-up'|'Overhead finish'|null;
export interface AthletePose {style:SwingStyle;reaction:Reaction;armX:number;armY:number;armZ:number;elbow:number;wrist:number;offArm:number;torso:number;lean:number;crouch:number;stride:number;celebrate:boolean;shoulderLift?:number}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t)};
/** Shot age is independent of flight-leg boundaries (a bounce must not replay a swing). */
export function shotAge(state:GameState,shot:RallyShot){
 return shot.legs.slice(0,state.legIndex).reduce((total,leg)=>total+leg.duration,0)+state.elapsed;
}
type SwingFrame=Pick<AthletePose,'armX'|'armY'|'armZ'|'elbow'|'wrist'|'offArm'|'torso'|'crouch'>;
const frame=(armX:number,armZ:number,elbow=0,torso=0,wrist=0,crouch=.035):SwingFrame=>({armX,armY:0,armZ,elbow,wrist,offArm:-.35,torso,crouch});
// Shoulder X lifts forward; Z sweeps across the body. Y twists along the arm,
// so using Y for a drive barely moves the paddle on the production skeleton.
const swings:Record<Exclude<SwingStyle,'ready'>,[SwingFrame,SwingFrame,SwingFrame]>={
 overhead:[frame(-.25,2.2,-.25,-.28,0,0),frame(-.9,2.1,0,.08,0,0),frame(-1.05,-.5,-.1,.4,-.35,.09)],
 forehand:[frame(-.65,1.05,-.35,-.4),frame(-1.4,.1,-.08,0),frame(-1.8,-1.15,-.3,.5)],
 backhand:[frame(-1.4,-1.05,-.55,.35),frame(-1.35,-.1,-.1,0),frame(-1.5,1.05,-.15,-.4)],
 lob:[frame(-.1,.2,-.1,-.12,0,.10),frame(-.95,.05,-.05,0,0,.07),frame(-2.15,-.12,-.15,.18,0,.01)],
 serve:[frame(.25,.3,-.1,-.2,0,.07),frame(-.9,.15,0,0),frame(-1.95,-.2,-.15,.3)],
 soft:[frame(-.55,.12,-.2,-.08,0,.08),frame(-.9,.05,-.12,0,0,.07),frame(-1.2,-.08,-.15,.1,0,.05)],
};
function applySwing(pose:AthletePose,style:Exclude<SwingStyle,'ready'>,age:number,flight:boolean){
 const [load,contact,finish]=swings[style];
 const duration=style==='overhead'?.24:style==='lob'?.42:style==='soft'?.22:.32;
 const t=flight?smooth(age/.09):0;
 const follow=flight?smooth((age-.09)/duration):0;
 const recovery=flight?smooth((age-duration-.16)/.5):0;
 if(recovery===1)return;
 for(const key of Object.keys(load) as (keyof SwingFrame)[]){
  const strike=load[key]+(contact[key]-load[key])*t;
  const value=strike+(finish[key]-strike)*follow;
  pose[key]=value+(pose[key]-value)*recovery;
 }
 if(style==='overhead'){pose.offArm=-1.8*(1-follow)*(1-recovery);pose.shoulderLift=.18*(1-follow)*(1-recovery);}
}
export function athletePose(player:PlayerState,state:GameState,shot:RallyShot,distance=0,moving=false):AthletePose{
 const active=shot.actor===player.id;
 const soft=['dink','drop','reset','block','lob'].includes(shot.intent.type);
 // Transform contact into the player's facing frame, then account for handedness.
 const dx=shot.contact.x-player.position.x,dz=shot.contact.z-player.position.z;
 const side=(dx*Math.cos(player.facing)-dz*Math.sin(player.facing))*(player.handedness==='right'?1:-1);
 const backhand=side<-.12||!!shot.feedback?.difficulty.some(label=>/backhand/i.test(label));
 const style:SwingStyle=!active?'ready':shot.intent.type==='overhead'?'overhead':shot.intent.type==='serve'?'serve':(shot.intent.type==='lob'||shot.intent.type==='return'&&shot.intent.shape==='arc'&&shot.intent.intendedNetClearance>=2)?'lob':soft?'soft':backhand?'backhand':'forehand';
 const age=shotAge(state,shot),flight=state.phase==='flight';
 const effort=flight?1-smooth((age-.2)/.65):state.phase==='decision'?1:0;
 const pose:AthletePose={style,reaction:null,armX:.2,armY:.15,armZ:-.12,elbow:0,wrist:0,offArm:.12,torso:0,lean:0,crouch:.035,stride:moving?Math.sin(distance*12)*.34:0,celebrate:state.phase==='complete'&&state.result?.winner===player.team};
 if(active&&(flight||state.phase==='decision')){
  if(style!=='ready')applySwing(pose,style,age,flight);
  if(style==='overhead'&&flight&&effort>0)pose.reaction='Overhead finish';
  if(style==='soft'&&backhand)pose.armZ-=.6*effort;
  const difficulty=effort>0?shot.feedback?.difficulty.join(' ')??'':'';
  if(/stretch/i.test(difficulty)){pose.reaction='Stretched';pose.lean=-Math.sign(side||1)*.16*effort;pose.armZ+=Math.sign(side||1)*.22*effort;pose.crouch+=(.085-pose.crouch)*effort}
  else if(/backward|late/i.test(difficulty)){pose.reaction='Late';pose.lean=.08*effort;pose.offArm=-.35*effort}
  else if(effort>0&&Math.hypot(dx,dz)<.3&&shot.contact.y>.7&&shot.contact.y<1.5&&['block','counter','volley'].includes(shot.intent.type)){pose.reaction='Jammed';pose.armZ=-.55*effort;pose.elbow=.35*effort;pose.crouch+=(.09-pose.crouch)*effort}
  else if(effort>0&&soft&&shot.feedback&&shot.feedback.quality<.55&&shot.legs.some(leg=>leg.arc>1)){pose.reaction='Pop-up';pose.offArm=.6*effort}
 }
 if(shot.missedSwing?.playerId===player.id&&flight){
  const swingAge=age-shot.missedSwing.time;
  if(swingAge>-.15&&swingAge<.9){
   pose.style='forehand';pose.reaction='Late';
   applySwing(pose,'forehand',swingAge+.15,true);
  }
 }
 if(pose.celebrate){pose.offArm=-2.8;pose.armX=-2.8;pose.crouch=0}
 return pose;
}
