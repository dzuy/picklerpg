import type {FlightLeg,PlayerState,Vec3} from './model';
/** Prototype body contact and lateral avoidance; ratings and flight time affect reaction. */
export function resolveBodyServe(leg:FlightLeg,player:PlayerState,seed:number):{leg:FlightLeg;hit:boolean;dodge?:Vec3}{
 const overlap=Math.abs(leg.to.x-player.position.x)<.32&&Math.abs(leg.to.z-player.position.z)<.5&&leg.to.y>.35&&leg.to.y<1.65;
 const reaction=Math.min(.95,.25+player.skills.hands/200+Math.max(0,leg.duration-.5)*.2);
 const roll=((Math.imul(seed^0x51ed270b,1664525)+1013904223)>>>0)/4294967296;
 const dodges=overlap&&roll<reaction;
 if(overlap&&!dodges)return {leg,hit:true};
 // Extend the same curved flight beyond the body target to its first ground contact.
 const point=(t:number)=>({x:leg.from.x+(leg.to.x-leg.from.x)*t+4*(leg.sideCurve??0)*t*(1-t),y:leg.from.y+(leg.to.y-leg.from.y)*t+4*leg.arc*t*(1-t)+8*(leg.verticalSpin??0)*t*t*(1-t),z:leg.from.z+(leg.to.z-leg.from.z)*t});
 let low=1,high=1.25;while(point(high).y>.037&&high<8)high*=1.35;
 for(let i=0;i<60;i++){const middle=(low+high)/2;if(point(middle).y>.037)low=middle;else high=middle}
 const scale=Math.max(1.001,high),raw=point(scale),vertical=leg.verticalSpin??0;
 const landing={...raw,y:.037};
 return {hit:false,leg:{...leg,to:landing,duration:leg.duration*scale,arc:leg.arc*scale*scale-2*vertical*scale*scale+2*vertical*scale*scale*scale,sideCurve:(leg.sideCurve??0)*scale*scale,verticalSpin:vertical*scale*scale*scale,bounceAtEnd:true},dodge:dodges?{...player.position,x:player.position.x+(leg.to.x>=player.position.x?-.65:.65)}:undefined};
}
