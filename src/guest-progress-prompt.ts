export const GUEST_PROGRESS_POINT_THRESHOLD=3;
/** Friends checkpoints already advance to the next point; solo stays on the result. */
export function completedPointsForPrompt(mode:'solo'|'friends',pointIndex:number,pointComplete=false){
 return pointIndex+(mode==='solo'&&pointComplete?1:0);
}
export interface GuestProgressMoment {
 ios:boolean;guest:boolean;owner:string|null;completedPoints:number;safe:boolean;finished:boolean;
}
export function canPromptForProgress(moment:GuestProgressMoment){
 return moment.ios&&moment.guest&&!!moment.owner&&moment.completedPoints>=GUEST_PROGRESS_POINT_THRESHOLD&&moment.safe&&!moment.finished;
}
/** A single offer per guest identity, shared across solo/friends games and app restarts. */
export class GuestProgressPrompt {
 active=false;
 constructor(private storage:Pick<Storage,'getItem'|'setItem'>){}
 async offer(moment:()=>GuestProgressMoment,open:(canOpen:()=>boolean,onShown:()=>void)=>Promise<unknown>,failed:(error:unknown)=>void=console.warn){
  const initial=moment(),key=`pickle-save-progress-offered:${initial.owner}`;
  if(this.active||!canPromptForProgress(initial)||this.storage.getItem(key)==='1')return;
  this.active=true;
  try{
   await open(()=>{const current=moment();return current.owner===initial.owner&&canPromptForProgress(current)&&this.storage.getItem(key)!=='1';},()=>this.storage.setItem(key,'1'));
  }catch(error){this.storage.setItem(key,'1');failed(error);}
  finally{this.active=false;}
 }
}
