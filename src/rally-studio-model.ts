import {Match} from './match';
import {SLOTS} from './engine/checkpoint';
import {SHOT_TYPES,type GameState,type RallyShot,type ShotType,type ShotIntent,type PlayerId} from './engine/model';
import type {DesignedPlayer} from './player-design';
import type {AssessmentContact} from './shot-assessment';
import type {ScoringMode} from './engine/scoring';

export interface RallyBrief {min:number;max:number;ending:string|null;shots:ShotType[];technique:'atp'|'erne'|null}
export function parseRallyBrief(text:string):RallyBrief {
 const input=text.toLowerCase().replace(/[–—]/g,'-');
 if(!input.trim())throw Error('Describe the rally you want to find.');
 const count=input.match(/\b(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*[- ]?\s*(?:hit|shot|contact)s?\b/);
 const min=count?Number(count[1]):3,max=count?Number(count[2]??count[1]):12;
 if(min<1||max>40||min>max)throw Error('Choose between 1 and 40 hits, with the smaller number first.');
 const endings=[[/body\s*[- ]?(?:bag(?:ged)?|hit)|bagged/,'body-hit'],[/\bnet\b/,'net'],[/\bout\b/,'out'],[/\bwinner\b|winning/,'winner']] as const;
 const ending=endings.find(([pattern])=>pattern.test(input))?.[1]??null;
 const shots=SHOT_TYPES.filter(type=>new RegExp(`\\b${type}(?:s|ing)?\\b`).test(input));
 const technique=/\batp\b|around the post/.test(input)?'atp':/\berne\b/.test(input)?'erne':null;
 if(!count&&!ending&&!shots.length&&!technique)throw Error('Include a hit count, shot name, or ending such as body bag, winner, net, or out.');
 return {min,max,ending,shots,technique};
}
export interface StudioRequest {brief:RallyBrief;players:DesignedPlayer[];seed:number;scoring:ScoringMode;scope:'full'|'finish';attempts:number}
export interface StudioDecision {index:number;time:number;actor:PlayerId;options:ShotIntent[];selected:ShotIntent;point:{x:number;z:number};assessment:AssessmentContact[]}
export interface StudioTake {decisions:StudioDecision[];frames:GameState[];shots:RallyShot[];seed:number;count:number;result:string;start:number;end:number;attempt:number}
export function studioMatch(request:StudioRequest,seed:number){
 const match=new Match();match.seed=seed;match.brainMode='local';match.playerAutonomy=true;match.partnerAutonomy=true;match.captureReplay=false;match.scoringPreference=request.scoring;
 SLOTS.forEach((id,i)=>match.substitutePlayer(id,request.players[i]));match.reset();return match;
}
export function matchingStart(match:Match,brief:RallyBrief,scope:StudioRequest['scope']):number|null {
 if(match.state.phase!=='complete')return null;
 const history=match.state.shotHistory,result=match.state.result!.reason;
 if(brief.ending&&(brief.ending==='winner'?!['winner','unreturned-attack','failed-return','double-bounce'].includes(result):result!==brief.ending))return null;
 const count=history.length;if(count<brief.min||scope==='full'&&count>brief.max)return null;
 const start=scope==='finish'?Math.max(0,count-brief.max):0,slice=history.slice(start);
 if(!brief.shots.every(type=>slice.some(shot=>shot.type===type))||brief.technique&&!slice.some(shot=>shot.technique===brief.technique))return null;
 return start;
}
/** Every decision, flight, reach, bounce and result comes from the current Match. */
export function simulateStudioCandidate(request:StudioRequest,seed:number){
 const match=studioMatch(request,seed);
 for(let step=0;step<600&&match.state.phase!=='complete';step++){
  match.update(0);
  if(match.state.phase==='flight'&&!match.state.paused)match.engine.advanceToBoundary();
  if(match.state.shotHistory.length>80)break;
 }
 return match;
}
/** Re-run the accepted seed at recording cadence through the same Match update loop. */
export function recordStudioTake(request:StudioRequest,seed:number,attempt:number):StudioTake|null {
 const match=studioMatch(request,seed),frames:GameState[]=[],shots:RallyShot[]=[],decisions:StudioDecision[]=[];
 let previousIndex=-1;
 for(let step=0;step<7200&&match.state.phase!=='complete';step++){
  match.update(1/60);frames.push(match.snapshot());shots.push(structuredClone(match.shot));
  if(match.state.phase==='flight'&&match.state.shotIndex!==previousIndex){
   previousIndex=match.state.shotIndex;
   decisions.push({index:previousIndex,time:match.state.simulationTime,actor:match.shot.actor,options:match.engine.runtime().options.map(option=>option.intent),selected:structuredClone(match.shot.intent),point:{x:match.shot.aimPoint.x,z:match.shot.aimPoint.z},assessment:match.shotAssessmentContexts});
  }

 }
 const startIndex=matchingStart(match,request.brief,request.scope);if(startIndex===null)return null;
 const first=frames.findIndex(frame=>frame.shotIndex>=startIndex),kept=frames.slice(Math.max(0,first)),keptShots=shots.slice(Math.max(0,first));
 return {decisions:decisions.filter(decision=>decision.index>=startIndex),frames:kept,shots:keptShots,seed,count:match.state.shotHistory.length-startIndex,result:match.state.result!.reason,start:kept[0].simulationTime,end:kept.at(-1)!.simulationTime,attempt};
}

export const STUDIO_PICKER_SECONDS=3;
export function studioPlayback(take:StudioTake,elapsed:number,player:string){
 let held=0;
 for(const decision of take.decisions){
  if(decision.actor!==player)continue;
  const at=decision.time-take.start+held;
  if(elapsed<at)break;
  if(elapsed<at+STUDIO_PICKER_SECONDS)return {time:decision.time,decision,age:elapsed-at};
  held+=STUDIO_PICKER_SECONDS;
 }
 return {time:take.start+elapsed-held,decision:null,age:0};
}
