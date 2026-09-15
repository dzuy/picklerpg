import {isSpeedUp} from './engine/speed-up';
import type {ShotIntent} from './engine/model';
import {SHOT_FAMILIES} from './engine/shot-families';
import {targetLabel} from './engine/shot-intent';
export function choiceCopy(intent:ShotIntent){
 if(isSpeedUp(intent))return {name:'Speed Up',detail:'Compact topspin attack to change the pace of a dink rally'};
 if(intent.type==='return'){
  if(intent.intendedNetClearance>1)return {name:'Lob',detail:'High, arcing return'};
  if(intent.spin?.vertical==='topspin')return {name:'Topspin',detail:'Dipping topspin return'};
  if(intent.spin?.vertical==='slice')return {name:'Slice',detail:'Underspin return'};
  return {name:'Drive',detail:'Direct, attacking return'};
 }
 if(intent.type==='serve'){
  if(intent.intendedNetClearance>1)return {name:'Lob',detail:'High, arcing serve'};
  if(intent.spin?.vertical==='topspin')return {name:'Topspin',detail:'Dipping topspin'};
  if(intent.spin?.side&&intent.spin.side!=='none')return {name:'Slice',detail:'Sideways curve'};
  if(intent.spin?.vertical==='slice')return {name:'Backspin',detail:'Floating underspin'};
  return intent.pace==='fast'?{name:'Fast',detail:'Quick, direct serve'}:{name:'Slow',detail:'Gentle, slower serve'};
 }
 if(intent.target.kind==='point')return {name:SHOT_FAMILIES[intent.type].name,detail:targetLabel(intent.target)};
 {
  const target=intent.target.kind==='zone'?({'open-court':'open court',crosscourt:'crosscourt',line:'down line',middle:'middle',wide:'wide','far-left':'left','far-right':'right'}[intent.target.zone]):intent.target.aim.replaceAll('-',' ');
  return {name:`${SHOT_FAMILIES[intent.type].name} ${target}`,detail:targetLabel(intent.target)};
 }
}
