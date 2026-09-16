import type {PlayerSkills,ShotIntent,ShotType} from './model';
import {characterArchetype,isDinkSpecialist,type ArchetypeId} from './player-profiles';
/** Preferences only: callers still supply legal options, tactical scoring and seeded variation. */
const preferences:Record<ArchetypeId,Partial<Record<ShotType,number>>>={
 banger:{drive:4,overhead:1,volley:1,lob:-2},
 dinker:{dink:4,drop:3,reset:3,block:3,lob:-3},
 lobber:{lob:4,drop:1},
 attacker:{drive:3,counter:3,flick:3,volley:2,overhead:1,lob:-2},
 setup:{drop:4,dink:3,reset:3,block:2,lob:-1},
 grinder:{drop:2,dink:3,reset:2,block:1,lob:-1},
 allCourt:{},
 defender:{reset:4,block:4,drop:2,dink:1,lob:-1},
};
export function archetypeShotPreference(skills:PlayerSkills,intent:ShotIntent,height:number,incomingSpeed:number){
 const style=characterArchetype(skills)??(isDinkSpecialist(skills)?'dinker':null);
 if(!style)return 0;
 // A lob specialist still needs time under the ball. Covered lobs are separately
 // penalized by the tactical scorer, and overhead put-aways keep their priority.
 if(style==='lobber'&&intent.type==='lob'&&(incomingSpeed>=12||height>=1.9))return 0;
 if(intent.type==='serve'||intent.type==='return'){
  if(style==='banger'||style==='attacker')return intent.pace==='fast'?2:0;
  if(style==='lobber'&&intent.intendedNetClearance>=2)return 2;
 }
 return preferences[style][intent.type]??0;
}
