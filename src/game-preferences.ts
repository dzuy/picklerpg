import {browserStorage} from './browser-storage';
type Preference='names'|'autoPlay'|'partnerAutonomy';
const legacy={names:[['pickle-rpg-controls-v1','showPlayerNames'],['pickle-remote-view','names']],autoPlay:[['pickle-rpg-controls-v1','playerAutonomy']],partnerAutonomy:[['pickle-rpg-controls-v1','partnerAutonomy']]} as const;
export function saveGamePreference(name:Preference,value:boolean,storage:Storage=browserStorage){storage.setItem(`pickle-game-${name}-v1`,JSON.stringify(value))}
export function loadGamePreference(name:Preference,fallback:boolean,storage:Storage=browserStorage){
 try{const value=JSON.parse(storage.getItem(`pickle-game-${name}-v1`)??'null');if(typeof value==='boolean')return value}catch{}
 for(const [key,field] of legacy[name])try{const value=JSON.parse(storage.getItem(key)??'null')?.[field];if(typeof value==='boolean'){saveGamePreference(name,value,storage);return value}}catch{}
 return fallback;
}
