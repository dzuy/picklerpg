import {assessChoice} from '../shot-assessment';
import {sameShotIntent} from '../engine/shot-intent';
import {isOpposingTarget} from '../engine/controllers';
import type {TargetChoice,TargetingSource,TargetPoint} from '../target-picker';
import type {RemoteSession} from './match-session';

/** Retain the server's shot and reception timing; only replace its aim. */
export function remoteTargeting(current:()=>RemoteSession|null,beforePlay:()=>void,onError:(message:string)=>void,canPlay:()=>boolean=()=>true,canTarget:(point:TargetPoint)=>boolean=()=>true):TargetingSource {
 return {
  get incoming(){return current()?.state?.incomingShotLabel??null},
  get team(){return current()?.state?.viewerTeam??null},
  get choices(){return current()?.state?.choices??[]},
  get context(){return current()},
  get decision(){return current()?.state?.decisionId??''},
  get enabled(){const s=current();return canPlay()&&!!s?.state&&s.state.status==='active'&&s.state.currentTeam===s.state.viewerTeam&&!s.busy&&!s.pending&&!s.offline},
  aim:beforePlay,
  assess:(choice,point)=>assessChoice(choice,point,current()?.state?.assessmentContacts??[]),
  async describe(text,point,signal){
   if(!this.enabled)throw Error('Wait for your turn.');
   if(!isOpposingTarget(point,this.team!))throw Error('Aim on the opposing side of the net.');
   beforePlay();await current()!.describe(text,point,signal);
  },
  validate(choice,point){
   const s=current()?.state;
   if(!this.enabled||!s||!s.choices.some(c=>c.timing===choice.timing&&sameShotIntent(c.intent,choice.intent)))throw Error('That shot is no longer available. Tap the court again.');
   if(!canTarget(point))throw Error('Tap in the highlighted box to serve.');
   if(!isOpposingTarget(point,s.viewerTeam))throw Error('Aim on the opposing side of the net.');
   if(point.playerId&&!s.display.players.some(p=>p.id===point.playerId&&p.team!==s.viewerTeam))throw Error('Choose an opposing player.');
  },
  play(choice,point){
   this.validate(choice,point);
   const selected:TargetChoice={...choice,intent:{...choice.intent,target:choice.intent.type==='serve'&&point.playerId?{kind:'player',playerId:point.playerId,aim:'body'}:{kind:'point',x:point.x,z:point.z}}};
   beforePlay();void current()!.submit(selected).catch(e=>onError((e as Error).message));
  },
 };
}
