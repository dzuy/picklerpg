import {newPlayer,type DesignedPlayer} from './player-design';
import {LOOKS} from './player-looks';
import {defaultLineup} from './multiplayer/default-lineup';

export function shufflePlayers(ids:string[],random= Math.random):string[]{
 const result=[...ids];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result;
}

export function setupLineup(saved:DesignedPlayer[],current:(DesignedPlayer|null)[],random=Math.random,defaults?:{activeId:string|null;preferred:string[]}){
 const presets=LOOKS.map((look,i)=>({...newPlayer(`preset-${i}`),name:look.name,appearance:{...look.appearance},skills:{...look.skills}}));
 // Only current roster records and built-in opponents belong in a new setup.
 const records=new Map<string,DesignedPlayer>();
 for(const player of [...saved,...presets])if(!records.has(player.id))records.set(player.id,player);
 const players=[...records.values()];
 current=current.map(player=>player?records.get(player.id)??null:null);
 if(defaults)current=[...defaultLineup(saved,defaults.activeId,'',undefined,defaults.preferred).map(id=>records.get(id)!),null,null];
 const selected:string[]=[];
 selected.push(current[0]?.id??players[0].id);
 const available=shufflePlayers(players.map(p=>p.id).filter(id=>id!==selected[0]),random);
 for(let i=1;i<4;i++){
  const id=current[i]?.id;
  selected.push(id?id:available.find(candidate=>!selected.includes(candidate)&&!current.slice(i+1).some(p=>p?.id===candidate))??available.find(candidate=>!selected.includes(candidate))!);
 }
 return {players,selected};
}

export function cyclePlayer(roster:string[],selected:string[],slot:number,step:number):string[]{
 if(slot<0||slot>3||![-1,1].includes(step)||!selected[slot])return selected;
 if(!roster.length)return selected;
 const index=roster.indexOf(selected[slot]),next=[...selected];
 next[slot]=roster[(index+step+roster.length)%roster.length];
 return next;
}

export function validLineup(roster:string[],selected:string[]){return selected.length===4&&selected.every(id=>roster.includes(id))}
