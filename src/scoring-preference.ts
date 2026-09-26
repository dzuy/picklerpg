import {browserStorage} from './browser-storage';
import {isValidTargetScore,type ScoringMode} from './engine/scoring';

export interface ScoringPreference {scoring:ScoringMode;target:number}
const key='pickle-scoring-preference-v1';
const validScoring=(value:unknown):value is ScoringMode=>value==='rally-doubles'||value==='side-out-doubles';

export function loadScoringPreference(fallback:ScoringPreference={scoring:'rally-doubles',target:7},storage:Storage=browserStorage):ScoringPreference{
 try{
  const saved=JSON.parse(storage.getItem(key)??'null');
  if(validScoring(saved?.scoring)&&isValidTargetScore(saved?.target))return {scoring:saved.scoring,target:saved.target};
 }catch{/* Ignore malformed local preferences. */}
 try{
  const legacy=JSON.parse(storage.getItem('pickle-rpg-controls-v1')??'null');
  if(validScoring(legacy?.scoringPreference))return {...fallback,scoring:legacy.scoringPreference};
 }catch{/* Keep the default settings. */}
 return {...fallback};
}

/** Only call after starting a game or successfully creating its invitation. */
export function saveScoringPreference(value:ScoringPreference,storage:Storage=browserStorage){
 if(!validScoring(value.scoring)||!isValidTargetScore(value.target))return;
 storage.setItem(key,JSON.stringify({scoring:value.scoring,target:value.target}));
}
