import {newPlayer,type DesignedPlayer} from './player-design';
import {randomPlayerAppearance} from './random-player-appearance';
import {randomBudgetSkills,STARTING_SKILL_POINTS} from './skill-budget';
import {SUMMARY_SKILLS} from './player-skill-summary';
/** Random free appearance and skills within the new account's starting budget. */
export function starterPlayer(name:string,id:string,random:()=>number=Math.random):DesignedPlayer{
 const player=newPlayer(id);
 player.appearance=randomPlayerAppearance(false,random);
 player.skills=randomBudgetSkills(STARTING_SKILL_POINTS,random);
 // Vary individual shots too, preserving each area's exact point allocation.
 for(const group of Object.values(SUMMARY_SKILLS)){
  const keys=[...group];
  for(let i=keys.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}
  let remaining=keys.reduce((total,key)=>total+player.skills[key],0);
  keys.forEach((key,index)=>{
   const minimum=Math.max(0,remaining-(keys.length-index-1)*100),maximum=Math.min(100,remaining);
   player.skills[key]=minimum+Math.floor(random()*(maximum-minimum+1));remaining-=player.skills[key];
  });
 }
 return {...player,name:name.trim().slice(0,24)||'Player'};
}
