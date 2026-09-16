import {remoteRequest} from './api';
import type {Credentials,Transport} from './match-session';
import type {NudgeResult,NudgeStatus} from './nudge-protocol';
export interface NudgeMatch {id:string;version:number;owner:string;waiting:boolean;online:boolean}
export function nudgeCopy(status:NudgeStatus|null){
 if(!status)return {label:'Nudge opponent',hint:'Checking availability…'};
 switch(status.state){
  case 'ready':return {label:'Nudge opponent',hint:status.unlimited?'Testing mode · Nudge as often as you like.':'Send one reminder for this turn.'};
  case 'already_nudged':return {label:'Already nudged',hint:'One nudge per turn.'};
  case 'daily_limit':return {label:'Nudge opponent',hint:'You can nudge this opponent once every 24 hours across all games.'};
  case 'waiting':{
   const minutes=Math.max(1,Math.ceil((Date.parse(status.availableAt??'')-Date.parse(status.serverTime))/60000));
   return {label:'Nudge opponent',hint:`Available in ${Number.isFinite(minutes)?minutes:30} min · Give them 30 minutes to play.`};
  }
  case 'unavailable':return {label:'Nudge opponent',hint:'Nudges are currently unavailable.'};
  default:return {label:'Nudge opponent',hint:'The turn changed. Refreshing the match…'};
 }
}
/** UI state is advisory. Every send is authorized and rate-limited in Postgres. */
export class NudgeControl {
 private button=document.createElement('button');
 private hint=document.createElement('small');
 private match:NudgeMatch|null=null;
 private status:NudgeStatus|null=null;
 private revision=0;
 private busy=false;
 private fetching=false;
 private checkedAt=0;
 private notice='';
 constructor(private host:HTMLElement,private credentials:()=>Promise<Credentials>,private request:Transport=remoteRequest){
  host.className='remote-nudge';host.hidden=true;this.button.type='button';this.hint.setAttribute('aria-live','polite');host.append(this.button,this.hint);
  this.button.onclick=()=>void this.send();
 }
 update(match:NudgeMatch|null){
  const changed=match?.id!==this.match?.id||match?.version!==this.match?.version||match?.owner!==this.match?.owner||match?.waiting!==this.match?.waiting||match?.online!==this.match?.online;
  if(changed){this.revision++;this.status=null;this.checkedAt=0;this.fetching=false;this.busy=false;this.notice='';}
  this.match=match;this.host.hidden=!match?.waiting;
  this.draw();
  if(match?.waiting&&match.online&&!this.fetching&&!this.busy&&Date.now()-this.checkedAt>=5000)void this.refresh();
 }
 private draw(){
  const copy=nudgeCopy(this.status);
  this.button.textContent=this.busy?'Sending…':copy.label;
  this.button.disabled=this.busy||!this.match?.online||this.status?.state!=='ready'||this.status.version!==this.match?.version;
  this.hint.textContent=!this.match?.online?'Reconnect to nudge your opponent.':this.notice||copy.hint;
 }
 private async identity(owner:string){const c=await this.credentials();if(c.owner!==owner)throw Error('Account changed. Reopen the match.');return c;}
 private async refresh(){
  const match=this.match!,revision=this.revision;this.fetching=true;this.checkedAt=Date.now();
  try{const c=await this.identity(match.owner);const status=await this.request<NudgeStatus>(c.token,`/api/matches/${match.id}/nudge`);if(revision!==this.revision)return;this.status=status.version===match.version?status:{...status,state:'stale'};this.notice='';}
  catch{if(revision===this.revision){this.status=null;this.notice='Could not check nudges. We’ll try again shortly.';}}
  finally{if(revision===this.revision){this.fetching=false;this.draw();}}
 }
 private async send(){
  const match=this.match;if(!match||!match.waiting||!match.online||this.busy||this.status?.state!=='ready'||this.status.version!==match.version)return;
  this.busy=true;this.fetching=false;const revision=++this.revision;this.notice='';this.draw();
  try{
   const c=await this.identity(match.owner);if(revision!==this.revision)return;
   const result=await this.request<NudgeResult>(c.token,`/api/matches/${match.id}/nudge`,{expectedVersion:match.version});
   if(revision!==this.revision)return;this.status=result;
   if(result.accepted)this.notice='Nudge requested. Notifications depend on their device settings.';
  }catch(error){if(revision===this.revision){this.status=null;this.notice=(error as Error).message||'Could not send a nudge. Checking its status…';}}
  finally{if(revision===this.revision){this.busy=false;this.checkedAt=Date.now();this.draw();}}
 }
}
