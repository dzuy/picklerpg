import type {PlayerId,PointResult,RallyShot} from './engine/model';

export function describePointResult(result:PointResult,shot:RallyShot,name:(id:PlayerId)=>string){
 const hitter=name(shot.actor);
 const player=result.playerId??(result.reason==='net'||result.reason==='out'?shot.actor:result.reason==='body-hit'&&shot.intent.target.kind==='player'?shot.intent.target.playerId:shot.resolution?.receiver);
 const who=player?name(player):null;
 let title:string;
 switch(result.reason){
  case 'net':title=`${who??hitter} hit the net!`;break;
  case 'out':title=shot.intent.type==='serve'?`${who??hitter} served outside the service box!`:`${who??hitter} hit it out!`;break;
  case 'body-hit':title=who?shot.intent.type==='serve'?`${who} got hit by the serve!`:`${who} got body bagged!`:`${hitter} landed a body serve!`;break;
  case 'missed-swing':title=who?`${who} swung and missed!`:'The swing missed the ball!';break;
  case 'failed-return':title=who?`${who} missed the ball!`:`${hitter}'s shot went unreturned!`;break;
  case 'double-bounce':title=who?`${who} couldn't reach it before the second bounce!`:'The ball bounced twice!';break;
  default:title=who?`${who} couldn't reach the ball!`:`${hitter} hit a winner!`;
 }
 return {title,detail:result.winner==='home'?'Your team wins the rally.':'Opponents win the rally.'};
}
