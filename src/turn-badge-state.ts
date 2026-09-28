/** Keep counts account-scoped and ignore responses superseded by a newer refresh. */
export class TurnBadgeState {
 count=0;
 private owner:string|null=null;
 private revision=0;
 constructor(private load:(owner:string)=>Promise<number>,private changed:(count:number)=>void){}
 identify(owner:string|null){if(owner===this.owner)return;this.owner=owner;this.revision++;this.count=0;this.changed(0);}
 async refresh(){
  const owner=this.owner;if(!owner)return;
  const revision=++this.revision;
  try{const count=await this.load(owner);if(revision!==this.revision||owner!==this.owner)return;
   if(!Number.isSafeInteger(count)||count<0)return;
   this.count=count;this.changed(count);
  }catch{/* Keep the last confirmed count while offline. */}
 }
}
