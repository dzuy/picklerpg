import {COURT,type PlayerId,type PlayerState,type ShotTarget,type ShotType,type Vec3} from './model';
export interface ResolvedTarget {point:Vec3; kind:'landing'|'intercept'}
export interface TargetContext {actor:PlayerId; contact:Vec3; players:PlayerState[]; shotType:ShotType}
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
/** Geometry only: describes the requested destination, never predicts a winner. */
export function resolveTarget(target:ShotTarget,c:TargetContext):ResolvedTarget{
 const actor=c.players.find(p=>p.id===c.actor);if(!actor)throw new Error('Unknown hitter.');
 if(![c.contact.x,c.contact.y,c.contact.z].every(Number.isFinite)||c.contact.z===0)throw new Error('Contact must be on one side of the net.');
 const opponents=c.players.filter(p=>p.team!==actor.team);
 if(opponents.length!==2||opponents.some(p=>![p.position.x,p.position.y,p.position.z,p.facing].every(Number.isFinite)))throw new Error('Two valid opponents are required.');
 const side=-Math.sign(c.contact.z),limit=COURT.width/2-.25;
 const bound=(point:Vec3):Vec3=>({x:clamp(point.x,-limit,limit),y:point.y,z:side*clamp(Math.abs(point.z),.35,COURT.length/2-.35)});
 let resolved:ResolvedTarget;
 if(target.kind==='point'){
  if(![target.x,target.z].every(Number.isFinite)||c.shotType!=='serve'&&(Math.abs(target.x)>COURT.width/2||Math.abs(target.z)>COURT.length/2)||target.z*c.contact.z>=0)throw new Error('Choose a spot on the opposing court.');
  resolved={point:{x:target.x,y:.037,z:target.z},kind:'landing'};
 }else if(target.kind==='player'){
  if(c.shotType==='serve'&&target.aim!=='body')throw new Error('Choose a service-box target for a serve.');
  const player=opponents.find(p=>p.id===target.playerId);if(!player)throw new Error('Target must be an opponent.');
  if(Math.sign(player.position.z)!==side)throw new Error('Target player must be across the net.');
  let point={...player.position,y:target.aim==='feet'?.037:1.05};
  if(target.aim==='feet'){point.z-=side*.2}
  else if(target.aim==='backhand-side'){
   const offset=player.handedness==='right'?-.45:.45;
   point.x+=Math.cos(player.facing)*offset;point.z-=Math.sin(player.facing)*offset;point.y=.9;
  }else if(target.aim!=='body')throw new Error('Unknown player aim.');
  resolved={point:c.shotType==='serve'?point:bound(point),kind:target.aim==='feet'?'landing':'intercept'};
 }else if(target.kind==='zone'){
  const depths={kitchen:1.25,transition:3.5,deep:5.6};const depth=depths[target.depth];if(depth===undefined)throw new Error('Unknown target depth.');
  const z=side*depth,contactSide=Math.sign(c.contact.x)||Math.sign(actor.position.x)||1;
  let x:number;
  switch(target.zone){
   case 'far-left':x=-limit;break;
   case 'far-right':x=limit;break;
   case 'middle':x=(opponents[0].position.x+opponents[1].position.x)/2;break;
   case 'line':x=c.contact.x;break;
   case 'crosscourt':x=-contactSide*Math.max(1.2,Math.abs(c.contact.x));break;
   case 'wide':x=-contactSide*limit;break;
   case 'open-court':{
    // Deterministic maximum distance from the nearest defender at the chosen depth.
    const candidates=[-contactSide*limit,contactSide*limit,-1.4,0,1.4];
    x=candidates.reduce((best,current)=>{
     const clearance=(cx:number)=>Math.min(...opponents.map(p=>Math.hypot(cx-p.position.x,z-p.position.z)));
     return clearance(current)>clearance(best)+1e-9?current:best;
    });break;
   }
   default:throw new Error('Unknown target zone.');
  }
  resolved={point:bound({x,y:.037,z}),kind:'landing'};
 }else throw new Error('Unknown target kind.');
 if(c.shotType==='serve'&&target.kind!=='point'&&resolved.kind==='landing'&&(c.contact.x*resolved.point.x>=0||Math.abs(resolved.point.z)<=COURT.kitchen))throw new Error('Serve diagonally beyond the kitchen.');
 return resolved;
}
