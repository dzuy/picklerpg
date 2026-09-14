import {parseCheckpoint,type MatchCheckpoint} from '../engine/checkpoint';
export interface MatchStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
/** One full solo match per account/origin. Never overwrite an unreadable save implicitly. */
export class LocalMatchStore {
 readonly key:string;
 private blocked=false;
 constructor(private storage:MatchStorage,owner:string){this.key=`pickle-rpg-match-v1:${owner}`;}
 load():MatchCheckpoint|null {
  try{const raw=this.storage.getItem(this.key);if(raw===null)return null;if(raw.length>8_000_000)throw new Error('Saved match is too large.');return parseCheckpoint(JSON.parse(raw));}
  catch(error){this.blocked=true;throw error;}
 }
 save(checkpoint:MatchCheckpoint){
  if(this.blocked)throw new Error('The previous save could not be loaded. Discard it explicitly before starting a new saved match.');
  const encoded=JSON.stringify(checkpoint);
  if(encoded.length>8_000_000)throw new Error('This match is too large to save locally.');
  try{this.storage.setItem(this.key,encoded);}catch{throw new Error('Could not save this turn on this device. Free storage or allow browser storage, then try again.');}
 }
 discard(){this.storage.removeItem(this.key);this.blocked=false;}
}
