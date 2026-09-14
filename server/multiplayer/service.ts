import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {Match} from '../../src/match';
import {HUMAN_ENGINE,parseCheckpoint,SLOTS} from '../../src/engine/checkpoint';
import {playerForTeam} from '../../src/engine/controllers';
import {sampleLeg} from '../../src/engine/rally-engine';
import type {Team} from '../../src/engine/model';
import type {ActionReceipt,PublicMatch,TurnAnimation} from '../../src/multiplayer/protocol';
import type {MatchRepository,StoredMatch,StoredReceipt} from './repository';
import {ApiError,conflict,missing} from './errors';
import {parseAction,parseCreation,requestHash} from './validation';
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
 const currentTeam=row.status==='active'?match.decisionTeam:null;
 return {id:row.id,createdAt:row.created_at,version:row.version,status:row.status,accountIds:{home:row.home_user_id,away:row.away_user_id},viewerTeam,currentTeam,decisionId:decisionId(row),rules:{...row.checkpoint.rules},score:{...match.scoring.score},serveCall:match.scoring.call,serving:row.status==='active'&&match.targetingMenu.some(c=>c.intent.type==='serve'),server:match.scoring.server,pointIndex:match.point,
  display:{schemaVersion:2,phase:s.phase,stage:s.stage,shotIndex:s.shotIndex,legIndex:0,elapsed:0,simulationTime:0,paused:true,ball:structuredClone(s.ball),players:structuredClone(s.players),shotHistory:[],rallyHistory:[],bounces:s.bounces,score:{...s.score},currentHitter:s.currentHitter,possession:s.possession,result:s.result?{...s.result}:null},
  roster:Object.fromEntries(SLOTS.map(id=>{const f=row.checkpoint.roster[id];const owner=id==='you'?row.home_user_id:id==='opponent-left'?row.away_user_id:null;return [id,{...f.design!,...(owner&&names.has(owner)?{name:names.get(owner)!}:{}),skills:{...f.skills},handedness:f.handedness}]})) as PublicMatch['roster'],
  choices:currentTeam===viewerTeam?structuredClone(match.targetingMenu):[],result:row.last_result,animation:structuredClone(row.animation)};
}
function animations(match:Match):TurnAnimation[]{
 return match.turnPlayback.map(({start,end})=>{
  const shot=start.shot;
  // Sample only the committed portion. Reception branches and untraveled continuations stay private.
  const startTime=start.shotElapsed;
  const total=shot.legs.reduce((n,l)=>n+l.duration,0);
  const endTime=end.receptionPrompt?end.shotElapsed:total;
  const duration=Math.max(.001,endTime-startTime);
  const path=Array.from({length:25},(_,i)=>{let t=startTime+duration*i/24;for(const l of shot.legs){if(t<=l.duration)return sampleLeg(l,Math.max(0,t/l.duration));t-=l.duration;}return {...shot.legs.at(-1)!.to};});
  return {intent:structuredClone(shot.intent),actor:shot.actor,duration,path,from:structuredClone(start.state.players),to:structuredClone(end.state.players)};
 });
}
export class MatchService {
 constructor(private repository:MatchRepository,private testers:ReadonlyMap<string,string>,private creationEnabled=true){}
 config(actor:string){return {selfId:actor,selfName:this.testers.get(actor)??'Previous playtest account',creationEnabled:this.creationEnabled&&this.testers.has(actor),testers:[...this.testers].filter(([id])=>id!==actor&&this.testers.has(actor)).map(([id,name])=>({id,name}))};}
 async get(id:string,actor:string){const row=await this.repository.get(id,actor);if(!row)throw missing();return publicMatch(row,actor,this.testers);}
 async list(actor:string){return (await this.repository.list(actor)).map(row=>publicMatch(row,actor,this.testers));}
 prepare(actor:string,input:unknown){
  if(!this.creationEnabled||!this.testers.has(actor))throw new ApiError(403,'creation_disabled','New remote test matches are disabled for this account.');
  const request=parseCreation(input);if(request.opponentId===actor||!this.testers.has(request.opponentId))throw new ApiError(400,'invalid_opponent','Choose a different enabled tester.');
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
  const old=await this.repository.receipt(id,request.actionId);
  const receipt=(r:StoredReceipt):ActionReceipt=>{
   if(r.actor_id!==actor||r.request_hash!==hash)throw conflict();
   return {actionId:r.action_id,fromVersion:r.from_version,toVersion:r.to_version,state:publicMatch({...row,...r.result,checkpoint:r.checkpoint,version:r.to_version},actor,this.testers)};
  };
  if(old)return receipt(old);compatible(row);
  if(row.version!==request.expectedVersion||request.decisionId!==decisionId(row)||row.status!=='active')throw conflict();
  if(row.current_action_user_id!==actor)throw new ApiError(403,'wrong_turn','Wait for your turn.');
  const c=structuredClone(row.checkpoint);c.seed=seed(row);
  const match=Match.fromCheckpoint(c);const team=teamFor(row,actor);
  if(match.decisionTeam!==team)throw new ApiError(503,'invalid_state','Match ownership is inconsistent.');
  try{match.submitTurn({decisionId:match.decisionId,playerId:playerForTeam(team),intent:request.action.intent,...(request.action.timing?{timing:request.action.timing}:{})});}
  catch{throw new ApiError(400,'illegal_action','That shot or reception timing is not legal for this decision.');}
  const animation=animations(match);match.settleCommittedPlayback();
  const result=match.state.result?structuredClone(match.state.result):null;
  if(match.state.phase==='complete'&&!match.scoring.winner)match.nextPoint();
  // Network versions count accepted actions, including point advancement in the same transaction.
  match.revision=row.version+1;
  const checkpoint=parseCheckpoint(match.exportCheckpoint());
  const status=match.scoring.winner?'completed':'active';
  const current=match.decisionTeam;
  if(status==='active'&&!current)throw new ApiError(503,'invalid_state','Resolution did not reach a decision.');
  const next:StoredMatch={...row,checkpoint,status,animation,last_result:result,current_action_user_id:current?(current==='home'?row.home_user_id:row.away_user_id):null};
  return receipt(await this.repository.commit({match:next,actor,hash,actionId:request.actionId,expectedVersion:row.version,action:request.action}));
 }
}
