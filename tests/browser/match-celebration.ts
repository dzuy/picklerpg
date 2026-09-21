import {CourtScene} from '../../src/scene';
import {Match} from '../../src/match';
import {preloadAthletes} from '../../src/athlete';
await preloadAthletes();
const match=new Match(),scene=new CourtScene(document.querySelector('#court')!);
let key='',score={home:11,away:0};
const dialog=document.querySelector<HTMLDialogElement>('#result')!;
function start(home:number,away:number){dialog.close();score={home,away};key=crypto.randomUUID();match.state.phase='complete';match.state.result={winner:home>away?'home':'away',reason:'winner'};scene.finishMatch(key,score,'home','mooncrayon')}
document.querySelector<HTMLButtonElement>('#win')!.onclick=()=>start(11,0);
document.querySelector<HTMLButtonElement>('#loss')!.onclick=()=>start(0,11);
document.querySelector<HTMLButtonElement>('#normal')!.onclick=()=>start(11,9);
function frame(now:number){scene.render(match.state,now/1000,match.shot);if(key&&scene.finishMatch(key,score,'home','mooncrayon')){key='';dialog.showModal()}requestAnimationFrame(frame)}
start(11,0);requestAnimationFrame(frame);
