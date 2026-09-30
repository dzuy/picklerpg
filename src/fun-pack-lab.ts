import {CourtScene} from './scene';
import {preloadAthletes} from './athlete';
import {Match} from './match';
import {newPlayer} from './player-design';
import {COURT_LOCATIONS,courtName,type CourtLocation} from './locations';
import {FUN_THEMES,applyFunTheme,themeOptions,isCourtTheme,type CourtTheme} from './fun-themes';
import {FunAudio} from './fun-audio';
import {SLOTS} from './engine/checkpoint';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
async function start(){
 if(!import.meta.env.DEV){el('error').textContent='This testing area is available in the local development server.';return}
 await preloadAthletes();const scene=new CourtScene(el('court'));scene.setGuides(false);scene.setPlayerNames(false);
 const music=new FunAudio();el('audio-control').append(music.control());
 const controls=Object.fromEntries(['theme','players','paddle','location','variant','speed'].map(id=>[id,el<HTMLSelectElement>(id)]));
 for(const key of ['theme','players','paddle'])controls[key].innerHTML=themeOptions();
 controls.location.innerHTML=COURT_LOCATIONS.map(c=>`<option value="${c.id}">${courtName(c.id)}</option>`).join('');controls.location.value='venice';scene.setLocation('venice');
 let match=new Match(),paused=false,previous=0,complete=0;
 const originals=SLOTS.map((id,i)=>{const p=newPlayer(`lab-${id}`);p.name=['Alex','Sam','Jules','Rio'][i];p.appearance={...p.appearance,skin:['#dba67f','#ad7553','#e7b99a','#875338'][i],hairStyle:i%2?'ponytail':'short'};return p});
 function looks(){const theme=controls.players.value as CourtTheme,variant=Number(controls.variant.value) as 0|1,t=FUN_THEMES.find(t=>t.id===theme);controls.variant.options[0].text=t?.looks[0]??'Original';controls.variant.options[1].text=t?.looks[1]??'Original';SLOTS.forEach((id,i)=>scene.substitutePlayer(id,{...originals[i],appearance:{...applyFunTheme(originals[i].appearance,theme,variant),funPaddle:controls.paddle.value as CourtTheme}}))}
 function restart(){match=new Match();match.startSoloMatch(11);match.playerAutonomy=true;match.partnerAutonomy=true;match.brainMode='local';complete=0;looks()}
 function atmosphere(){const theme=controls.theme.value as CourtTheme;scene.setTheme(theme);music.setTheme(theme);el('description').textContent=theme==='none'?'Original court scenery. No theme decorations.':theme==='disco'?'Disco Inferno: scattered mirrorball lights with varied sizes and stretched shapes.':theme==='fairy'?'Fairy Tales: woodland cottage, apple tree, enchanted carriage, glass slipper, and a colorful meadow.':theme==='horrified'?'Spooky: pumpkin clusters, friendly ghosts, bats, cobwebs, and a bubbling cauldron.':theme==='eighties'?'80’s Night: arcade cabinets, roller skates, Memphis patterns, neon palms, and a music corner.':`${FUN_THEMES.find(t=>t.id===theme)!.name}: independent court decorations, player looks, and paddles.`}
 controls.theme.onchange=atmosphere;controls.location.onchange=()=>scene.setLocation(controls.location.value as CourtLocation);
 controls.players.onchange=()=>{controls.paddle.value=controls.players.value;looks()};controls.variant.onchange=looks;controls.paddle.onchange=looks;
 el('match-theme').onclick=()=>{controls.players.value=controls.theme.value;controls.paddle.value=controls.theme.value;looks()};
 el('pause').onclick=()=>{paused=!paused;el('pause').textContent=paused?'Resume play':'Pause play'};
 el('camera').onclick=()=>scene.resetCamera();el('restart').onclick=restart;
 el<HTMLInputElement>('motion').onchange=()=>scene.setThemeMotion(!el<HTMLInputElement>('motion').checked);
 restart();const requestedTheme=new URLSearchParams(location.search).get('theme'),initialTheme=isCourtTheme(requestedTheme)?requestedTheme:'disco';controls.theme.value=initialTheme;controls.players.value=initialTheme;controls.paddle.value=initialTheme;atmosphere();looks();el('error').textContent='';
 function frame(now:number){const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
  if(!document.hidden&&!paused){match.update(dt*Number(controls.speed.value));if(match.state.phase==='complete'){complete+=dt;if(complete>3){if(match.scoring.winner)restart();else match.nextPoint();complete=0}}}
  scene.render(match.state,now/1000,match.shot);el('hud').innerHTML=`${match.scoring.score.home} <span aria-hidden="true">—</span> ${match.scoring.score.away}<small>${paused?'Paused':match.state.phase==='complete'?'Point complete':match.state.phase==='flight'?'Rally in play':'Choosing the next shot'} · Point ${match.point+1}</small>`;
  requestAnimationFrame(frame);
 }requestAnimationFrame(frame);window.addEventListener('pagehide',()=>music.dispose(),{once:true});
}
void start().catch(error=>{el('error').textContent=`Could not open the court: ${(error as Error).message}`});
