import {newPlayer,type DesignedPlayer} from './player-design';
import {LOOKS} from './player-looks';

export function shufflePlayers(ids:string[],random= Math.random):string[]{
 const result=[...ids];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result;
}

export function setupLineup(saved:DesignedPlayer[],current:(DesignedPlayer|null)[],random=Math.random){
 const presets=LOOKS.map((look,i)=>({...newPlayer(`preset-${i}`),name:look.name,appearance:{...look.appearance},skills:{...look.skills}}));
 // Saved records win by ID. Keep current players even if their library is still loading.
 const records=new Map<string,DesignedPlayer>();
 for(const player of [...saved,...current.filter((p):p is DesignedPlayer=>p!==null),...presets])if(!records.has(player.id))records.set(player.id,player);
 const players=[...records.values()];
 const selected:string[]=[];
 selected.push(current[0]?.id??players[0].id);
 const available=shufflePlayers(players.map(p=>p.id).filter(id=>id!==selected[0]),random);
 for(let i=1;i<4;i++){
  const id=current[i]?.id;
  selected.push(id&&!selected.includes(id)?id:available.find(candidate=>!selected.includes(candidate)&&!current.slice(i+1).some(p=>p?.id===candidate))??available.find(candidate=>!selected.includes(candidate))!);
 }
 return {players,selected};
}

export function cyclePlayer(roster:string[],selected:string[],slot:number,step:number):string[]{
 if(slot<0||slot>3||![-1,1].includes(step)||!selected[slot])return selected;
 const index=roster.indexOf(selected[slot]),next=[...selected];
 for(let offset=1;offset<roster.length;offset++){
  const id=roster[(index+step*offset+roster.length)%roster.length];
  if(!selected.includes(id)){next[slot]=id;return next}
 }
 // A full four-player roster can still change assignments by swapping slots.
 for(let offset=1;offset<roster.length;offset++){
  const id=roster[(index+step*offset+roster.length)%roster.length],other=selected.indexOf(id);
  if(other>=0&&other!==slot){[next[slot],next[other]]=[next[other],next[slot]];return next}
 }
 return selected;
}

export function validLineup(roster:string[],selected:string[]){return selected.length===4&&new Set(selected).size===4&&selected.every(id=>roster.includes(id))}
