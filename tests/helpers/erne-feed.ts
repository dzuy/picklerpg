import {Match} from '../../src/match';
import {RallyEngine} from '../../src/engine/rally-engine';
/** An unsaved feed through the real execution and reception planner. */
export function feedErne(match:Match,side=1,receiverX=2.65){
 match.startPractice('wide');match.seed=1;
 const players=structuredClone(match.state.players);
 const you=players.find(p=>p.id==='you')!,partner=players.find(p=>p.id==='partner')!,hitter=players.find(p=>p.id==='opponent-left')!;
 you.position={x:side*receiverX,y:0,z:2.65};you.skills.movement=95;
 partner.position={x:-side*2,y:0,z:4};
 hitter.position={x:side*2.65,y:0,z:-2.6};hitter.skills.dink=100;
 const context={contact:{x:side*2.65,y:1.1,z:-2.3},feet:hitter.position,bounced:true,opening:'rally' as const,twoBounceSatisfied:true,incomingSpeed:2};
 const incoming=match['plan']({schemaVersion:1,actor:hitter.id,type:'dink',target:{kind:'point',x:side*2.65,z:1.8},pace:'soft',shape:'arc',intendedNetClearance:1,tacticalIntent:'neutralize',aggression:.2,source:'menu'},'Sideline ball incoming',context,players,3);
 match.engine=new RallyEngine({setup:()=>({players,contact:{options:[incoming]}}),shouldAutoPlay:()=>false,next:(state,shot)=>match['nextContact'](state,shot)});
 match.state.shotIndex=2;match.state.bounces=2;match.engine.submitIntent(incoming.intent);
 return incoming;
}
