// Isolated, unsaved practice feed. Uses the real Match planner, court and shot picker.
import {Match} from '../../src/match';
import {CourtScene} from '../../src/scene';
import {TargetPicker} from '../../src/target-picker';
import {feedErne} from '../helpers/erne-feed';
import {preloadAthletes} from '../../src/athlete';
await preloadAthletes();
const match=new Match(),scene=new CourtScene(document.querySelector('#court')!);
const picker=new TargetPicker(match,scene);
let side=1,opened=false,previous=0,attempt=0;
const status=document.querySelector('#practice-status')!,result=document.querySelector('#practice-result')!;
function feed(){
 picker.clear();feedErne(match,side);match.seed=43+attempt++;opened=false;result.textContent='';status.textContent='A straight ball is coming back to your lane…';
}
document.querySelector<HTMLButtonElement>('#feed')!.onclick=feed;
document.querySelector<HTMLButtonElement>('#side')!.onclick=()=>{side=-side;feed()};
feed();
function frame(now:number){
 const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
 match.update(dt);scene.render(match.state,now/1000,match.shot);picker.sync(true);
 if(!opened&&(match.humanContact||match.manualReceptionDecision)){opened=true;status.textContent='Erne opportunity! Tap the court to aim, then choose your shot.';}
 if(match.state.phase==='complete'){result.textContent=`${match.state.result?.winner==='home'?'You win the point!':'Point lost.'} Feed another ball to try again.`;}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
