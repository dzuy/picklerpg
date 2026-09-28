import type {OpenPlayStore} from './open-play-store';
import type {GameplayRecord} from './gameplay-record';
import type {MatchStorage} from './local-match-store';

/** Account-scoped acknowledgments; the saved game is the durable outbox. */
export class GameplaySync {
 private busy=false;
 private again=false;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private failures=0;
 private readonly key:string;
 constructor(private store:OpenPlayStore,private storage:MatchStorage,owner:string,private upload:(record:GameplayRecord)=>Promise<void>){this.key=`pickle-gameplay-synced-v1:${owner}`;}
 schedule(delay=2000){if(this.timer)return;this.timer=setTimeout(()=>{this.timer=undefined;void this.flush().catch(()=>{this.failures++;this.schedule(Math.min(60000,2000*2**this.failures));});},delay);}
 async flush(){
  if(this.busy){this.again=true;return;}
  this.busy=true;
  try{
   do{
    this.again=false;
    let ack:Record<string,string>={};try{ack=JSON.parse(this.storage.getItem(this.key)??'{}')}catch{/* Retry rather than discard saved gameplay. */}
    for(const game of this.store.list())for(const point of game.analysis?.points??[]){
     const record=point.telemetry;if(!record)continue;
     const id=`${record.gameId}:${record.pointIndex}`;
     const stamp=JSON.stringify([record.revision,record.events.length,record.complete,record.gameComplete,record.executions.length,record.endedEarly]);
     if(ack[id]===stamp)continue;
     await this.upload(record);
     ack[id]=stamp;this.storage.setItem(this.key,JSON.stringify(ack));
    }
   }while(this.again);
   this.failures=0;
  }finally{this.busy=false;}
 }
}
