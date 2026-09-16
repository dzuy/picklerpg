import type {GameState,Team} from './engine/model';
import type {TurnAnimation} from './multiplayer/protocol';
import type {SoundCue} from './sound';

/** Consume only new events; restored snapshots, resets, and scrubbing stay quiet. */
export class RallySounds {
 private initialized=false;
 private time=0;
 private count=0;
 update(state:GameState,emit:(cue:SoundCue)=>void,team:Team='home',matchWon=false){
  const history=state.rallyHistory;
  const reset=!this.initialized||state.simulationTime<this.time||history.length<this.count;
  this.time=state.simulationTime;this.initialized=true;
  if(reset){this.count=history.length;return;}
  for(const event of history.slice(this.count)){
   if(event.type==='shot')emit('paddle');
   if(event.type==='bounce')emit('bounce');
   if(event.type==='point-end'){
    if(event.result.reason==='net')emit('net');
    emit(event.result.winner===team?(matchWon?'match-win':'point-win'):'point-loss');
   }
  }
  this.count=history.length;
 }
}

/** Remote playback supplies sampled paths, including exact landing vertices. */
export class PlaybackSounds {
 private segment:TurnAnimation|null=null;
 private elapsed=0;
 update(segment:TurnAnimation,progress:number,emit:(cue:SoundCue)=>void){
  if(this.segment!==segment){
   const previous=this.segment,end=previous?.path.at(-1),start=segment.path[0];
   const continuation=previous?.actor===segment.actor&&end&&Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z)<.001;
   this.segment=segment;this.elapsed=-1;if(!continuation)emit('paddle');
  }
  const time=progress*segment.duration;
  segment.path.forEach((point,index)=>{
   if(index===0)return;
   const at=segment.pathTimes?.[index]??index/(segment.path.length-1)*segment.duration;
   if(at>this.elapsed&&at<=time&&point.y<=.06&&segment.path[index-1].y>point.y&&(index===segment.path.length-1||segment.path[index+1].y>point.y))emit('bounce');
  });
  this.elapsed=time;
 }
}
