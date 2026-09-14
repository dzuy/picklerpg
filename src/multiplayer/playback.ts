import type {Vec3} from '../engine/model';
import type {TurnAnimation} from './protocol';
function lerp(a:Vec3,b:Vec3,t:number):Vec3{if(t===0)return {...a};if(t===1)return {...b};return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}
/** A network receipt can arrive after the timestamp of an already scheduled frame. */
export function samplePlayback(segment:TurnAnimation,elapsedMs:number){
 const progress=Math.max(0,Math.min(1,elapsedMs/(segment.duration*1000))),i=progress*(segment.path.length-1),index=Math.min(segment.path.length-2,Math.floor(i));
 return {progress,position:lerp(segment.path[index],segment.path[index+1],i-index),players:segment.from.map(p=>({...p,position:lerp(p.position,segment.to.find(q=>q.id===p.id)!.position,progress)}))};
}
