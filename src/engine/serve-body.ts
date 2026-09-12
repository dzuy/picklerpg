import type {FlightLeg,PlayerState,Vec3} from './model';
/** Prototype body contact and lateral avoidance; ratings and flight time affect reaction. */
export function resolveBodyServe(leg:FlightLeg,player:PlayerState,seed:number):{leg:FlightLeg;hit:boolean;dodge?:Vec3}{
 const overlap=Math.abs(leg.to.x-player.position.x)<.32&&Math.abs(leg.to.z-player.position.z)<.5&&leg.to.y>.35&&leg.to.y<1.65;
 const reaction=Math.min(.95,.25+player.skills.hands/200+Math.max(0,leg.duration-.5)*.2);
 const roll=((Math.imul(seed^0x51ed270b,1664525)+1013904223)>>>0)/4294967296;
 const dodges=overlap&&roll<reaction;
 if(overlap&&!dodges)return {leg,hit:true};
 // Extend the same parabola beyond the body target to its first ground contact.
 const a=4*leg.arc,b=leg.to.y-leg.from.y+a,c=leg.from.y-.037;
 const t=a>1e-8?(b+Math.sqrt(b*b+4*a*c))/(2*a):-c/b;
 const scale=Math.max(1.001,t);
 const landing={x:leg.from.x+(leg.to.x-leg.from.x)*scale,y:.037,z:leg.from.z+(leg.to.z-leg.from.z)*scale};
 return {hit:false,leg:{...leg,to:landing,duration:leg.duration*scale,arc:leg.arc*scale*scale,bounceAtEnd:true},dodge:dodges?{...player.position,x:player.position.x+(leg.to.x>=player.position.x?-.65:.65)}:undefined};
}
