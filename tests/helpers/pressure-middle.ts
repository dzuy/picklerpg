import {SKILLS} from '../../src/engine/model';
import type {Vec3, PlayerId, ShotIntent, ShotType, RallyShot, RallyProvider} from '../../src/engine/model';
const p=(x:number,z:number,y=0):Vec3=>({x,y,z});
const positions=(you:Vec3,partner:Vec3,left:Vec3,right:Vec3):Record<PlayerId,Vec3>=>({you,partner,'opponent-left':left,'opponent-right':right});
const start=positions(p(1.35,7.08),p(-1.5,6.95),p(-1.7,-6.55),p(1.6,-2.6));
const receive=positions(p(1.65,6.9),p(-1.5,6.9),p(-1.4,-2.65),p(1.5,-2.6));
const approach=positions(p(.6,4.45),p(-1.55,3.45),p(-1.4,-2.65),p(.65,-2.6));
const finish=positions(p(.6,4.45),p(-1.55,3.1),p(-.75,-2.65),p(.95,-2.6));
const serve=p(1.8,6.95,.65), serveBounce=p(-1.65,-5.55,.037), returnContact=p(-1.55,-6.15,.75), returnBounce=p(2.15,5.85,.037), driveContact=p(2.1,6.6,.8), blockContact=p(.25,-2.32,1.25), overheadContact=p(1.05,4.05,2.35), winner=p(-2.35,-5.55,.037);
const intent=(actor:PlayerId,type:ShotType,target:ShotIntent['target'],pace:ShotIntent['pace'],shape:ShotIntent['shape'],tacticalIntent:ShotIntent['tacticalIntent'],aggression:number,clearance:number):ShotIntent=>({schemaVersion:1,actor,type,target,pace,shape,intendedNetClearance:clearance,tacticalIntent,aggression,source:actor==='you'?'menu':'script'});
export const RALLY:RallyShot[]=[
 {aimPoint:serveBounce,actor:'you',intent:intent('you','serve',{kind:'zone',zone:'crosscourt',depth:'deep'},'medium','arc','pressure',.35,.8),title:'Serve deep',description:'Send the serve diagonally into the back of the service box.',cue:'Start the point with depth. Stay behind the baseline and prepare for the return.',contact:serve,positions:start,legs:[{from:serve,to:serveBounce,duration:1.55,arc:1.45,bounceAtEnd:true},{from:serveBounce,to:returnContact,duration:.42,arc:.22}]},
 {aimPoint:returnBounce,actor:'opponent-left',intent:intent('opponent-left','return',{kind:'zone',zone:'crosscourt',depth:'deep'},'medium','arc','advance',.3,1.5),title:'Deep crosscourt return',description:'The receiver sends the return to your opposite corner, then moves forward.',cue:'Let the return bounce. Both opponents are taking the kitchen.',contact:returnContact,positions:receive,legs:[{from:returnContact,to:returnBounce,duration:1.8,arc:2.05,bounceAtEnd:true},{from:returnBounce,to:driveContact,duration:.42,arc:.23}]},
 {aimPoint:p(.25,-4),actor:'you',intent:intent('you','drive',{kind:'zone',zone:'middle',depth:'deep'},'fast','flat','pressure',.75,.4),title:'Drive the middle',description:'The return is deep. Drive through the seam to pressure both paddles.',cue:'Attack the space between them. Move forward behind the drive, then split-step.',contact:driveContact,positions:approach,legs:[{from:driveContact,to:blockContact,duration:1.05,arc:.25}]},
 {aimPoint:p(1.05,5.3),actor:'opponent-right',intent:intent('opponent-right','block',{kind:'zone',zone:'crosscourt',depth:'transition'},'soft','arc','neutralize',.15,1.8),title:'High defensive block',description:'The middle pressure jams the defender. Their block floats into transition.',cue:'Recognize the pop-up. Set your feet outside the kitchen and prepare above your head.',contact:blockContact,positions:finish,legs:[{from:blockContact,to:overheadContact,duration:1.6,arc:1.55}]},
 {aimPoint:winner,actor:'you',intent:intent('you','overhead',{kind:'zone',zone:'open-court',depth:'deep'},'fast','descending','finish',.9,.7),title:'Put away the overhead',description:'The ball is high, your feet are set, and the far corner is open.',cue:'Contact high and finish into space. You are safely behind the kitchen line.',contact:overheadContact,positions:finish,legs:[{from:overheadContact,to:winner,duration:1.05,arc:.05,bounceAtEnd:true},{from:winner,to:p(-2.8,-7.6,.4),duration:.55,arc:.5}]}
];

/** Authored paths remain a fixture until generated execution is built in items 4–7. */
export const pressureMiddle:RallyProvider = {
 setup:()=>({
  players:(Object.keys(start) as PlayerId[]).map(id=>({id,position:{...start[id]},team:id==='you'||id==='partner'?'home':'away',handedness:'right',facing:id==='you'||id==='partner'?0:Math.PI,skills:Object.fromEntries(SKILLS.map(skill=>[skill,70])) as import('../../src/engine/model').PlayerSkills,tendencies:{aggression:.5,middlePreference:.5,kitchenApproach:.5}})),
  contact:{options:[structuredClone(RALLY[0])]},
 }),
 next(state){
  if(state.shotHistory.length===RALLY.length) return {kind:'point-end',result:{winner:'home',reason:'winner'}};
  const shot=RALLY[state.shotHistory.length];
  if(!shot) throw new Error('Fixture has no next contact.');
  return {kind:'contact',contact:{options:[structuredClone(shot)]}};
 }
};
