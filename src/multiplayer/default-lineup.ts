import type {DesignedPlayer} from '../player-design';
export function defaultLineup(players:DesignedPlayer[],activeId:string|null,username:string,random= Math.random):string[]{
 if(!players.length)return [];
 const first=players.find(p=>p.id===activeId)??players.find(p=>p.name.toLowerCase()===username.toLowerCase())??players[0];
 const partners=players.filter(p=>p.id!==first.id);
 const partner=partners.length?partners[Math.min(partners.length-1,Math.floor(random()*partners.length))]:first;
 return [first.id,partner.id];
}
