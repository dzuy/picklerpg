import {COURT,type PlayerId,type PlayerState,type RallyShot,type ShotIntent,type Vec3} from './model';
export interface PositioningContext {players:PlayerState[];intent:ShotIntent;endpoint:Vec3;receiver:PlayerId|null;completedShots:number;duration:number}
const bound=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
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
  let depth=COURT.kitchen+.5;
  // Serving team holds back until the required return bounce.
  if((c.completedShots<2&&player.team===hitter.team&&c.intent.type==='serve')||(c.completedShots===1&&player.team!==hitter.team))depth=COURT.length/2+.35;
  else if(player.team===hitter.team&&['drive','drop','reset'].includes(c.intent.type))depth=Math.max(COURT.kitchen+.5,Math.abs(player.position.z)-(1+player.tendencies.kitchenApproach*1.4));
  else if(player.team!==hitter.team&&c.intent.type==='lob')depth=Math.max(depth,Math.abs(c.endpoint.z));
  let destination:Vec3={x,y:0,z:side*depth};
  if(player.id===c.receiver){
   destination={x:c.endpoint.x-side*.4,y:0,z:c.endpoint.z+side*.35};
   // Volley preparation stays outside the non-volley zone; ground contacts may enter.
   if(c.endpoint.y>=.9)destination.z=side*Math.max(COURT.kitchen+.2,Math.abs(destination.z));
  }else{
   const distance=Math.hypot(destination.x-player.position.x,destination.z-player.position.z);
   const budget=(1.8+player.skills.movement/100*2)*c.duration;
   const fraction=distance===0?1:Math.min(1,budget/distance);
   destination={x:player.position.x+(destination.x-player.position.x)*fraction,y:0,z:player.position.z+(destination.z-player.position.z)*fraction};
  }
  positions[player.id]=destination;
 }
 return positions;
}
