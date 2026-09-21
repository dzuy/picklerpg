import {CourtScene} from '../../src/scene';
import {Match} from '../../src/match';
import {preloadAthletes} from '../../src/athlete';
await preloadAthletes();
const match=new Match(),scene=new CourtScene(document.querySelector('#court')!);
function hit(height:number){
 const player=match.state.players.find(p=>p.id==='opponent-right')!;
 match.state.phase='complete';match.state.result={winner:'home',reason:'body-hit',playerId:player.id};match.state.ball.position={...player.position,y:height};
 scene.reactToHit(player.id,height,performance.now()/1000);
}
document.querySelector<HTMLButtonElement>('#body')!.onclick=()=>hit(.9);
document.querySelector<HTMLButtonElement>('#head')!.onclick=()=>hit(1.5);
function frame(now:number){scene.render(match.state,now/1000,match.shot);requestAnimationFrame(frame)}
requestAnimationFrame(frame);
