/** A consumed attempt stays consumed, including after cancellation or a reload. */
export class RematchCountdown {
 remaining:number|null=null;
 revision=0;
 private deadline=0;
 private handle:ReturnType<typeof setTimeout>|undefined;
 constructor(private storage:Pick<Storage,'getItem'|'setItem'>,private active:()=>boolean,private changed:()=>void,private expired:()=>void,private now=()=>performance.now()){}
 start(key:string){
  this.cancel();
  try{if(this.storage.getItem(key))return;this.storage.setItem(key,'1');}catch{return;}
  if(!this.active())return;
  this.deadline=this.now()+10000;this.remaining=10;this.changed();this.schedule();
 }
 cancel(){this.revision++;clearTimeout(this.handle);this.handle=undefined;const had=this.remaining!==null;this.remaining=null;if(had)this.changed();}
 tick(){
  if(this.remaining===null)return;
  if(!this.active()){this.cancel();return;}
  const left=this.deadline-this.now();
  if(left<=0){this.cancel();this.expired();return;}
  const next=Math.ceil(left/1000);if(next!==this.remaining){this.remaining=next;this.changed();}
  this.schedule();
 }
 private schedule(){clearTimeout(this.handle);this.handle=setTimeout(()=>this.tick(),Math.max(1,Math.min(100,this.deadline-this.now())));}
}
