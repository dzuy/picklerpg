import {Analytics} from '../analytics';
import type {Credentials,Transport} from './match-session';
import type {RematchStatus} from './rematch-protocol';
/** Shared server invitation owns persistence. This controller only manages one screen. */
export class RematchFlow {
 source='';owner='';busy=false;message='';status:RematchStatus={invitationId:null,matchId:null,requesterId:null,status:'none'};
 private generation=0;private revision=0;private reading=false;private wantsJoin=false;
 constructor(private credentials:()=>Promise<Credentials>,private request:Transport,private changed:()=>void,private enter:(id:string)=>Promise<void>){}
 reset(source='',owner=''){this.generation++;this.revision++;this.reading=false;this.busy=false;this.wantsJoin=false;this.source=source;this.owner=owner;this.message='';this.status={invitationId:null,matchId:null,requesterId:null,status:'none'};this.changed();}
 get waiting(){return this.status.status==='pending'&&this.status.requesterId===this.owner;}
 get closed(){return ['declined','cancelled','deleted'].includes(this.status.status);}
 async refresh(){
  if(!this.source||this.reading||this.busy)return;
  const generation=this.generation,revision=this.revision;this.reading=true;
  try{const c=await this.credentials();if(c.owner!==this.owner)throw Error('Account changed. Reopen your game.');
   const value=await this.request<RematchStatus>(c.token,`/api/matches/${this.source}/rematch`);
   const after=await this.credentials();if(generation!==this.generation||revision!==this.revision||after.owner!==this.owner)return;
   this.status=value;this.message='';if(value.status==='pending'&&value.requesterId!==this.owner)Analytics.track('rematch_request_received',{original_match_id:this.source,opponent_id:value.requesterId??undefined,manual_vs_auto:value.automaticRequest?'automatic':'manual'},value.invitationId??this.source);if(this.waiting)this.wantsJoin=true;
   if(this.closed)this.message=value.status==='declined'?'Your opponent declined the rematch.':'This rematch is closed.';
   if(value.status==='accepted'&&value.matchId&&this.wantsJoin){this.wantsJoin=false;await this.enter(value.matchId);}
  }catch(e){if(generation===this.generation&&revision===this.revision)this.message=(e as Error).message;}
  finally{if(generation===this.generation){this.reading=false;this.changed();}}
 }
 async decline(){
  if(!this.source||this.busy||this.status.status!=='pending'||this.waiting)return;
  const generation=this.generation,id=this.status.invitationId;this.revision++;this.busy=true;this.changed();
  try{const c=await this.credentials();if(generation!==this.generation||c.owner!==this.owner)return;
   await this.request(c.token,`/api/invitations/${id}/decline`,{});
   if(generation===this.generation){this.status={...this.status,status:'declined'};this.wantsJoin=false;this.message='Maybe next time.';}
  }catch(e){if(generation===this.generation)this.message=(e as Error).message;}
  finally{if(generation===this.generation){this.busy=false;this.changed();}}
 }
 async submit(intent:'manual'|'automatic'|'accept'='manual',active:()=>boolean=()=>true){
  if(!this.source||this.busy||(this.waiting&&!this.status.automaticRequest)||this.closed||(intent==='automatic'&&this.status.status!=='none'))return;
  const generation=this.generation;this.revision++;this.busy=true;this.message='';this.wantsJoin=true;this.changed();
  try{const c=await this.credentials();if(c.owner!==this.owner)throw Error('Account changed. Reopen your game.');
   if(generation!==this.generation||!active())return;
   const value=await this.request<{invitationId:string;matchId:string|null;requesterId?:string;automaticRequest?:boolean}>(c.token,`/api/matches/${this.source}/rematch`,{intent});
   const after=await this.credentials();if(generation!==this.generation||after.owner!==this.owner)return;
   this.status={...value,requesterId:value.requesterId??this.owner,status:value.matchId?'accepted':'pending'};
   if(value.matchId&&active()){this.wantsJoin=false;await this.enter(value.matchId);}
  }catch(e){if(generation===this.generation)this.message=(e as Error).message;}
  finally{if(generation===this.generation){this.busy=false;this.changed();}}
 }
}
