import {Match} from '../../src/match';
import {RallyEngine} from '../../src/engine/rally-engine';
/** Free targeting, real reception geometry; only the opponent's preference is constrained. */
export function setupBaitPractice(match:Match,seed=1,strong=false){
 match.startPractice('wide');match.seed=seed;match.partnerAutonomy=false;match.brainMode='local';
 const players=structuredClone(match.state.players);
 players[0].position={x:-1.5,y:0,z:2.65};players[1].position={x:1.5,y:0,z:2.7};
 players[2].position={x:.4,y:0,z:-2.65};players[3].position={x:-2,y:0,z:-2.65};
 for(const p of players){
  if(p.team==='home'){p.skills.dink=95;p.skills.hands=95;p.skills.movement=90;}
  else {p.skills.dink=strong?95:80;p.skills.reset=strong?95:55;p.skills.hands=strong?95:45;p.skills.movement=65;p.skills.drive=45;p.skills.overhead=45;}
 }
 const context={contact:{x:-1.1,y:.65,z:2.3},feet:players[0].position,bounced:true,opening:'rally' as const,twoBounceSatisfied:true,incomingSpeed:3};
 match.engine=new RallyEngine({setup:()=>({players,contact:{options:match['options']('you',context,players,3)}}),shouldAutoPlay:()=>false,next:(state,shot)=>{
  const next=match['nextContact'](state,shot);
  if(next.kind==='contact'&&next.contact.options[0].actor.startsWith('opponent')){
   const options=next.contact.options;
   // Prefer a soft reply in this drill; contact and execution remain real.
   const soft=options.find(s=>s.intent.type==='dink')??options.find(s=>s.intent.type==='reset')??options.find(s=>s.intent.type==='block');
   if(soft)next.contact.options=[soft];
  }
  return next;
 }});
 match.state.shotIndex=3;match.state.bounces=2;
}
