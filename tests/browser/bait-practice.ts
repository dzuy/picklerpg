import {Match} from '../../src/match';
import {CourtScene} from '../../src/scene';
import {TargetPicker} from '../../src/target-picker';
import {setupBaitPractice} from '../helpers/bait-practice';
import {preloadAthletes} from '../../src/athlete';
await preloadAthletes();
const match=new Match(),scene=new CourtScene(document.querySelector('#court')!),picker=new TargetPicker(match,scene);
const status=document.querySelector('#practice-status')!,result=document.querySelector('#practice-result')!,strong=document.querySelector<HTMLInputElement>('#strong')!;
let previous=0,attempt=15;
function reset(seed=15){picker.clear();setupBaitPractice(match,seed,strong.checked);result.textContent='';status.textContent='Pull the receiver wide with a dink, then look for an attack. You control both teammates.';}
function example(wide:boolean){
 reset();const choice=match.targetingMenu.find(c=>c.intent.type==='dink')!;
 match.playMenuTarget(choice,{x:wide?2.8:.4,z:-1.4});
}
document.querySelector<HTMLButtonElement>('#wide')!.onclick=()=>example(true);
document.querySelector<HTMLButtonElement>('#middle')!.onclick=()=>example(false);
document.querySelector<HTMLButtonElement>('#free')!.onclick=()=>reset(++attempt);
strong.onchange=()=>reset();reset();
function frame(now:number){
 const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
 match.update(dt);scene.render(match.state,now/1000,match.shot);picker.sync(true);
 if(match.state.shotHistory.length===1)status.textContent='Watch the receiver’s reach and balance as they return your setup.';
 if(match.state.shotHistory.length===2&&(match.manualReceptionDecision||match.humanContact))status.textContent=match.state.incomingPopUp?'Pop-up! Tap the open court and choose your attack.':'They kept the return low. Choose your next shot or compare the wide setup.';
 if(match.state.shotHistory.length>2)status.textContent='Keep playing the rally, or try another setup. An opening is not a guaranteed winner.';
 if(match.state.phase==='complete')result.textContent=match.state.result?.winner==='home'?'You won the point. Try another setup!':'Point lost. Try another placement or reply.';
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
