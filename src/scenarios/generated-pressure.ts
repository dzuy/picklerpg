import {planPositions} from '../engine/positioning';
import {generateTrajectory,interceptFlight,reboundFlight} from '../engine/trajectory';
import {RALLY,pressureMiddle} from './pressure-middle';
import type {RallyProvider,PlayerState,Vec3,RallyShot} from '../engine/model';
/** The tactical sequence is guided, but every flight is generated from its intent.
 * Receiver selection is scenario policy; team positioning is computed from tactical state. */
function plan(index:number,contact:Vec3,players:PlayerState[],incomingSpeed:number):RallyShot{
 const template=RALLY[index],intent=structuredClone(template.intent);
 if(index===3)intent.target={kind:'zone',zone:'crosscourt',depth:'deep'};
 const actor=players.find(p=>p.id===intent.actor)!;
 const generated=generateTrajectory(intent,{contact,feet:actor.position,bounced:index===1||index===2,opening:index===0?'serve':index===1?'return':'rally',twoBounceSatisfied:index>=2,incomingSpeed},players);
 let legs=[generated.leg];
 if(index<=1)legs.push(reboundFlight(generated.leg));
 if(index===2||index===3){const receiverZ=index===2?-2.32:3;const t=(receiverZ-contact.z)/(generated.leg.to.z-contact.z);legs=[interceptFlight(generated.leg,t)]}
 const positions=planPositions({players,intent,endpoint:legs.at(-1)!.to,receiver:index<4?RALLY[index+1].actor:null,completedShots:index,duration:legs.reduce((sum,leg)=>sum+leg.duration,0)});
 return {...structuredClone(template),contact:{...contact},intent,aimPoint:generated.aimPoint,legs,positions};
}
export const generatedPressure:RallyProvider={
 setup(){const setup=pressureMiddle.setup();setup.contact={options:[plan(0,RALLY[0].contact,setup.players,0)]};return setup},
 next(state){const index=state.shotHistory.length;if(index===5)return {kind:'point-end',result:{winner:'home',reason:'winner'}};
  return {kind:'contact',contact:{options:[plan(index,state.ball.position,state.players,Math.hypot(state.ball.velocity.x,state.ball.velocity.y,state.ball.velocity.z))]}};
 }
};
