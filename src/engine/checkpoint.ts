import {type PlayMode} from './controllers';
import {SKILLS,type GameState,type PlayerId,type PlayerState,type RallyShot,type Team,type Vec3} from './model';
import {flightCursor,sampleLeg,type RallyRuntime} from './rally-engine';
import {parseShotIntent} from './shot-intent';
import {PERSONALITIES,STRATEGIES,type Observation,type OpponentChoiceHistory,type OpponentStrategy,type Personality} from './opponent-brain';
import type {ShotContext} from './shot-families';
import {validatePlayer,type DesignedPlayer} from '../player-design';
import {DEFAULT_RULES,LOCAL_TEST_RULES,type ScoringRules} from './scoring';

export const CHECKPOINT_ENGINE='pickle-local-1';
export const HUMAN_ENGINE='pickle-human-1';
export const SLOTS:PlayerId[]=['you','partner','opponent-left','opponent-right'];
type LogicalState=Omit<GameState,'schemaVersion'|'simulationTime'|'elapsed'|'legIndex'|'paused'|'rallyHistory'> & {
 rallyHistory:Array<GameState['rallyHistory'][number] extends infer E ? E extends {time:number} ? Omit<E,'time'> : never : never>;
};
export interface RallyCheckpoint {
 kind:'contact'|'reception'|'point-end';
 state:LogicalState;
 options:RallyShot[];
 shot:RallyShot;
 /** Fraction of total flight at the reception boundary; absent in legacy net saves. */
 receptionProgress?:number;
 /** Required at the reception boundary to reconstruct branch movement. */
 receptionOrigin:Record<PlayerId,Vec3>|null;
}
export interface FrozenAthlete {
 design:DesignedPlayer|null;skills:PlayerState['skills'];tendencies:PlayerState['tendencies'];handedness:PlayerState['handedness'];
}
export interface MatchCheckpoint {
 schemaVersion:2;engineVersion:typeof CHECKPOINT_ENGINE|typeof HUMAN_ENGINE;matchId:string;
 mode:PlayMode;revision:number;
 rules:ScoringRules;
 scoring:{score:Record<Team,number>;serving:Team;server:PlayerId;serverNumber:1|2;right:Record<Team,PlayerId>;winner:Team|null};
 pointIndex:number;seed:number;openingTeam:Team;
 roster:Record<PlayerId,FrozenAthlete>;
 rally:RallyCheckpoint;
 context:ShotContext|null;customIndex:number;
 solo:{partnerAutonomy:boolean;playerAutonomy:boolean;brainMode:'local'|'llm';personality:Personality;intelligence:number;
  memory:Observation[];recentChoices:Partial<Record<PlayerId,OpponentChoiceHistory[]>>;
  strategy:OpponentStrategy|null;strategyPoint:number;
  partnerInstructions:{backhand?:'jules'|'rio';soft?:'jules'|'rio';crash?:boolean};recommendationType:string|null;
 };
}

export function checkpointRally(runtime:RallyRuntime):RallyCheckpoint {
 const {simulationTime,elapsed,legIndex,paused,schemaVersion,rallyHistory,...state}=runtime.state;
 if(state.phase==='flight'&&!runtime.receptionPrompt)throw new Error('Save only at a logical decision boundary.');
 return structuredClone({kind:runtime.receptionPrompt?'reception':state.phase==='complete'?'point-end':'contact',
  state:{...state,rallyHistory:rallyHistory.map(({time,...event})=>event)},
  ...(runtime.receptionPrompt?{receptionProgress:runtime.shotElapsed/runtime.shot.legs.reduce((sum,leg)=>sum+leg.duration,0)}:{}),
  options:runtime.options,shot:runtime.shot,receptionOrigin:runtime.receptionPrompt?runtime.movementStart:null});
}
export function hydrateRally(c:RallyCheckpoint):RallyRuntime {
 const reception=c.kind==='reception',leg=c.shot.legs[0];
 // Legacy saves retain their original net position; new saves record flight progress.
 const time=reception?(c.receptionProgress===undefined?leg.duration*leg.from.z/(leg.from.z-leg.to.z):c.receptionProgress*c.shot.legs.reduce((sum,l)=>sum+l.duration,0)):0;
 return structuredClone({state:{...c.state,schemaVersion:2,simulationTime:0,...flightCursor(c.shot.legs,time),paused:reception,
  rallyHistory:c.state.rallyHistory.map(event=>({...event,time:0}))},options:c.options,shot:c.shot,
  movementStart:c.receptionOrigin??Object.fromEntries(c.state.players.map(p=>[p.id,p.position])),shotElapsed:time,receptionPrompt:reception}) as RallyRuntime;
}

