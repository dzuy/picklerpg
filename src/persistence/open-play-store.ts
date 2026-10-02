import type {PlayedShot} from './gameplay-record';
import {recordGameAnalysis,type GameAnalysis} from './game-analysis';
import {parseCheckpoint,type MatchCheckpoint} from '../engine/checkpoint';
import {type CourtLocation,isCourtLocation} from '../locations';
import type {MatchStorage} from './local-match-store';
export interface OpenPlayGame {checkpoint:MatchCheckpoint;court:CourtLocation;updatedAt:string;archived:boolean;ended:boolean;analysis?:GameAnalysis}
type GameEntry={id:string;updatedAt:string;archived:boolean;ended:boolean;finished:boolean};
interface GameIndex {version:2;games:GameEntry[]}
/** Per-game payloads keep historical telemetry off the active checkpoint write path. */
export class OpenPlayStore {
 readonly key:string;
 constructor(private storage:MatchStorage,private owner:string){this.key=`pickle-open-play-v1:${owner}`;}
 private gameKey(id:string){return `${this.key}:game:${id}`;}
 private decode(value:unknown):OpenPlayGame{
  const game=value as OpenPlayGame;
  if(!game||!isCourtLocation(game.court)||typeof game.archived!=='boolean'||typeof game.ended!=='boolean'||typeof game.updatedAt!=='string')throw Error('Your saved game could not be read.');
  return {...game,checkpoint:parseCheckpoint(game.checkpoint)};
 }
 private entry(game:OpenPlayGame):GameEntry{return {id:game.checkpoint.matchId,updatedAt:game.updatedAt,archived:game.archived,ended:game.ended,finished:!!game.checkpoint.scoring.winner};}
 private index():GameIndex{
  const raw=this.storage.getItem(this.key);
  if(raw!==null){
   const value=JSON.parse(raw);
   if(Array.isArray(value))return this.migrate(value.map(g=>this.decode(g)));
   if(value?.version!==2||!Array.isArray(value.games)||value.games.some((g:GameEntry)=>typeof g.id!=='string'||typeof g.updatedAt!=='string'||typeof g.archived!=='boolean'||typeof g.ended!=='boolean'||typeof g.finished!=='boolean'))throw Error('Your saved games could not be read.');
   return value;
  }
  const legacy=this.storage.getItem(`pickle-rpg-match-v1:${this.owner}`);
  if(!legacy)return {version:2,games:[]};
  const savedCourt=this.storage.getItem('picklebash-location-v1');
  return this.migrate([{checkpoint:parseCheckpoint(JSON.parse(legacy)),court:isCourtLocation(savedCourt)?savedCourt:'forest',updatedAt:new Date().toISOString(),archived:false,ended:false}]);
 }
 private migrate(games:OpenPlayGame[]):GameIndex{
  const index:GameIndex={version:2,games:games.map(g=>this.entry(g))};
  // Commit the index only after all payloads succeed. Old array/single-save remains recoverable on failure.
  for(const game of games)this.write(this.gameKey(game.checkpoint.matchId),game);
  this.write(this.key,index);return index;
 }
 private readGame(id:string){const raw=this.storage.getItem(this.gameKey(id));if(raw===null)throw Error('A saved game is missing. Its catalogue has been kept for recovery.');const game=this.decode(JSON.parse(raw));if(game.checkpoint.matchId!==id)throw Error('Saved game identity does not match.');return game;}
 list():OpenPlayGame[]{return this.index().games.map(g=>this.readGame(g.id));}
 load(id?:string){const index=this.index();const entry=id?index.games.find(g=>g.id===id):index.games.filter(g=>!g.archived&&!g.ended&&!g.finished).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];return entry?this.readGame(entry.id):null;}
 save(checkpoint:MatchCheckpoint,court:CourtLocation,played:PlayedShot[]=[]){
  const index=this.index(),previous=index.games.some(g=>g.id===checkpoint.matchId)?this.readGame(checkpoint.matchId):null;
  const game:OpenPlayGame={checkpoint:parseCheckpoint(checkpoint),court,updatedAt:new Date().toISOString(),archived:previous?.archived??false,ended:previous?.ended??false,analysis:recordGameAnalysis(previous?.analysis,checkpoint,played)};
  if(game.analysis){const point=game.analysis.points.find(p=>p.index===checkpoint.pointIndex);if(point?.telemetry)point.telemetry.court=court;}
  this.commit(index,game);
 }
 archive(id:string,archived:boolean){this.change(id,g=>({...g,archived}));}
 end(id:string){this.change(id,g=>{const record=g.analysis?.points.at(-1)?.telemetry;if(record)record.endedEarly=true;return {...g,ended:true,updatedAt:new Date().toISOString()}});}
 private change(id:string,change:(game:OpenPlayGame)=>OpenPlayGame){const index=this.index();if(!index.games.some(g=>g.id===id))throw Error('Saved game not found.');this.commit(index,change(this.readGame(id)));}
 private commit(index:GameIndex,game:OpenPlayGame){this.write(this.gameKey(game.checkpoint.matchId),game);this.write(this.key,{version:2,games:[this.entry(game),...index.games.filter(g=>g.id!==game.checkpoint.matchId)]});}
 private write(key:string,value:unknown){try{this.storage.setItem(key,JSON.stringify(value));}catch{throw new Error('Could not save your game on this device. Free browser storage and try again.');}}
}
