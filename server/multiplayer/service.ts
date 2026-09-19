import {personalShotMix,shotMixFilter} from './shot-mix';
import {publicStrategy} from '../../src/multiplayer/strategy';
import {publicRivalry} from './rivalries';
import {selectionOpportunity,selectionCapture} from './selection-events';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {Match} from '../../src/match';
import {LOOKS} from '../../src/player-looks';
import {newPlayer} from '../../src/player-design';
import type {TeamSelection} from '../../src/multiplayer/invitation-protocol';
import {randomInt} from 'node:crypto';
import {HUMAN_ENGINE,parseCheckpoint,SLOTS} from '../../src/engine/checkpoint';
import {playerForTeam} from '../../src/engine/controllers';
import {sampleLeg} from '../../src/engine/rally-engine';
import type {Team} from '../../src/engine/model';
import type {ActionReceipt,PublicMatch,TurnAnimation} from '../../src/multiplayer/protocol';
import type {MatchRepository,StoredMatch,StoredReceipt} from './repository';
import {ApiError,conflict,missing} from './errors';
import {parseAction,parseCreation,requestHash} from './validation';
import type {TurnNotifier} from './push';
export const REMOTE_ENGINE='pickle-remote-1';
export function teamFor(row:Pick<StoredMatch,'home_user_id'|'away_user_id'>,actor:string):Team {
 if(row.home_user_id===actor)return 'home';if(row.away_user_id===actor)return 'away';throw missing();
}
function compatible(row:StoredMatch){if(row.engine_version!==REMOTE_ENGINE||row.seed_version!==1||row.checkpoint.engineVersion!==HUMAN_ENGINE)throw new ApiError(409,'unsupported_engine','This match requires a supported engine release. It has not been changed.');}
function decisionId(row:StoredMatch){return `${row.id}:${row.version}`;}
function seed(row:StoredMatch){return createHmac('sha256',row.resolution_secret).update(`${REMOTE_ENGINE}:1:${row.checkpoint.pointIndex}:${row.checkpoint.rally.state.shotHistory.length}`).digest().readUInt32BE(0);}
/** Whitelist display fields and action descriptors, excluding options, resolution and all seeds. */
export function publicMatch(row:StoredMatch,actor:string,names:ReadonlyMap<string,string>=new Map()):PublicMatch {
 const viewerTeam=teamFor(row,actor);compatible(row);const match=Match.fromCheckpoint(row.checkpoint),s=match.state;
 const currentTeam=row.status==='active'&&(!row.friend_state||row.friend_state==='accepted')?match.decisionTeam:null;
 const menu=match.targetingMenu;
 const nextHitter=currentTeam?menu[0]?.intent.actor??null:null;
 return {endedEarly:!!row.ended_by,friendState:row.friend_state,invitedName:row.invited_name,archived:!!(viewerTeam==='home'?row.archived_home:row.archived_away),court:row.checkpoint.court??'forest',nextHitter,id:row.id,createdAt:row.created_at,completedAt:row.completed_at??undefined,version:row.version,status:row.status,accountIds:{home:row.home_user_id,away:row.away_user_id},viewerTeam,currentTeam,decisionId:decisionId(row),rules:{...row.checkpoint.rules},score:{...match.scoring.score},serveCall:match.scoring.call,serving:row.status==='active'&&match.targetingMenu.some(c=>c.intent.type==='serve'),server:match.scoring.server,pointIndex:match.point,
  display:{schemaVersion:2,phase:s.phase,stage:s.stage,shotIndex:s.shotIndex,legIndex:0,elapsed:0,simulationTime:0,paused:true,ball:structuredClone(s.ball),players:structuredClone(s.players),shotHistory:[],rallyHistory:[],bounces:s.bounces,score:{...s.score},currentHitter:s.currentHitter,possession:s.possession,result:s.result?{...s.result}:null},
  roster:Object.fromEntries(SLOTS.map(id=>{const f=row.checkpoint.roster[id];return [id,{...f.design!,skills:{...f.skills},handedness:f.handedness}]})) as PublicMatch['roster'],
  choices:currentTeam===viewerTeam&&(!row.friend_state||row.friend_state==='accepted')?structuredClone(menu):[],result:row.last_result,animation:structuredClone(row.animation)};
}
function animations(match:Match):TurnAnimation[]{
 return match.turnPlayback.map(({start,end})=>{
  const shot=start.shot;
  // Sample only the committed portion. Reception branches and untraveled continuations stay private.
  const startTime=start.shotElapsed;
  const total=shot.legs.reduce((n,l)=>n+l.duration,0);
  const endTime=end.receptionPrompt?end.shotElapsed:total;
  const duration=Math.max(.001,endTime-startTime);
  // Keep every bounce/contact boundary, even between the regular samples.
  const times=Array.from({length:25},(_,i)=>duration*i/24);let boundary=0;
  for(const leg of shot.legs){boundary+=leg.duration;const relative=boundary-startTime;if(relative>0&&relative<duration)times.push(relative);}
  const pathTimes=[...new Set(times)].sort((a,b)=>a-b);
  const path=pathTimes.map(time=>{let t=startTime+time;for(const l of shot.legs){if(t<=l.duration+1e-9)return sampleLeg(l,Math.max(0,Math.min(1,t/l.duration)));t-=l.duration;}return {...shot.legs.at(-1)!.to};});
  return {intent:structuredClone(shot.intent),actor:shot.actor,duration,path,pathTimes,from:structuredClone(start.state.players),to:structuredClone(end.state.players)};
 });
}
export class MatchService {
 constructor(private repository:MatchRepository,private testers:ReadonlyMap<string,string>,private creationEnabled=true,private notifyTurn?:TurnNotifier){}
 config(actor:string){return {selfId:actor,selfName:this.testers.get(actor)??'Previous playtest account',creationEnabled:this.creationEnabled&&this.testers.has(actor),testers:[...this.testers].filter(([id])=>id!==actor&&this.testers.has(actor)).map(([id,name])=>({id,name}))};}
 async shotMix(actor:string,params:URLSearchParams){return personalShotMix(this.repository,actor,shotMixFilter(params),this.testers);}
 async leave(id:string,actor:string){if(!this.repository.leave)throw new ApiError(503,'unavailable','Leaving games is unavailable.');await this.repository.leave(id,actor);return {archived:true};}
 async archive(id:string,actor:string,input:unknown){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||typeof (input as {archived?:unknown}).archived!=='boolean')throw new ApiError(400,'archive','Choose archive or restore.');
  const row=await this.repository.get(id,actor);if(!row)throw missing();teamFor(row,actor);
  await this.repository.setArchived(id,actor,(input as {archived:boolean}).archived);
  return {archived:(input as {archived:boolean}).archived};
 }
 async get(id:string,actor:string){const row=await this.repository.get(id,actor);if(!row)throw missing();const match=(await this.withRivalries([publicMatch(row,actor,this.testers)],actor))[0];if(match.status==='completed'&&!match.endedEarly&&this.repository.strategy){try{const summary=await this.repository.strategy(id,actor);if(summary)match.strategy=publicStrategy(summary);}catch{console.warn('Match strategy unavailable');}}return match;}
 async list(actor:string){return this.withRivalries((await this.repository.list(actor)).map(row=>publicMatch(row,actor,this.testers)),actor);}
 private async withRivalries(matches:PublicMatch[],actor:string){
  if(!this.repository.rivalries||!matches.length)return matches;
  try{
   const summaries=await this.repository.rivalries(actor,matches.map(m=>m.id));
   for(const match of matches){
    if(!Object.hasOwn(summaries,match.id))continue;
    try{const rivalry=publicRivalry(summaries[match.id]);if(rivalry.atCompletion&&rivalry.atCompletion.recent[0].matchId!==match.id)throw new Error('Mismatched rivalry snapshot');match.rivalry=rivalry;}catch{console.warn('Invalid rivalry summary');}
   }
  }catch{console.warn('Rivalry history unavailable');}
  return matches;
 }
 async friendOpening(id:string,inviter:string,team?:TeamSelection){
  const row=await this.repository.get(id,inviter);if(!row)throw missing();
  if(row.friend_state!=='pending')return null;
  const match=Match.fromCheckpoint(row.checkpoint);
  const roster=Object.fromEntries(SLOTS.map(slot=>[slot,row.checkpoint.roster[slot].design!])) as PublicMatch['roster'];
  if(team){roster['opponent-left']=team[0];roster['opponent-right']=team[1];}
  else{const index=randomInt(LOOKS.length),look=LOOKS[index];roster['opponent-right']={...newPlayer(`preset-${index}`),name:look.name,appearance:structuredClone(look.appearance),skills:{...look.skills}};}
  match.scoringPreference=row.checkpoint.rules.scoring;
  match.startLocalHumanMatch(roster,'away');match.matchId=row.id;
  const checkpoint:StoredMatch['checkpoint']=match.exportCheckpoint();checkpoint.rules=structuredClone(row.checkpoint.rules);
  checkpoint.court=row.checkpoint.court;
  return checkpoint;
 }
 prepare(actor:string,input:unknown,friend=false){
  if(!this.creationEnabled||!this.testers.has(actor))throw new ApiError(403,'creation_disabled','New remote test matches are disabled for this account.');
  const request=parseCreation(input);if(request.opponentId===actor||(!friend&&!this.testers.has(request.opponentId)))throw new ApiError(400,'invalid_opponent','Choose a different enabled tester.');
  const match=new Match();match.scoringPreference=request.scoring;match.seed=randomBytes(4).readUInt32BE();match.startLocalHumanMatch(request.roster);match.matchId=randomUUID();match.revision=0;
  const row:StoredMatch={id:match.matchId,home_user_id:actor,away_user_id:request.opponentId,version:0,status:'active',current_action_user_id:actor,checkpoint:match.exportCheckpoint(),last_result:null,animation:[],creation_request_id:request.creationId,creation_hash:requestHash(request),resolution_secret:randomBytes(32).toString('hex'),seed_version:1,engine_version:REMOTE_ENGINE};
  row.checkpoint.seed=seed(row);
  return row;
 }
 async create(actor:string,input:unknown){
  return publicMatch(await this.repository.create(this.prepare(actor,input)),actor,this.testers);
 }
 async act(id:string,actor:string,input:unknown):Promise<ActionReceipt>{
  const request=parseAction(input),hash=requestHash(request);
  const row=await this.repository.get(id,actor);if(!row)throw missing();teamFor(row,actor);
  if(row.friend_state==='pending'||row.friend_state==='cancelled')throw new ApiError(409,'waiting','This challenge is not ready to play.');
  const old=await this.repository.receipt(id,request.actionId);
  const receipt=(r:StoredReceipt):ActionReceipt=>{
   if(r.actor_id!==actor||r.request_hash!==hash)throw conflict();
   return {actionId:r.action_id,fromVersion:r.from_version,toVersion:r.to_version,state:publicMatch({...row,...r.result,checkpoint:r.checkpoint,version:r.to_version,completed_at:r.result.completed_at??(r.result.status==='completed'?r.created_at??null:null),ended_by:null,archived_home:r.result.archived_home??false,archived_away:r.result.archived_away??false},actor,this.testers)};
  };
  if(old)return receipt(old);compatible(row);
  if(row.version!==request.expectedVersion||request.decisionId!==decisionId(row)||row.status!=='active')throw conflict();
  if(row.current_action_user_id!==actor)throw new ApiError(403,'wrong_turn','Wait for your turn.');
  const c=structuredClone(row.checkpoint);c.seed=seed(row);
  const match=Match.fromCheckpoint(c);const team=teamFor(row,actor);
  if(match.decisionTeam!==team)throw new ApiError(503,'invalid_state','Match ownership is inconsistent.');
  const opportunity=selectionOpportunity(match);
  try{match.submitTurn({decisionId:match.decisionId,playerId:playerForTeam(team),intent:request.action.intent,...(request.action.timing?{timing:request.action.timing}:{})});}
  catch{throw new ApiError(400,'illegal_action','That shot or reception timing is not legal for this decision.');}
  const animation=animations(match);match.settleCommittedPlayback();
  const selection=selectionCapture(opportunity,match,request.action);
  const result=match.state.result?structuredClone(match.state.result):null;
  if(match.state.phase==='complete'&&!match.scoring.winner)match.nextPoint();
  // Network versions count accepted actions, including point advancement in the same transaction.
  match.revision=row.version+1;
  const checkpoint:StoredMatch['checkpoint']=parseCheckpoint(match.exportCheckpoint());
  if(row.checkpoint.court)checkpoint.court=row.checkpoint.court;
  const status=match.scoring.winner?'completed':'active';
  const current=match.decisionTeam;
  if(status==='active'&&!current)throw new ApiError(503,'invalid_state','Resolution did not reach a decision.');
  const next:StoredMatch={...row,checkpoint,status,animation,last_result:result,current_action_user_id:current?(current==='home'?row.home_user_id:row.away_user_id):null};
  const committed=await this.repository.commit({match:next,actor,hash,actionId:request.actionId,expectedVersion:row.version,action:request.action,selection});
  const response=receipt(committed);
  if(committed.result.status==='completed'&&this.repository.strategy){
   // Derived work is repairable on read and must not invalidate an accepted turn.
   await Promise.all([row.home_user_id,row.away_user_id].filter((owner):owner is string=>!!owner).map(owner=>this.repository.strategy!(id,owner).catch(()=>console.warn('Match strategy build deferred'))));
  }
  const recipient=committed.result.current_action_user_id;
  if(this.notifyTurn&&committed.result.status==='active'&&recipient&&recipient!==actor){
   // Detached side effect: provider/storage failure cannot roll back or delay a turn.
   void Promise.resolve().then(()=>this.notifyTurn!({userId:recipient,matchId:id,version:committed.to_version,opponentName:this.testers.get(actor)??'Your opponent'})).catch(()=>console.warn('Turn push unavailable'));
  }
  return response;
 }
}
