import {browserStorage} from './browser-storage';

const key='pickle-flight-guide-v1';
const legacyKeys={solo:'pickle-rpg-controls-v1',friends:'pickle-remote-view'};

export function saveFlightGuide(enabled:boolean,storage:Storage=browserStorage){
 storage.setItem(key,JSON.stringify(enabled));
}

export function loadFlightGuide(mode:keyof typeof legacyKeys,storage:Storage=browserStorage):boolean{
 try{
  const saved=JSON.parse(storage.getItem(key)??'null');
  if(typeof saved==='boolean')return saved;
 }catch{/* Invalid preferences use the previous settings or the default. */}
 // Prefer the current mode when migrating older, separate preferences.
 for(const legacyKey of [legacyKeys[mode],legacyKeys[mode==='solo'?'friends':'solo']]){
  try{
   const saved=JSON.parse(storage.getItem(legacyKey)??'null');
   if(typeof saved?.guides==='boolean'){
    saveFlightGuide(saved.guides,storage);
    return saved.guides;
   }
  }catch{/* Try the other mode before falling back to on. */}
 }
 saveFlightGuide(true,storage);
 return true;
}
