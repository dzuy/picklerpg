import {Match} from './match';
import {uniformSkills} from './game-evaluation';
import {executeShot} from './engine/execution';
import type {ShotIntent} from './engine/model';
import type {ShotContext} from './engine/shot-families';

/** Fixed overhead contacts isolate execution and whether the next defender can return. */
export function evaluateFinishing(skill:number,samples=200){
 const rows=[];
 for(const actor of ['you','opponent-left'] as const)for(const position of ['net','retreating','staggered'] as const)for(const aim of ['deep','feet'] as const){
  let legal=0,won=0,lost=0,returned=0,error=0;
  for(let seed=0;seed<samples;seed++){
   const m=new Match();m.seed=seed;m.playerAutonomy=true;m.partnerAutonomy=true;
   const side=actor==='you'?1:-1,players=structuredClone(m.state.players),team=actor==='you'?'home':'away';
   for(const [i,p] of players.entries()){p.skills=uniformSkills(70);p.position={x:i%2?-1.4:1.4,y:0,z:p.team==='home'?2.8:-2.8}}
   const hitter=players.find(p=>p.id===actor)!;hitter.skills.overhead=skill;
   if(position==='staggered')players.filter(p=>p.team!==team).forEach((p,i)=>{p.position={x:i?0:-side,y:0,z:-side*(i?5.5:2.5)}});
   const c:ShotContext={contact:{x:side*1.4,y:2.8,z:side*(position==='retreating'?5.5:2.8)},feet:{x:side*1.4,y:0,z:side*(position==='retreating'?5.8:3.1)},bounced:false,opening:'rally',twoBounceSatisfied:true,incomingSpeed:8,movementZ:position==='retreating'?side*2:0};
   hitter.position={...c.feet};
   const target=players.find(p=>p.team!==team&&p.position.x<0)??players.find(p=>p.team!==team)!;
   const intent:ShotIntent={schemaVersion:1,actor,type:'overhead',target:aim==='feet'?{kind:'player',playerId:target.id,aim:'feet'}:{kind:'zone',zone:'open-court',depth:'deep'},pace:'fast',shape:'descending',intendedNetClearance:.12,tacticalIntent:'finish',aggression:.8,source:'ai'};
   const e=executeShot(intent,c,players,{seed:(seed+4*7919)>>>0,balance:1});legal+=Number(e.outcome==='in');error+=e.endpointError;
   const shot=m['plan'](intent,'Finishing diagnostic',c,players,4),r=shot.resolution!;
   if(r.result){if(r.result.winner===team)won++;else lost++}else if(r.receiver)returned++;
  }
  rows.push({skill,actor,position,aim,samples,legalRate:legal/samples,immediateWinRate:won/samples,faultRate:lost/samples,returnedRate:returned/samples,meanError:error/samples});
 }
 return rows;
}
