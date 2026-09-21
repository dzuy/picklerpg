// Isolated, unsaved practice feed. Uses the real Match planner, court and shot picker.
import {Match} from '../../src/match';
import {CourtScene} from '../../src/scene';
import {TargetPicker} from '../../src/target-picker';
import {RallyEngine} from '../../src/engine/rally-engine';
import {preloadAthletes} from '../../src/athlete';
import type {RallyShot} from '../../src/engine/model';
await preloadAthletes();
const match=new Match(),scene=new CourtScene(document.querySelector('#court')!);
const picker=new TargetPicker(match,scene);
let side=1,opened=false,previous=0,attempt=0;
const status=document.querySelector('#practice-status')!,result=document.querySelector('#practice-result')!;
function feed(){
 picker.clear();match.startPractice('wide');match.seed=42+attempt++;
 const players=structuredClone(match.state.players);
 const contact={x:side*4.2,y:.4,z:2.5},feet={x:side*4,y:0,z:2.7};
 const hitter=players.find(p=>p.id==='opponent-left')!;hitter.position={x:-side*1.5,y:0,z:-2.8};
 players.find(p=>p.id==='you')!.position={x:side*1.6,y:0,z:2.8};
 const start={x:-side*1.5,y:.7,z:-2.4},bounce={x:side*2.95,y:.037,z:1.45};
 const positions=Object.fromEntries(players.map(p=>[p.id,{...p.position}]));positions.you=feet;
 const incoming:RallyShot={actor:hitter.id,contact:start,aimPoint:bounce,intent:{schemaVersion:1,actor:hitter.id,type:'dink',target:{kind:'point',x:bounce.x,z:bounce.z},pace:'soft',shape:'arc',intendedNetClearance:.25,tacticalIntent:'pressure',aggression:.5,source:'menu'},legs:[{from:start,to:bounce,duration:1.3,arc:1,bounceAtEnd:true},{from:bounce,to:contact,duration:.45,arc:.12,bounceAtEnd:false}],positions,title:'Wide crosscourt dink',description:'A sharp angle pulls you outside the post.',cue:'Wide dink incoming',resolution:{receiver:'you',bounced:true}};
 match.engine=new RallyEngine({setup:()=>({players,contact:{options:[incoming]}}),shouldAutoPlay:()=>false,next:(state,shot)=>{
  if(shot.actor===hitter.id&&state.shotIndex===3){
   const c={contact,feet,bounced:true,opening:'rally' as const,twoBounceSatisfied:true,incomingSpeed:3};
   return {kind:'contact' as const,contact:{options:match['options']('you',c,state.players,3)}};
  }
  return match['nextContact'](state,shot);
 }});
 match.state.shotIndex=2;match.state.bounces=2;
 match.engine.submitIntent(incoming.intent);opened=false;result.textContent='';status.textContent='Watch the wide dink pull you outside the post…';
}
document.querySelector<HTMLButtonElement>('#feed')!.onclick=feed;
document.querySelector<HTMLButtonElement>('#side')!.onclick=()=>{side=-side;feed()};
document.querySelector<HTMLButtonElement>('#celebrate')!.onclick=()=>{picker.clear();scene.celebrateAtp('home',performance.now()/1000)};
feed();
function frame(now:number){
 const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
 match.update(dt);scene.render(match.state,now/1000,match.shot);picker.sync(true);
 if(!opened&&match.humanContact){opened=true;status.textContent='Wide ball! Tap the court to aim, then choose your shot.';}
 if(match.state.phase==='complete'){result.textContent=`${match.state.result?.winner==='home'?'You win the point!':'Point lost.'} Feed another ball to try again.`;}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
