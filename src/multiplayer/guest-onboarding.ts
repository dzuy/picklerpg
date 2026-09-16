import {COURT} from '../engine/model';
import type {PublicMatch} from './protocol';
import type {TargetPoint} from '../target-picker';
export type GuestStep='serve'|'wait'|'third';
/** Derive progress from committed gameplay, so reloads and failed submissions cannot advance it. */
export function guestStep(s:PublicMatch|null,guest:boolean):GuestStep|null{
 if(!guest||!s||s.friendState!=='accepted'||s.viewerTeam!=='away'||s.status!=='active'||s.pointIndex!==0||s.version>2)return null;
 if(s.version===0&&s.serving&&s.currentTeam===s.viewerTeam)return 'serve';
 if(s.version===1&&s.currentTeam!==s.viewerTeam&&!s.result)return 'wait';
 if(s.version===2&&s.currentTeam===s.viewerTeam&&!s.serving&&!s.result)return 'third';
 return null;
}
export function guestTargetArea(s:PublicMatch,step:GuestStep){
 const side=s.viewerTeam==='home'?-1:1;
 const server=s.display.players.find(p=>p.id===s.server)!;
 const x=step==='serve'?-Math.sign(server.position.x):0;
 return {minX:x>0?0:-COURT.width/2,maxX:x<0?0:COURT.width/2,
  minZ:side>0?(step==='serve'?COURT.kitchen:0):-COURT.length/2,
  maxZ:side>0?COURT.length/2:-(step==='serve'?COURT.kitchen:0)};
}
export function guestTargetAllowed(s:PublicMatch,step:GuestStep|null,point:TargetPoint){
 if(step!=='serve')return true;
 const a=guestTargetArea(s,step);
 return !point.playerId&&point.x>a.minX&&point.x<a.maxX&&point.z>a.minZ&&point.z<a.maxZ;
}
