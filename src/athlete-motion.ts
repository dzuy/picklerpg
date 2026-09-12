import type {GameState,PlayerState,RallyShot} from './simulation';
export type SwingStyle='ready'|'serve'|'forehand'|'backhand'|'soft'|'overhead';
export type Reaction='Stretched'|'Jammed'|'Late'|'Pop-up'|'Overhead finish'|null;
export interface AthletePose {style:SwingStyle;reaction:Reaction;armX:number;armY:number;armZ:number;elbow:number;wrist:number;offArm:number;torso:number;lean:number;crouch:number;stride:number;celebrate:boolean}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t)};
/** Shot age is independent of flight-leg boundaries (a bounce must not replay a swing). */
export function shotAge(state:GameState,shot:RallyShot){
 return shot.legs.slice(0,state.legIndex).reduce((total,leg)=>total+leg.duration,0)+state.elapsed;
}
export function athletePose(player:PlayerState,state:GameState,shot:RallyShot,distance=0,moving=false):AthletePose{
 const active=shot.actor===player.id;
 const soft=['dink','drop','reset','block','lob'].includes(shot.intent.type);
 // Transform contact into the player's facing frame, then account for handedness.
 const dx=shot.contact.x-player.position.x,dz=shot.contact.z-player.position.z;
 const side=(dx*Math.cos(player.facing)-dz*Math.sin(player.facing))*(player.handedness==='right'?1:-1);
 const backhand=side<-.12||!!shot.feedback?.difficulty.some(label=>/backhand/i.test(label));
 const style:SwingStyle=!active?'ready':shot.intent.type==='overhead'?'overhead':shot.intent.type==='serve'?'serve':soft?'soft':backhand?'backhand':'forehand';
 const age=shotAge(state,shot),flight=state.phase==='flight';
 const effort=flight?1-smooth((age-.2)/.65):state.phase==='decision'?1:0;
 const follow=flight?smooth(age/.2):0;
 const pose:AthletePose={style,reaction:null,armX:.2,armY:.15,armZ:-.12,elbow:0,wrist:0,offArm:.12,torso:0,lean:0,crouch:.035,stride:moving?Math.sin(distance*12)*.34:0,celebrate:state.phase==='complete'&&state.result?.winner===player.team};
 if(active&&effort>0){
  if(style==='overhead'){pose.armX=(flight?1.8-follow*1.4:2.65)*effort;pose.armZ=.12;pose.elbow=-1.35*effort;pose.wrist=-1.57*effort;pose.offArm=1.5*effort;pose.torso=-.2*effort;if(flight)pose.reaction='Overhead finish'}
  else if(style==='soft'){pose.armX=(.25+follow*.3)*effort;pose.armY=(backhand?.65:.08)*effort;pose.armZ=(backhand?-.62:-.08)*effort;pose.crouch=.07;pose.elbow=-.1*effort}
  else if(style==='serve'){pose.armX=(flight?.65+follow*.45:-.45)*effort;pose.armY=(-.2+follow*.5)*effort;pose.torso=(-.18+follow*.38)*effort}
  else if(style==='backhand'){pose.armX=(.3+follow*.48)*effort;pose.armY=(.65-follow*.9)*effort;pose.armZ=(-.68+follow*.95)*effort;pose.torso=(.25-follow*.48)*effort}
  else {pose.armX=(flight?.45+follow*.6:-.25)*effort;pose.armY=(-.6+follow*1.25)*effort;pose.armZ=(-.08-follow*.4)*effort;pose.torso=(-.3+follow*.65)*effort}
  const difficulty=shot.feedback?.difficulty.join(' ')??'';
  if(/stretch/i.test(difficulty)){pose.reaction='Stretched';pose.lean=-Math.sign(side||1)*.16*effort;pose.armZ+=Math.sign(side||1)*.22*effort;pose.crouch=.085}
  else if(/backward|late/i.test(difficulty)){pose.reaction='Late';pose.lean=.08*effort;pose.offArm=-.35*effort}
  else if(Math.hypot(dx,dz)<.3&&shot.contact.y>.7&&shot.contact.y<1.5&&['block','counter','volley'].includes(shot.intent.type)){pose.reaction='Jammed';pose.armZ=-.55*effort;pose.elbow=.35*effort;pose.crouch=.09}
  else if(soft&&shot.feedback&&shot.feedback.quality<.55&&shot.legs.some(leg=>leg.arc>1)){pose.reaction='Pop-up';pose.offArm=.6*effort}
 }
 if(pose.celebrate){pose.offArm=2.3;pose.armX=1.1;pose.crouch=0}
 return pose;
}
