import type {PlayerState} from './model';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** Time needed to recognize the ball, move, and prepare the paddle. */
export function receptionTiming(player:PlayerState,distance:number,elapsed:number,speed:number,bounced:boolean){
 const movement=player.skills.movement/100,hands=player.skills.hands/100;
 const reaction=.12+(1-hands)*.32;
 const travel=Math.max(0,distance-.35)/(1.5+movement*3.5);
 const preparation=(.07+(1-hands)*.22)*clamp(speed/16)*(bounced?.65:1);
 const spare=elapsed-reaction-travel;
 return {reachable:spare>=-.08,pressure:clamp((preparation+.16-spare)/.4),reaction};
}
export function receptionRoll(seed:number,player:PlayerState){
 const salt={you:11,partner:23,'opponent-left':37,'opponent-right':53}[player.id];
 let n=(seed^Math.imul(salt,0x9e3779b9))>>>0;
 n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);
 return ((n^(n>>>15))>>>0)/4294967296;
}
export function swingMissChance(player:PlayerState,pressure:number,speed:number){
 const weakness=1-player.skills.hands/100;
 return Math.min(.65,.003+weakness*weakness*(.035+pressure*.5+clamp((speed-6)/18)*.16));
}
