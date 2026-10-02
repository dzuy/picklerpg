import {playerId,validatePlayer,type DesignedPlayer,type PlayerLibrary} from './player-design';
import type {LibraryChange} from './cloud-players';
export interface RosterOperation {id:string;queuedAt:number;change:LibraryChange;player?:DesignedPlayer;activeId:string|null}
let lastTime=0;
/** One key per operation: acknowledgements cannot erase another tab's queued work. */
export class RosterOutbox {
 private prefix:string;
 constructor(private storage:Storage,owner:string){this.prefix=`pickle-roster-outbox-v1:${owner}:`;}
 enqueue(library:PlayerLibrary,change:LibraryChange){
  const player=change.kind==='save'?library.players.find(p=>p.id===change.playerId):undefined;
  if(change.kind==='save'&&!player)throw Error('Your edited player could not be found. Save again.');
  const op:RosterOperation={id:playerId(),queuedAt:lastTime=Math.max(Date.now(),lastTime+1),change,activeId:library.activeId,...(player?{player:validatePlayer(player)}:{})};
  this.storage.setItem(this.prefix+op.id,JSON.stringify(op));return op;
 }
 pending(){
  const entries:RosterOperation[]=[];
  for(let i=0;i<this.storage.length;i++){
   const key=this.storage.key(i);if(!key?.startsWith(this.prefix))continue;
   const raw=this.storage.getItem(key);if(raw===null)continue;
   const op=JSON.parse(raw) as RosterOperation;
   if(!op||key!==this.prefix+op.id||!Number.isFinite(op.queuedAt)||!['save','delete'].includes(op.change?.kind)||typeof op.change.playerId!=='string'||!(op.activeId===null||typeof op.activeId==='string'))throw Error('Pending player changes could not be read. They have been kept for recovery.');
   if(op.change.kind==='save'){op.player=validatePlayer(op.player);if(op.player.id!==op.change.playerId)throw Error('Invalid pending player change.');}
   entries.push(op);
  }
  return entries.sort((a,b)=>a.queuedAt-b.queuedAt||a.id.localeCompare(b.id));
 }
 adopt(op:RosterOperation){this.storage.setItem(this.prefix+op.id,JSON.stringify(op));}
 acknowledge(op:RosterOperation){this.storage.removeItem(this.prefix+op.id);}
}
