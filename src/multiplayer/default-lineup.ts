import type {DesignedPlayer} from '../player-design';
export function defaultLineup(players:DesignedPlayer[],activeId:string|null,username:string,random=()=>0,preferred:string[]=[]):string[]{
 if(!players.length)return [];
 const first=players.find(p=>p.id===activeId)??players.find(p=>p.name.toLowerCase()===username.toLowerCase())??players[0];
 const partners=players.filter(p=>p.id!==first.id);
 const partner=partners.length?partners[Math.min(partners.length-1,Math.floor(random()*partners.length))]:first;
 const selected=preferred.filter((id,i)=>players.some(p=>p.id===id)&&preferred.indexOf(id)===i).slice(0,2);
 for(const id of [first.id,partner.id,...players.map(p=>p.id)])if(selected.length<2&&!selected.includes(id))selected.push(id);
 if(selected.length===1)selected.push(selected[0]);
 return selected;
}
