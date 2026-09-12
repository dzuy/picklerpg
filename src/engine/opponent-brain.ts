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
export function localDecision(s:TacticalSnapshot):number{
 const attack=['drive','counter','overhead','volley'];const soft=['dink','drop','reset','block'];
 const scored=s.options.map((o,i)=>{let score=0;const isAttack=attack.includes(o.type),isSoft=soft.includes(o.type);
 if(s.personality==='Banger')score+=isAttack?3:0;
 if(s.personality==='Grinder')score+=['dink','drop'].includes(o.type)?3:0;
 if(s.personality==='Wall')score+=['reset','block'].includes(o.type)?4:0;
 if(s.personality==='Technician')score+=isSoft?2:0;
 if(s.personality==='Gambler')score+=(o.target.kind==='zone'&&o.target.zone==='wide'?3:0)+(isAttack?2:0);
 if(s.personality==='Chess Player')score+=o.target.kind==='zone'&&o.target.zone==='open-court'?2:0;
 if(s.intelligence>=.5&&s.memory.samples>=3){if(s.memory.drives/s.memory.samples>.45)score+=['block','reset'].includes(o.type)?4:0;if(s.memory.speedups/s.memory.samples>.6)score+=o.type==='block'?2:0;if(s.memory.crashes>=2)score+=o.type==='lob'?5:0;if(s.memory.lowBackhandErrors>=2)score+=o.target.kind==='player'&&['backhand-side','feet'].includes(o.target.aim)?6:0;const recent=s.memory.recentTypes;if(recent.length>=3&&new Set(recent.slice(-3)).size===1)score+=o.type==='counter'?1:0;const max=Math.max(0,...Object.values(s.memory.targets));if(max/s.memory.samples>.6)score+=o.target.kind==='zone'&&o.target.zone==='wide'?2:0;}
 const actor=s.players.find(p=>p.id===o.actor);if(s.intelligence>=.8&&actor)score+=(actor.skills[o.type==='lob'?'drop':o.type==='block'?'volley':o.type]??50)/100;
 return {i,score};});return scored.sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.i??0;
}
export function validateChoice(value:unknown,count:number):number {if(!value||typeof value!=='object'||Object.keys(value).length!==1||!('choice' in value)||!Number.isInteger(value.choice)||Number(value.choice)<0||Number(value.choice)>=count)throw new Error('Invalid opponent choice');return Number(value.choice)}
export async function requestOpponent(s:TacticalSnapshot,signal:AbortSignal):Promise<number>{const r=await fetch('/api/opponent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s),signal});if(!r.ok)throw new Error('Model unavailable');return validateChoice(await r.json(),s.options.length)}
