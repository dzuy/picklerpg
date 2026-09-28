import {COURT,type GameState,type ShotIntent} from './model';
import {resolveTarget} from './targeting';

/** Judge visible space and defender skills, never the sampled outcome of a shot. */
export function tacticalPlacement(state:Pick<GameState,'players'|'ball'>,intent:ShotIntent):number{
 if(intent.type==='serve')return 0;
 const actor=state.players.find(p=>p.id===intent.actor);
 if(!actor)return 0;
 const defenders=state.players.filter(p=>p.team!==actor.team);
 if(defenders.length!==2)return 0;
 try{
  const target=resolveTarget(intent.target,{actor:intent.actor,contact:state.ball.position,players:state.players,shotType:intent.type});
  const ordered=defenders.map(player=>({player,distance:Math.hypot(player.position.x-target.point.x,player.position.z-target.point.z)})).sort((a,b)=>a.distance-b.distance);
  const attack=['drive','counter','volley','overhead','flick'].includes(intent.type);
  const opening=Math.min(2,ordered[0].distance*.55);
  // Court-edge placements demand more precision; open space must justify that risk.
  const edgeCost=Math.max(0,.65-(COURT.width/2-Math.abs(target.point.x)))*(attack?1.2:.6);
  let score=opening-edgeCost;
  if(attack){
   const defense=(p:typeof actor)=>(p.skills.hands+p.skills.counter+p.skills.volley)/3;
   const targetPlayer=intent.target.kind==='player'?intent.target.playerId:null;
   const receiver=defenders.find(p=>p.id===targetPlayer)??ordered[0].player;
   score+=Math.max(-.7,Math.min(.7,(defense(defenders.find(p=>p.id!==receiver.id)!)-defense(receiver))/50));
   if(intent.target.kind==='player'&&intent.target.aim==='body'){
    const distance=Math.hypot(receiver.position.x-state.ball.position.x,receiver.position.z-state.ball.position.z);
    // A body attack is useful at short range, not a substitute for finding space from deep court.
    score+=distance<6&&state.ball.position.y>=COURT.netCenter?1.3:0;
   }
  }
  return score;
 }catch{return 0;}
}
