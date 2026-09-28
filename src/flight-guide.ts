import type {FlightLeg,Vec3} from './engine/model';
import {sampleLeg} from './engine/rally-engine';

/** Trace only completed flight, ending exactly at the current ball position. */
export function flightGuidePoints(legs:FlightLeg[],cursor?:{legIndex:number;elapsed:number}):Vec3[]{
 const points:Vec3[]=[];
 for(let index=0;index<legs.length;index++){
  if(cursor&&index>cursor.legIndex)break;
  const leg=legs[index];
  const progress=cursor&&index===cursor.legIndex?Math.max(0,Math.min(1,cursor.elapsed/leg.duration)):1;
  if(index===0)points.push(sampleLeg(leg,0));
  for(let step=1;step/40<progress;step++)points.push(sampleLeg(leg,step/40));
  if(progress>0)points.push(sampleLeg(leg,progress));
 }
 return points;
}
