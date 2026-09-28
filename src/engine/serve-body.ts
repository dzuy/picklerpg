import {finishRebound} from './trajectory';
import type {FlightLeg,PlayerState,Vec3} from './model';
/** Prototype body contact and lateral avoidance; ratings and flight time affect reaction. */
export function resolveBodyServe(leg:FlightLeg,player:PlayerState,seed:number):{leg:FlightLeg;hit:boolean;continuation?:FlightLeg;dodge?:Vec3}{
 const overlap=Math.abs(leg.to.x-player.position.x)<.32&&Math.abs(leg.to.z-player.position.z)<.5&&leg.to.y>.35&&leg.to.y<1.65;
 const reaction=Math.min(.95,.25+player.skills.hands/200+Math.max(0,leg.duration-.5)*.2);
 const roll=((Math.imul(seed^0x51ed270b,1664525)+1013904223)>>>0)/4294967296;
 const dodges=overlap&&roll<reaction;
 if(overlap&&!dodges)return {leg,hit:true};
 // Spin curves are defined only on the original leg. Extrapolating their cubic
 // beyond t=1 can reverse gravity and launch the ball hundreds of metres away.
 // Keep the approach intact, then continue from its endpoint velocity under gravity.
 return {hit:false,leg,continuation:finishRebound(leg),dodge:dodges?{...player.position,x:player.position.x+(leg.to.x>=player.position.x?-.65:.65)}:undefined};
}
