import {parseCheckpoint,type MatchCheckpoint} from '../engine/checkpoint';
import type {CourtLocation} from '../locations';
import type {MatchStorage} from './local-match-store';
export interface OpenPlayGame {checkpoint:MatchCheckpoint;court:CourtLocation;updatedAt:string;archived:boolean;ended:boolean}
/** Account-scoped experiment saves. The legacy single save stays intact for rollback. */
export class OpenPlayStore {
 readonly key:string;
 constructor(private storage:MatchStorage,private owner:string){this.key=`pickle-open-play-v1:${owner}`;}
 list():OpenPlayGame[]{
  const raw=this.storage.getItem(this.key);
  if(raw===null){
   const legacy=this.storage.getItem(`pickle-rpg-match-v1:${this.owner}`);
   if(!legacy)return [];
   const savedCourt=this.storage.getItem('picklebash-location-v1');
   const game:OpenPlayGame={checkpoint:parseCheckpoint(JSON.parse(legacy)),court:savedCourt==='venice'||savedCourt==='arizona'?savedCourt:'forest',updatedAt:new Date().toISOString(),archived:false,ended:false};
   this.write([game]);return [game];
  }
  const data=JSON.parse(raw);if(!Array.isArray(data))throw new Error('Your saved games could not be read.');
  return data.map(game=>{
   if(!game||!['forest','venice','arizona'].includes(game.court)||typeof game.archived!=='boolean'||typeof game.ended!=='boolean'||typeof game.updatedAt!=='string')throw new Error('Your saved games could not be read.');
   return {...game,checkpoint:parseCheckpoint(game.checkpoint)};
  });
 }
 load(id?:string){const games=this.list();return id?games.find(g=>g.checkpoint.matchId===id)??null:games.filter(g=>!g.archived&&!g.ended&&!g.checkpoint.scoring.winner).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]??null;}
 save(checkpoint:MatchCheckpoint,court:CourtLocation){
  const games=this.list(),previous=games.find(g=>g.checkpoint.matchId===checkpoint.matchId);
  const game:OpenPlayGame={checkpoint:parseCheckpoint(checkpoint),court,updatedAt:new Date().toISOString(),archived:previous?.archived??false,ended:previous?.ended??false};
  this.write([game,...games.filter(g=>g.checkpoint.matchId!==checkpoint.matchId)]);
 }
 archive(id:string,archived:boolean){this.change(id,g=>({...g,archived}));}
 end(id:string){this.change(id,g=>({...g,ended:true,updatedAt:new Date().toISOString()}));}
 private change(id:string,change:(game:OpenPlayGame)=>OpenPlayGame){const games=this.list();if(!games.some(g=>g.checkpoint.matchId===id))throw new Error('Saved game not found.');this.write(games.map(g=>g.checkpoint.matchId===id?change(g):g));}
 private write(games:OpenPlayGame[]){try{this.storage.setItem(this.key,JSON.stringify(games));}catch{throw new Error('Could not save your game on this device. Free browser storage and try again.');}}
}
