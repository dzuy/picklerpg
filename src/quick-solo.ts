import {COURT_LOCATIONS} from './locations';
import type {DesignedPlayer} from './player-design';
import type {SoloLaunch} from './solo-launch';

/** Sample without replacement so a quick guest game has four distinct players. */
export function quickSolo(publicPlayers:DesignedPlayer[],home:DesignedPlayer[]|null,random=Math.random):SoloLaunch{
 const pool=[...new Map(publicPlayers.map(p=>[p.id,p])).values()];
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const count=home?2:4;
 if(pool.length<count)throw Error('Not enough public players are available. Please try again.');
 const players=home?[...home,...pool.slice(0,2)]:pool.slice(0,4);
 return {players:structuredClone({you:players[0],partner:players[1],'opponent-left':players[2],'opponent-right':players[3]}),scoring:'rally-doubles',target:5,court:COURT_LOCATIONS[Math.floor(random()*COURT_LOCATIONS.length)].id};
}
