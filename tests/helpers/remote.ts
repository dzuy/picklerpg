import {randomUUID} from 'node:crypto';
import {newPlayer} from '../../src/player-design';
import {SLOTS} from '../../src/engine/checkpoint';
import type {CreateRemoteMatch,PublicMatch,RemoteAction} from '../../src/multiplayer/protocol';
import {conflict,missing} from '../../server/multiplayer/errors';
import type {CommitInput,MatchRepository,StoredMatch,StoredReceipt} from '../../server/multiplayer/repository';
export const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
export const testers=new Map([[A,'A'],[B,'B']]);
export function creation():CreateRemoteMatch{return {creationId:randomUUID(),opponentId:B,scoring:'rally-doubles',roster:Object.fromEntries(SLOTS.map(id=>[id,newPlayer(id)])) as CreateRemoteMatch['roster']};}
export function action(s:PublicMatch,i=0):RemoteAction{return {actionId:randomUUID(),expectedVersion:s.version,decisionId:s.decisionId,action:{kind:'play_shot',...s.choices[i%s.choices.length]}};}
export class MemoryRepository implements MatchRepository {
 async setArchived(id:string,actor:string,archived:boolean){const row=this.rows.get(id);if(!row||![row.home_user_id,row.away_user_id].includes(actor))throw missing();if(row.home_user_id===actor)row.archived_home=archived;else row.archived_away=archived;}
 rows=new Map<string,StoredMatch>();receipts=new Map<string,StoredReceipt>();
 async get(id:string,actor:string){const r=this.rows.get(id);return r&&[r.home_user_id,r.away_user_id].includes(actor)?structuredClone(r):null;}
 async list(actor:string){return [...this.rows.values()].filter(r=>[r.home_user_id,r.away_user_id].includes(actor)).map(r=>structuredClone(r));}
 async receipt(id:string,actionId:string){return structuredClone(this.receipts.get(`${id}:${actionId}`)??null);}
 async create(row:StoredMatch){const old=[...this.rows.values()].find(r=>r.home_user_id===row.home_user_id&&r.creation_request_id===row.creation_request_id);if(old){if(old.creation_hash!==row.creation_hash)throw conflict();return structuredClone(old);}this.rows.set(row.id,structuredClone(row));return structuredClone(row);}
 async commit(input:CommitInput){
  const old=this.receipts.get(`${input.match.id}:${input.actionId}`);if(old){if(old.actor_id!==input.actor||old.request_hash!==input.hash)throw conflict();return structuredClone(old);}
  const row=this.rows.get(input.match.id);if(!row)throw missing();if(row.version!==input.expectedVersion)throw conflict();
  const r:StoredReceipt={match_id:row.id,action_id:input.actionId,actor_id:input.actor,request_hash:input.hash,from_version:row.version,to_version:row.version+1,checkpoint:input.match.checkpoint,result:{status:input.match.status,current_action_user_id:input.match.current_action_user_id,animation:input.match.animation,last_result:input.match.last_result}};
  this.rows.set(row.id,structuredClone({...input.match,version:r.to_version}));this.receipts.set(`${row.id}:${input.actionId}`,structuredClone(r));return structuredClone(r);
 }
}
