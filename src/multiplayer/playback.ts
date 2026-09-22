import {samplePlayerJump} from '../engine/erne';
import type {PointResult,Vec3} from '../engine/model';
import {BODY_HIT_REACTION_SECONDS,type ReplayBodyHit} from '../body-hit-reaction';
import type {TurnAnimation} from './protocol';
function lerp(a:Vec3,b:Vec3,t:number):Vec3{if(t===0)return {...a};if(t===1)return {...b};return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}
export function playbackDuration(segment:TurnAnimation){return segment.duration}
export function replayOutcome(segments:TurnAnimation[],result:PointResult|null,time:number){
 const contact=segments.reduce((sum,segment)=>sum+playbackDuration(segment),0);
 const last=segments.at(-1),hit=!!last&&result?.reason==='body-hit'&&!!result.playerId;
 const age=time-contact;
 const bodyHit:ReplayBodyHit|null=hit&&age>=0&&age<BODY_HIT_REACTION_SECONDS?{player:result.playerId!,height:last!.path.at(-1)!.y,age}:null;
 return {duration:contact+(hit?BODY_HIT_REACTION_SECONDS:0),bodyHit};
}
/** A network receipt can arrive after the timestamp of an already scheduled frame. */
export function samplePlayback(segment:TurnAnimation,elapsedMs:number){
 const progress=Math.max(0,Math.min(1,elapsedMs/(playbackDuration(segment)*1000))),i=progress*(segment.path.length-1),index=Math.min(segment.path.length-2,Math.floor(i));
 let pointIndex=index,fraction=i-index;
 if(segment.pathTimes){const time=progress*segment.duration,times=segment.pathTimes;pointIndex=Math.max(0,times.findIndex((end,j)=>j>0&&time<=end)-1);if(time>=times[times.length-1])pointIndex=times.length-2;fraction=progress===1?1:(time-times[pointIndex])/(times[pointIndex+1]-times[pointIndex]);}
 return {progress,position:lerp(segment.path[pointIndex],segment.path[pointIndex+1],fraction),players:segment.from.map(p=>({...p,position:segment.jump?.playerId===p.id?samplePlayerJump(segment.jump,progress*segment.duration):lerp(p.position,segment.to.find(q=>q.id===p.id)!.position,p.id===segment.actor&&segment.recoveryDelay?Math.max(0,Math.min(1,(progress*segment.duration-segment.recoveryDelay)/Math.max(.001,segment.duration-segment.recoveryDelay))):progress)}))};
}
