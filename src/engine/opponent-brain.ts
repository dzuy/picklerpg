import {resolveTarget} from './targeting';
import type {GameState,ShotIntent} from './model';
export const PERSONALITIES=['Banger','Grinder','Technician','Gambler','Wall','Chess Player'] as const;
export type Personality=typeof PERSONALITIES[number];
export interface Observation {intent:ShotIntent;lowBackhandError:boolean;crash:boolean}
export class OpponentMemory {
 observations:Observation[]=[];
 add(o:Observation){this.observations.push(structuredClone(o));this.observations=this.observations.slice(-40)}
 summary(){const a=this.observations;const counts:Record<string,number>={};for(const o of a){const key=JSON.stringify(o.intent.target);counts[key]=(counts[key]??0)+1}return {samples:a.length,drives:a.filter(o=>o.intent.type==='drive').length,speedups:a.filter(o=>['drive','counter','volley'].includes(o.intent.type)).length,crashes:a.filter(o=>o.crash).length,lowBackhandErrors:a.filter(o=>o.lowBackhandError).length,targets:counts,recentTypes:a.slice(-8).map(o=>o.intent.type)}}
}
export function tacticalSnapshot(state:GameState,intents:ShotIntent[],memory:OpponentMemory,personality:Personality,intelligence:number){return structuredClone({version:1,coordinates:'metres; home +z, away -z; net z=0',score:state.score,stage:state.stage,actor:state.currentHitter,ball:state.ball,players:state.players,bounces:state.bounces,personality,intelligence,memory:memory.summary(),options:intents});}
export type TacticalSnapshot=ReturnType<typeof tacticalSnapshot>;
export const STRATEGIES=[
 {name:'Apply pressure',shots:['drive','counter','overhead','volley'],target:'any'},
 {name:'Patient soft game',shots:['drop','dink','reset'],target:'any'},
 {name:'Absorb pace',shots:['block','reset','counter'],target:'any'},
 {name:'Lob advancing players',shots:['lob','drop'],target:'any'},
 {name:'Find open court',shots:[],target:'open-court'},
 {name:'Probe the backhand',shots:[],target:'backhand-side'},
] as const;
export type OpponentStrategy=typeof STRATEGIES[number];
export interface OpponentChoiceHistory {intent:ShotIntent;receiver:string|null}
export interface DecisionVariation {seed:number;recent:readonly OpponentChoiceHistory[]}
/** Estimate the pressured defender from intent geometry, never execution outcomes. */
export function intendedReceiver(s:TacticalSnapshot,o:ShotIntent):string|null{
 if(o.target.kind==='player')return o.target.playerId;
 try{
  const actor=s.players.find(p=>p.id===o.actor)!,target=resolveTarget(o.target,{actor:o.actor,contact:s.ball.position,players:s.players,shotType:o.type}).point;
  return s.players.filter(p=>p.team!==actor.team).sort((a,b)=>Math.hypot(a.position.x-target.x,a.position.z-target.z)-Math.hypot(b.position.x-target.x,b.position.z-target.z))[0]?.id??null;
 }catch{return null}
}
export function localDecision(s:TacticalSnapshot,strategy?:OpponentStrategy,variation?:DecisionVariation):number{
 const attack=['drive','counter','overhead','volley'];const soft=['dink','drop','reset','block'];
 const scored=s.options.map((o,i)=>{let score=0;const isAttack=attack.includes(o.type),isSoft=soft.includes(o.type);
 if(strategy){if((strategy.shots as readonly string[]).includes(o.type))score+=2.5;if(o.target.kind==='zone'&&o.target.zone===strategy.target||o.target.kind==='player'&&o.target.aim===strategy.target)score+=3;}
 if(s.personality==='Banger')score+=isAttack?3:0;
 if(s.personality==='Grinder')score+=['dink','drop'].includes(o.type)?3:0;
 if(s.personality==='Wall')score+=['reset','block'].includes(o.type)?4:0;
 if(s.personality==='Technician')score+=isSoft?2:0;
 if(s.personality==='Gambler')score+=(o.target.kind==='zone'&&o.target.zone==='wide'?3:0)+(isAttack?2:0);
 if(s.personality==='Chess Player')score+=o.target.kind==='zone'&&o.target.zone==='open-court'?2:0;
 if(s.intelligence>=.5&&s.memory.samples>=3){if(s.memory.drives/s.memory.samples>.45)score+=['block','reset'].includes(o.type)?4:0;if(s.memory.speedups/s.memory.samples>.6)score+=o.type==='block'?2:0;if(s.memory.crashes>=2)score+=o.type==='lob'?5:0;if(s.memory.lowBackhandErrors>=2)score+=o.target.kind==='player'&&['backhand-side','feet'].includes(o.target.aim)?6:0;const recent=s.memory.recentTypes;if(recent.length>=3&&new Set(recent.slice(-3)).size===1)score+=o.type==='counter'?1:0;const max=Math.max(0,...Object.values(s.memory.targets));if(max/s.memory.samples>.6)score+=o.target.kind==='zone'&&o.target.zone==='wide'?2:0;}
 const actor=s.players.find(p=>p.id===o.actor);if(s.intelligence>=.8&&actor)score+=(o.type==='flick'?Math.min(actor.skills.volley,actor.skills.hands):(actor.skills[o.type==='lob'?'drop':o.type==='block'?'volley':o.type]??50))/100;
 if(variation){
  if(o.type==='overhead'&&s.ball.position.y>=1.9)score+=4;
  const receiver=intendedReceiver(s,o),recent=variation.recent.slice(-8);
  for(const [index,previous] of recent.entries()){
   const weight=(index+1)/recent.length;
   if(previous.intent.type===o.type)score-=.35*weight;
   if(receiver&&previous.receiver===receiver)score-=.55*weight;
   if(previous.intent.type===o.type&&JSON.stringify(previous.intent.target)===JSON.stringify(o.target))score-=.8*weight;
  }
 }
 return {i,score};});
 if(!variation)return scored.sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.i??0;
 // Sample near the strongest tactical choices; duplicated menu entries get no extra votes.
 const unique=scored.filter((candidate,index)=>scored.findIndex(other=>JSON.stringify(s.options[other.i])===JSON.stringify(s.options[candidate.i]))===index);
 const best=Math.max(...unique.map(c=>c.score)),viable=unique.filter(c=>c.score>=best-3);
 let seed=variation.seed>>>0;seed=(Math.imul(seed,1664525)+1013904223)>>>0;seed^=seed>>>16;seed=Math.imul(seed,0x7feb352d)>>>0;seed^=seed>>>15;
 const weights=viable.map(c=>Math.exp((c.score-best)/1.15)/viable.filter(other=>s.options[other.i].type===s.options[c.i].type).length);
 let roll=(seed>>>0)/4294967296*weights.reduce((sum,w)=>sum+w,0);
 for(let i=0;i<viable.length;i++){roll-=weights[i];if(roll<=0)return viable[i].i}
 return viable.at(-1)?.i??0;
}
export function validateChoice(value:unknown,count:number):number {if(!value||typeof value!=='object'||Object.keys(value).length!==1||!('choice' in value)||!Number.isInteger(value.choice)||Number(value.choice)<0||Number(value.choice)>=count)throw new Error('Invalid opponent choice');return Number(value.choice)}
export async function requestOpponent(s:TacticalSnapshot,signal:AbortSignal):Promise<number>{const r=await fetch('/api/opponent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s),signal});if(!r.ok)throw new Error('Model unavailable');return validateChoice(await r.json(),s.options.length)}

/** Strategy uses roster and rally history, never a pending contact's shot menu. */
export async function requestStrategy(s:TacticalSnapshot,signal:AbortSignal):Promise<OpponentStrategy>{
 const {options,actor,ball,bounces,stage,...context}=s;
 const response=await fetch('/api/opponent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...context,kind:'strategy',options:STRATEGIES}),signal});
 if(!response.ok)throw new Error('Strategy unavailable');
 return STRATEGIES[validateChoice(await response.json(),STRATEGIES.length)];
}
