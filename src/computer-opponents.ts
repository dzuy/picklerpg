import {SKILLS} from './engine/model';
import type {DesignedPlayer} from './player-design';

// Stable across catalog ordering, recruiting and public-id aliases. These are
// match-only builds; never save them back to the recruitable community roster.
const LEVELS=[20,40,60,70,80,85,90,92];
export function computerOpponent(player:DesignedPlayer):DesignedPlayer{
 const key=player.name.trim().toLowerCase();
 const hash=Array.from(key).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
 const target=LEVELS[hash%LEVELS.length];
 const values=SKILLS.map(skill=>player.skills[skill]);
 const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
 // Keep specialties, with less headroom for variation near the skill ceiling.
 const spread=Math.min(1,(100-target)/20,target/20);
 const at=(offset:number)=>values.map(value=>Math.max(0,Math.min(100,offset+(value-mean)*spread)));
 const effective=(values:number[])=>{const avg=values.reduce((a,b)=>a+b,0)/values.length;return avg-.15*Math.sqrt(values.reduce((sum,v)=>sum+(v-avg)**2,0)/values.length)};
 let low=0,high=120;
 for(let i=0;i<24;i++){const mid=(low+high)/2;if(effective(at(mid))<target)low=mid;else high=mid;}
 const adjusted=at((low+high)/2);
 return {...player,skills:Object.fromEntries(SKILLS.map((skill,i)=>[skill,Math.round(adjusted[i])])) as DesignedPlayer['skills']};
}
