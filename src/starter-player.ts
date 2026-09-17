import {newPlayer,type DesignedPlayer} from './player-design';
import {LOOKS} from './player-looks';
/** Random appearance, with the same starting skills for every new account. */
export function starterPlayer(name:string,id:string):DesignedPlayer{
 const look=LOOKS[Math.floor(Math.random()*LOOKS.length)];
 return {...newPlayer(id),name:name.trim().slice(0,24)||'Player',appearance:{...look.appearance}};
}
