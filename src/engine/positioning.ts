import {kitchenSafeRoute} from './erne';
import {COURT,type PlayerId,type PlayerState,type RallyShot,type ShotIntent,type Vec3} from './model';
export interface PositioningContext {players:PlayerState[];intent:ShotIntent;endpoint:Vec3;receiver:PlayerId|null;completedShots:number;duration:number;recoveryDelay?:number}
/** Seconds spent regaining balance after striking; only simulation flight time counts. */
export function hitterRecoveryDelay(player:PlayerState,contact:Vec3,timingPressure=0){
 const skill=Math.max(0,Math.min(100,player.skills.movement))/100;
 const reach=Math.hypot(contact.x-player.position.x,contact.z-player.position.z);
 const stretch=Math.max(0,Math.min(1,(reach-.6)/1.2));
 const wide=Math.max(0,Math.min(1,(Math.abs(player.position.x)-(COURT.width/2-.7))/1.2));
 return .04+.5*(1-skill)**2+(Math.max(stretch,wide)*.45+Math.max(0,Math.min(1,timingPressure))*.2)*(1-.65*skill);
}
const bound=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
/** Repeatable per-shot variation keeps authoritative play and replays in agreement. */
function movementVariation(id:PlayerId,shot:number){
 const salt={you:11,partner:23,'opponent-left':37,'opponent-right':53}[id];
 let value=Math.imul(shot+1,0x9e3779b9)^Math.imul(salt,0x85ebca6b);
 value=Math.imul(value^(value>>>16),0x21f0aaad);
 return ((value^(value>>>15))>>>0)/4294967296;
}
/** Different acceleration rhythms, with exact start/end positions and recovery holds. */
export function playerMovementProgress(id:PlayerId,elapsed:number,duration:number,delay=0){
 const t=bound((elapsed-delay)/Math.max(.001,duration-delay),0,1);
 const rhythm={you:-.18,partner:.16,'opponent-left':.18,'opponent-right':-.16}[id];
 const phase=t+rhythm*t*(1-t);
 return phase*phase*(3-2*phase);
}
/** Tactical destinations, independent of a scenario's stored movement templates.
 * Contact receiver has priority; other players recover within their movement budget. */
export function planPositions(c:PositioningContext):RallyShot['positions']{
 if(!Number.isFinite(c.duration)||c.duration<=0||![c.endpoint.x,c.endpoint.y,c.endpoint.z].every(Number.isFinite))throw new Error('Invalid positioning flight.');
 const hitter=c.players.find(p=>p.id===c.intent.actor);if(!hitter)throw new Error('Unknown positioning hitter.');
 if(c.receiver&&!c.players.some(p=>p.id===c.receiver&&p.team!==hitter.team))throw new Error('Receiver must be an opponent.');
 const positions={} as RallyShot['positions'];
 for(const player of c.players){
  const side=player.team==='home'?1:-1,team=c.players.filter(p=>p.team===player.team).sort((a,b)=>a.position.x-b.position.x||a.id.localeCompare(b.id));
  const lane=team[0].id===player.id?-1:1;
  // Shift as a pair toward the ball while retaining separate coverage lanes.
  let x=bound(lane*COURT.width/4+c.endpoint.x*.22,-COURT.width/2+.35,COURT.width/2-.35);
  const variation=movementVariation(player.id,c.completedShots);
  // A staggered pair covers short balls and the space behind the lead player.
  // Mirror the formation on the other side instead of favoring the home team.
  const kitchenDepth=COURT.kitchen+.25+(lane===side?.7:0)+(1-player.tendencies.kitchenApproach)*.25+variation*.12;
  let depth=kitchenDepth;
  // Serving team holds back until the required return bounce.
  if((c.completedShots<2&&player.team===hitter.team&&c.intent.type==='serve')||(c.completedShots===1&&player.team!==hitter.team))depth=COURT.length/2+.35;
  else if(player.team===hitter.team&&['drive','drop','reset'].includes(c.intent.type))depth=Math.max(kitchenDepth,Math.abs(player.position.z)-(1+player.tendencies.kitchenApproach*1.4));
  else if(player.team!==hitter.team&&c.intent.type==='lob')depth=Math.max(depth,Math.abs(c.endpoint.z));
  let destination:Vec3={x,y:0,z:side*depth};
  if(player.id===c.receiver){
   destination={x:c.endpoint.x-side*.4,y:0,z:c.endpoint.z+side*.35};
   // Volley preparation stays outside the non-volley zone; ground contacts may enter.
   if(c.endpoint.y>=.9)destination.z=side*Math.max(COURT.kitchen+.2,Math.abs(destination.z));
  }else{
   // A sideline volley must recover outside the kitchen before cutting inward.
   if(Math.abs(player.position.x)>COURT.width/2&&Math.abs(player.position.z)<COURT.kitchen+.3&&!kitchenSafeRoute(player.position,destination))destination.x=player.position.x;
   const distance=Math.hypot(destination.x-player.position.x,destination.z-player.position.z);
   const movingTime=Math.max(0,c.duration-(player.id===c.intent.actor?(c.recoveryDelay??0):0));
   const budget=(1.8+player.skills.movement/100*2)*(.86+.14*variation)*movingTime;
   const fraction=distance===0?1:Math.min(1,budget/distance);
   destination={x:player.position.x+(destination.x-player.position.x)*fraction,y:0,z:player.position.z+(destination.z-player.position.z)*fraction};
  }
  positions[player.id]=destination;
 }
 return positions;
}
