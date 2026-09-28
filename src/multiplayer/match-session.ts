import {shotCommentary} from '../shot-commentary';
import {interpretShot} from '../shot-description';
import {playerId} from '../player-design';
import {RemoteError} from './api';
import type {ActionReceipt,PublicMatch,RemoteAction} from './protocol';
export interface Credentials {owner:string;token:string}
export type Transport=<T>(token:string,path:string,body?:unknown)=>Promise<T>;
/** Client cache and retry identities only. No local Match, scoring, or resolution. */
export class RemoteSession {
 state:PublicMatch|null=null;busy=false;offline=false;message='';pending:RemoteAction|null=null;
 selectionCommentary:{version:number;text:string}|null=null;
 private pendingCommentary='';
 private retryTimer:ReturnType<typeof setTimeout>|undefined;
 private generation=0;
 private refreshTask:Promise<void>|null=null;
 constructor(readonly owner:string,readonly matchId:string,private credentials:()=>Promise<Credentials>,private request:Transport,private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,private changed:()=>void=()=>{}){
  try{const value=JSON.parse(storage.getItem(this.cacheKey)??'null');if(value?.id===matchId&&Number.isSafeInteger(value.version)){this.state=value;this.offline=true;}}catch{}
  const raw=storage.getItem(this.pendingKey);if(raw){try{this.pending=JSON.parse(raw);if(!this.pending?.actionId)throw new Error();}catch{throw new Error('The saved turn could not be read. It has been kept for recovery.');}}
 }
 private get cacheKey(){return `pickle-remote:${this.owner}:${this.matchId}:cache`}
 private get pendingKey(){return `pickle-remote:${this.owner}:${this.matchId}:pending`}
 private async identity(){const c=await this.credentials();if(c.owner!==this.owner){this.generation++;this.state=null;throw new Error('Account changed. Reopen remote play using the original account.');}return c;}
 private accept(state:PublicMatch){if(state.id!==this.matchId)throw new Error('Unexpected remote match.');if(!this.state||state.version>=this.state.version){this.state=state;try{this.storage.setItem(this.cacheKey,JSON.stringify(state))}catch{}}}
 refresh():Promise<void>{
  if(this.refreshTask)return this.refreshTask;
  const generation=this.generation;
  this.refreshTask=(async()=>{
   try{const c=await this.identity();const state=await this.request<PublicMatch>(c.token,`/api/matches/${this.matchId}`);await this.identity();if(generation!==this.generation)return;this.accept(state);this.offline=false;if(!this.pending)this.message='';}
   catch(e){if(generation!==this.generation)return;if(e instanceof RemoteError&&e.status===429)return;this.offline=true;this.message=(e as Error).message;if(e instanceof RemoteError&&[401,403,404].includes(e.status)){this.state=null;try{this.storage.removeItem(this.cacheKey)}catch{}}}finally{this.changed();}
  })().finally(()=>{this.refreshTask=null;});
  return this.refreshTask;
 }
 async describe(text:string,point:{x:number;z:number},signal:AbortSignal){
  const state=this.state,generation=this.generation;
  if(!state||this.busy||this.pending||this.offline||state.status!=='active'||state.currentTeam!==state.viewerTeam)throw Error('Wait for your turn.');
  const ensureCurrent=()=>{signal.throwIfAborted();if(generation!==this.generation||this.state?.version!==state.version||this.busy||this.pending||this.offline)throw Error('The decision changed. Choose a shot again.');};
  const parsed=await interpretShot(text,{selectedTarget:point,opening:state.serving?'serve':state.display.bounces<2?'return':'rally',players:state.display.players,actingTeam:state.viewerTeam,roster:state.display.players.map(player=>({id:player.id,name:state.roster[player.id].name,team:player.team})),ball:state.display.ball},signal);
  ensureCurrent();const c=await this.identity();ensureCurrent();
  const choice=await this.request<PublicMatch['choices'][number]>(c.token,`/api/matches/${this.matchId}/describe-shot`,{expectedVersion:state.version,decisionId:state.decisionId,command:text,parsed,point});
  ensureCurrent();await this.submit(choice,signal);
  if(this.message)throw Error(this.message);
 }
 async submit(choice:PublicMatch['choices'][number],signal?:AbortSignal){
  signal?.throwIfAborted();
  if(this.busy||this.pending)throw new Error('Resolve your saved turn before choosing another shot.');
  if(!this.state||this.offline||this.state.currentTeam!==this.state.viewerTeam||this.state.status!=='active')throw new Error('Wait for a current, legal turn.');
  const selectedState=this.state,generation=this.generation;
  this.busy=true;this.changed();
  try{await this.identity();signal?.throwIfAborted();
  if(generation!==this.generation||this.state?.version!==selectedState.version)throw new Error('The decision changed. Choose a shot again.');
  const action:RemoteAction={actionId:playerId(),expectedVersion:selectedState.version,decisionId:selectedState.decisionId,action:{kind:'play_shot',intent:structuredClone(choice.intent),...(choice.timing?{timing:choice.timing}:{})}};
  this.storage.setItem(this.pendingKey,JSON.stringify(action));this.pending=action;
  this.pendingCommentary=shotCommentary(choice.intent,Object.fromEntries(Object.entries(selectedState.roster).map(([id,player])=>[id,player.name])));
  }finally{this.busy=false;this.changed();}
  await this.retry();
 }
 async retry(){
  if(this.busy||!this.pending)return;clearTimeout(this.retryTimer);this.retryTimer=undefined;this.busy=true;this.changed();const generation=this.generation;let confirmed=false;
  try{const c=await this.identity();const r=await this.request<ActionReceipt>(c.token,`/api/matches/${this.matchId}/actions`,this.pending);await this.identity();if(generation!==this.generation)return;
   if(r.actionId!==this.pending.actionId)throw new Error('Unexpected turn receipt. Retry your saved turn.');
   this.selectionCommentary=this.pendingCommentary?{version:r.state.version,text:this.pendingCommentary}:null;this.pendingCommentary='';
   this.accept(r.state);this.storage.removeItem(this.pendingKey);this.pending=null;this.offline=false;this.message='';
   confirmed=true;
  }catch(e){this.message=(e as Error).message;
   if(e instanceof RemoteError&&[400,403,404,409].includes(e.status)&&e.code!=='unsupported_engine'){this.storage.removeItem(this.pendingKey);this.pending=null;const message=this.message;await this.refresh();this.message=message;}
   else {this.offline=true;
    if(e instanceof RemoteError&&e.status===429&&this.pending&&generation===this.generation){
     this.message='Your turn is saved. Retrying shortly…';
     this.retryTimer=setTimeout(()=>{if(generation===this.generation)void this.retry();},(Math.max(1,e.retryAfter||5)*1000)+250);
    }
   }
  }finally{this.busy=false;this.changed();}
  // Publish the authoritative receipt immediately so playback can start.
  // Reconciliation must not hold the shot animation or submission open.
  if(confirmed&&generation===this.generation)void this.refresh();
 }
 dispose(){this.generation++;clearTimeout(this.retryTimer);}
}
