import {Match} from './match';
import {uniformSkills} from './game-evaluation';
import {executeShot} from './engine/execution';
import {receptionTiming,receptionRoll,swingMissChance} from './engine/reception-timing';
import type {ShotIntent} from './engine/model';
import type {ShotContext} from './engine/shot-families';

/** Fixed contacts and paired seeds isolate a skill from tactical choice. */
export function evaluateNetExecution(attribute:'hands'|'counter'|'volley',skill:number,samples=2000){
 const players=structuredClone(new Match().state.players);
 for(const player of players)player.skills=uniformSkills(70);
 players[0].skills[attribute]=skill;
 const types=attribute==='counter'?['counter'] as const:attribute==='volley'?['volley','block','flick'] as const:['volley'] as const;
 return types.flatMap(type=>['prepared','rushed','wide'].map(condition=>{
  const c:ShotContext={contact:{x:1.4,y:1,z:2.5},feet:{x:condition==='rushed'?0:1.4,y:0,z:2.8},bounced:false,opening:'rally',twoBounceSatisfied:true,incomingSpeed:condition==='rushed'?20:10,timingPressure:condition==='rushed'?.8:0};
  players[0].position={...c.feet};
  const soft=type==='block';
  const intent:ShotIntent={schemaVersion:1,actor:'you',type,target:{kind:'point',x:condition==='wide'?2.798:0,z:soft?-1.25:-5.6},pace:soft?'soft':'fast',shape:soft?'arc':'flat',intendedNetClearance:soft?.25:.15,tacticalIntent:soft?'neutralize':'pressure',aggression:soft?.3:.6,source:'ai'};
  let inCourt=0,mishits=0,error=0,quality=0;
  for(let seed=0;seed<samples;seed++){
   const e=executeShot(intent,c,players,{seed,balance:1});
   inCourt+=Number(e.outcome==='in');mishits+=Number(e.mishit);error+=e.endpointError;quality+=e.quality;
  }
  return {attribute,skill,type,condition,samples,inCourtRate:inCourt/samples,mishitRate:mishits/samples,meanError:error/samples,meanQuality:quality/samples};
 }));
}

/** Reception before execution: fixed ball-arrival grids and identical random draws. */
export function evaluateHandsReception(skill:number,samples=2000){
 const player=structuredClone(new Match().state.players[0]);player.skills=uniformSkills(70);player.skills.hands=skill;
 return [{condition:'prepared',distance:.3,elapsed:.8,speed:8},{condition:'rushed',distance:.8,elapsed:.35,speed:20},{condition:'stretched',distance:1.6,elapsed:.5,speed:16}].map(c=>{
  const timing=receptionTiming(player,c.distance,c.elapsed,c.speed,false);
  const missChance=swingMissChance(player,timing.pressure,c.speed);
  let returned=0;
  for(let seed=0;seed<samples;seed++)returned+=Number(timing.reachable&&receptionRoll(seed,player)>=missChance);
  return {...c,skill,samples,reachable:timing.reachable,pressure:timing.pressure,missChance,returnRate:returned/samples};
 });
}
