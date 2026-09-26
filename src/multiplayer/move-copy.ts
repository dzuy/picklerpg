import {shotCommentary} from '../shot-commentary';
import type {PointResult} from '../engine/model';
import type {PublicMatch} from './protocol';

const outcomes:Record<PointResult['reason'],string>={
 'body-hit':'The ball hits a player',
 winner:'The shot is a winner',
 net:'The shot hits the net',
 out:'The shot lands out',
 'double-bounce':'The ball bounces twice',
 'missed-swing':'The player misses the ball',
 'failed-return':'The serve is not returned',
 'unreturned-attack':'The attack is not returned',
};

export function moveCopy(s:PublicMatch):string{
 const last=s.animation.at(-1);
 if(!last)return 'Waiting for the serve';
 if(s.result){
  if(s.result.reason==='body-hit'&&s.result.playerId)return `The ball hits ${s.roster[s.result.playerId]?.name??'a player'}`;
  return outcomes[s.result.reason];
 }
 return shotCommentary(last.intent,Object.fromEntries(Object.entries(s.roster).map(([id,player])=>[id,player.name])));
}
