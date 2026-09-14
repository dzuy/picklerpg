import {playerId} from '../player-design';
import {RemoteError} from './api';
import type {ActionReceipt,PublicMatch,RemoteAction} from './protocol';
export interface Credentials {owner:string;token:string}
export type Transport=<T>(token:string,path:string,body?:unknown)=>Promise<T>;
/** Client cache and retry identities only. No local Match, scoring, or resolution. */
export class RemoteSession {
 state:PublicMatch|null=null;busy=false;offline=false;message='';pending:RemoteAction|null=null;
 private generation=0;
 constructor(readonly owner:string,readonly matchId:string,private credentials:()=>Promise<Credentials>,private request:Transport,private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,private changed:()=>void=()=>{}){
  try{const value=JSON.parse(storage.getItem(this.cacheKey)??'null');if(value?.id===matchId&&Number.isSafeInteger(value.version)){this.state=value;this.offline=true;}}catch{}
  const raw=storage.getItem(this.pendingKey);if(raw){try{this.pending=JSON.parse(raw);if(!this.pending?.actionId)throw new Error();}catch{throw new Error('The saved turn could not be read. It has been kept for recovery.');}}
 }
 private get cacheKey(){return `pickle-remote:${this.owner}:${this.matchId}:cache`}
 private get pendingKey(){return `pickle-remote:${this.owner}:${this.matchId}:pending`}
 private async identity(){const c=await this.credentials();if(c.owner!==this.owner){this.generation++;this.state=null;throw new Error('Account changed. Reopen remote play using the original account.');}return c;}
 private accept(state:PublicMatch){if(state.id!==this.matchId)throw new Error('Unexpected remote match.');if(!this.state||state.version>=this.state.version){this.state=state;try{this.storage.setItem(this.cacheKey,JSON.stringify(state))}catch{}}}
 async refresh(){const generation=this.generation;
  try{const c=await this.identity();const state=await this.request<PublicMatch>(c.token,`/api/matches/${this.matchId}`);await this.identity();if(generation!==this.generation)return;this.accept(state);this.offline=false;if(!this.pending)this.message='';}
  catch(e){if(generation!==this.generation)return;this.offline=true;this.message=(e as Error).message;}finally{this.changed();}
 }
 async submit(choice:PublicMatch['choices'][number]){
  if(this.busy||this.pending)throw new Error('Resolve your saved turn before choosing another shot.');
  if(!this.state||this.offline||this.state.currentTeam!==this.state.viewerTeam||this.state.status!=='active')throw new Error('Wait for a current, legal turn.');
  const selectedState=this.state,generation=this.generation;
  this.busy=true;this.changed();
  try{await this.identity();
  if(generation!==this.generation||this.state?.version!==selectedState.version)throw new Error('The decision changed. Choose a shot again.');
  const action:RemoteAction={actionId:playerId(),expectedVersion:selectedState.version,decisionId:selectedState.decisionId,action:{kind:'play_shot',intent:structuredClone(choice.intent),...(choice.timing?{timing:choice.timing}:{})}};
  this.storage.setItem(this.pendingKey,JSON.stringify(action));this.pending=action;
  }finally{this.busy=false;this.changed();}
  await this.retry();
 }
 async retry(){
  if(this.busy||!this.pending)return;this.busy=true;this.changed();const generation=this.generation;
  try{const c=await this.identity();const r=await this.request<ActionReceipt>(c.token,`/api/matches/${this.matchId}/actions`,this.pending);await this.identity();if(generation!==this.generation)return;
   if(r.actionId!==this.pending.actionId)throw new Error('Unexpected turn receipt. Retry your saved turn.');
   this.accept(r.state);this.storage.removeItem(this.pendingKey);this.pending=null;this.offline=false;this.message='';
   await this.refresh();
  }catch(e){this.message=(e as Error).message;
   if(e instanceof RemoteError&&[400,403,404,409].includes(e.status)&&e.code!=='unsupported_engine'){this.storage.removeItem(this.pendingKey);this.pending=null;const message=this.message;await this.refresh();this.message=message;}
   else this.offline=true;
  }finally{this.busy=false;this.changed();}
 }
 dispose(){this.generation++;}
}