/** Local saves are untrusted input. Reject incompatible or malformed records before hydration. */
export function parseCheckpoint(value:unknown):MatchCheckpoint {
 const fail=():never=>{throw new Error('This saved match is invalid or uses an unsupported version. It has been kept unchanged.');};
 const object=(v:any)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail();};
 const number=(v:any,min=-Infinity,max=Infinity)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail();};
 const integer=(v:any,min=0)=>{number(v,min);if(!Number.isSafeInteger(v))fail();};
 const team=(v:any)=>{if(v!=='home'&&v!=='away')fail();};
 const slot=(v:any)=>{if(!SLOTS.includes(v))fail();};
 const vec=(v:any)=>{object(v);number(v.x);number(v.y);number(v.z);};
 const bool=(v:any)=>{if(typeof v!=='boolean')fail();};
 const boundedArray=(v:any,max=100000)=>{if(!Array.isArray(v)||v.length>max)fail();};
 const positions=(v:any)=>{object(v);for(const id of SLOTS)vec(v[id]);};
 const skills=(v:any)=>{object(v);for(const k of SKILLS)number(v[k],0,100);};
 const tendencies=(v:any)=>{object(v);for(const k of ['aggression','middlePreference','kitchenApproach'])number(v[k],0,1);if(v.lobPreference!==undefined)number(v.lobPreference,0,1);};
 const result=(r:any)=>{object(r);team(r.winner);if(!['missed-swing','body-hit','winner','net','out','double-bounce','failed-return','unreturned-attack'].includes(r.reason))fail();if(r.playerId!==undefined)slot(r.playerId);};
 const legs=(ls:any)=>{boundedArray(ls,100);if(!ls.length)fail();for(const [i,l] of ls.entries()){object(l);vec(l.from);vec(l.to);number(l.duration,1e-9);number(l.arc);for(const k of ['sideCurve','verticalSpin'])if(l[k]!==undefined)number(l[k]);if(l.bounceAtEnd!==undefined)bool(l.bounceAtEnd);if(i&&Math.hypot(l.from.x-ls[i-1].to.x,l.from.y-ls[i-1].to.y,l.from.z-ls[i-1].to.z)>1e-7)fail();}};
 const resolution=(r:any)=>{object(r);if(r.receiver!==null)slot(r.receiver);bool(r.bounced);if(r.result)result(r.result);if(!r.result&&r.receiver===null)fail();for(const k of ['timingPressure','movementZ'])if(r[k]!==undefined)number(r[k]);};
 const shot=(s:any)=>{object(s);parseShotIntent(s.intent);slot(s.actor);if(s.actor!==s.intent.actor)fail();vec(s.contact);vec(s.aimPoint);legs(s.legs);positions(s.positions);resolution(s.resolution);if(Math.hypot(s.contact.x-s.legs[0].from.x,s.contact.y-s.legs[0].from.y,s.contact.z-s.legs[0].from.z)>1e-7)fail();if(s.receptionChoice){object(s.receptionChoice);for(const b of Object.values(s.receptionChoice) as any[]){object(b);legs(b.legs);positions(b.positions);resolution(b.resolution);}}};
 try{
  // Also reject NaN/Infinity anywhere in optional diagnostics, and excessive payloads.
  const inspect=(v:any):void=>{if(typeof v==='number')number(v);else if(v&&typeof v==='object')for(const child of Object.values(v))inspect(child);};
  inspect(value);const c:any=structuredClone(value);object(c);
  if(c.schemaVersion===1&&c.engineVersion===CHECKPOINT_ENGINE){c.schemaVersion=2;c.mode='solo';c.revision=0;}
  if(c.schemaVersion!==2||!['solo','local-human'].includes(c.mode)||c.engineVersion!==(c.mode==='solo'?CHECKPOINT_ENGINE:HUMAN_ENGINE))fail();integer(c.revision);
  if(typeof c.matchId!=='string'||!c.matchId.length||c.matchId.length>100)fail();
  object(c.rules);if(!['side-out-doubles','rally-doubles'].includes(c.rules.scoring))fail();integer(c.rules.target,1);integer(c.rules.winBy,1);
  // Keep existing match rules on resume; allow the short local playtest format.
  if(![DEFAULT_RULES,...(c.mode==='local-human'?[LOCAL_TEST_RULES]:[])].some(r=>r.target===c.rules.target&&r.winBy===c.rules.winBy))fail();
  integer(c.pointIndex);integer(c.customIndex);integer(c.seed);if(c.seed>0xffffffff)fail();team(c.openingTeam);
  object(c.scoring);const score=c.scoring;team(score.serving);slot(score.server);object(score.score);object(score.right);
  for(const t of ['home','away']){integer(score.score[t]);slot(score.right[t]);if((score.right[t]==='you'||score.right[t]==='partner')!==(t==='home'))fail();}
  if(c.rules.scoring==='rally-doubles'&&score.serverNumber!==1)fail();
  if((score.server==='you'||score.server==='partner')!==(score.serving==='home')||![1,2].includes(score.serverNumber))fail();
  const winner=score.score.home>=c.rules.target&&score.score.home-score.score.away>=c.rules.winBy?'home':score.score.away>=c.rules.target&&score.score.away-score.score.home>=c.rules.winBy?'away':null;
  if(score.winner!==winner)fail();
  object(c.roster);for(const id of SLOTS){const a=c.roster[id];object(a);skills(a.skills);tendencies(a.tendencies);if(!['left','right'].includes(a.handedness))fail();if(a.design!==null)validatePlayer(a.design);}
  object(c.rally);const r=c.rally,s=r.state;object(s);if(!['contact','reception','point-end'].includes(r.kind))fail();
  if(s.phase!==({contact:'decision',reception:'flight','point-end':'complete'} as any)[r.kind])fail();
  integer(s.shotIndex);integer(s.bounces);if(!['serve','return','third','fourth','transition','kitchen-exchange','attack','counter','reset','point-end'].includes(s.stage))fail();
  object(s.ball);vec(s.ball.position);vec(s.ball.velocity);boundedArray(s.players,4);if(s.players.length!==4||new Set(s.players.map((p:any)=>p.id)).size!==4)fail();
  for(const p of s.players){slot(p.id);team(p.team);if((p.id==='you'||p.id==='partner')!==(p.team==='home'))fail();vec(p.position);number(p.facing);skills(p.skills);tendencies(p.tendencies);if(!['left','right'].includes(p.handedness))fail();}
  boundedArray(s.shotHistory);s.shotHistory.forEach(parseShotIntent);boundedArray(s.rallyHistory);
  for(const e of s.rallyHistory){object(e);if(!['rally-start','contact','shot','bounce','point-end'].includes(e.type))fail();if(e.type==='point-end')result(e.result);if(e.position)vec(e.position);if(e.intent)parseShotIntent(e.intent);}
  if(s.score.home!==score.score.home||s.score.away!==score.score.away)fail();
  boundedArray(r.options,1000);r.options.forEach(shot);shot(r.shot);
  if(r.kind==='point-end'){result(s.result);if(s.currentHitter!==null||s.possession!==null||r.options.length||s.stage!=='point-end')fail();}
  else{if(s.result!==null||score.winner!==null)fail();slot(s.currentHitter);team(s.possession);if(s.players.find((p:any)=>p.id===s.currentHitter).team!==s.possession)fail();}
  if(r.kind==='contact'){
   if(!r.options.length||s.shotIndex!==s.shotHistory.length)fail();
   for(const o of r.options)if(o.actor!==s.currentHitter||Math.hypot(o.contact.x-s.ball.position.x,o.contact.y-s.ball.position.y,o.contact.z-s.ball.position.z)>1e-7)fail();
  }
  if(r.kind==='reception'){
   positions(r.receptionOrigin);if(!r.shot.receptionChoice||!Object.keys(r.shot.receptionChoice).length)fail();
   if(r.receptionProgress===undefined){
    const l=r.shot.legs[0];if(Math.abs(s.ball.position.z)>1e-7||l.from.z*l.to.z>0||l.from.z===l.to.z)fail();
   }else{
    number(r.receptionProgress,0,1);if(r.receptionProgress===1)fail();
    const time=r.receptionProgress*r.shot.legs.reduce((sum:number,l:any)=>sum+l.duration,0);
    for(const path of [r.shot,...Object.values(r.shot.receptionChoice)] as RallyShot[]){
     if(time>=path.legs.reduce((sum,l)=>sum+l.duration,0))fail();
     const cursor=flightCursor(path.legs,time),leg=path.legs[cursor.legIndex],point=sampleLeg(leg,cursor.elapsed/leg.duration);
     if(Math.hypot(point.x-s.ball.position.x,point.y-s.ball.position.y,point.z-s.ball.position.z)>1e-7)fail();
    }
   }
  }else if(r.receptionOrigin!==null)fail();
  if(c.mode==='local-human'){
   for(const id of SLOTS){const a=c.roster[id],p=s.players.find((p:any)=>p.id===id);if(SKILLS.some(k=>a.skills[k]!==p.skills[k])||a.handedness!==p.handedness||['aggression','middlePreference','kitchenApproach','lobPreference'].some(k=>a.tendencies[k]!==p.tendencies[k]))fail();}
   if(SLOTS.some(id=>!c.roster[id].design))fail();
   if(c.solo.partnerAutonomy||c.solo.playerAutonomy||c.solo.brainMode!=='local'||Object.keys(c.solo.partnerInstructions).length)fail();
  }
  if(c.context!==null){object(c.context);vec(c.context.contact);vec(c.context.feet);bool(c.context.bounced);bool(c.context.twoBounceSatisfied);number(c.context.incomingSpeed,0);if(!['serve','return','rally'].includes(c.context.opening))fail();}
  object(c.solo);const solo=c.solo;bool(solo.partnerAutonomy);bool(solo.playerAutonomy);if(!['local','llm'].includes(solo.brainMode)||!PERSONALITIES.includes(solo.personality))fail();number(solo.intelligence,0,1);integer(solo.strategyPoint,-1);
  if(solo.strategy!==null&&!STRATEGIES.some(st=>JSON.stringify(st)===JSON.stringify(solo.strategy)))fail();
  boundedArray(solo.memory,40);for(const m of solo.memory){parseShotIntent(m.intent);bool(m.crash);bool(m.lowBackhandError);}
  object(solo.recentChoices);for(const [id,choices] of Object.entries(solo.recentChoices) as [any,any][]){slot(id);boundedArray(choices,8);for(const o of choices){parseShotIntent(o.intent);if(o.receiver!==null)slot(o.receiver);}}
  object(solo.partnerInstructions);for(const k of ['backhand','soft'])if(solo.partnerInstructions[k]!==undefined&&!['jules','rio'].includes(solo.partnerInstructions[k]))fail();if(solo.partnerInstructions.crash!==undefined)bool(solo.partnerInstructions.crash);
  return c as MatchCheckpoint;
 }catch{ return fail(); }
}
