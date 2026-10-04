import {CourtTargetPicker} from './target-picker';
import {assessChoice} from './shot-assessment';
import './rally-studio.css';
import './action-burst.css';
import {randomPlayerAppearance} from './random-player-appearance';
import {CourtScene} from './scene';
import {preloadAthletes} from './athlete';
import {newPlayer,parseLibrary,PLAYER_STORAGE_KEY,type DesignedPlayer} from './player-design';
import {ARCHETYPES} from './engine/player-profiles';
import {SLOTS} from './engine/checkpoint';
import {COURT_LOCATIONS,courtName,type CourtLocation} from './locations';
import {themeOptions,type CourtTheme} from './fun-themes';
import {BODY_HIT_REACTION_SECONDS} from './body-hit-timing';
import {parseRallyBrief,studioMatch,studioPlayback,STUDIO_PICKER_SECONDS,type StudioDecision,type StudioRequest,type StudioTake} from './rally-studio-model';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=(id:string)=>el<HTMLInputElement>(id),select=(id:string)=>el<HTMLSelectElement>(id);
const status=(message:string,error=false)=>{el('status').textContent=message;el('status').dataset.error=String(error)};
const initialNames=['Alex','Sam','Jules','Rio'],colors=['#f3dc86','#70e5c2','#ff836e','#b99af8'];
let picker:CourtTargetPicker,activeDecision:StudioDecision|null=null,shownDecision=-1,showingPower=false;
let scene:CourtScene,take:StudioTake|null=null,worker:Worker|null=null,playing=false,elapsed=0,countdown=0,last=0;
let takePlayers:DesignedPlayer[]=[],savedPlayers:DesignedPlayer[]=[];
const duration=()=>take?take.end-take.start+take.decisions.filter(d=>d.actor===select('selector-player').value).length*STUDIO_PICKER_SECONDS+(take.result==='body-hit'?BODY_HIT_REACTION_SECONDS:2):0;
const timeLabel=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function play(value:boolean){playing=value;el('play').textContent=value?'Pause':'Play'}
function lineup(){return SLOTS.map((id,i)=>{
 const saved=savedPlayers.find(player=>player.id===select(`roster-${i}`).value),player=saved?structuredClone(saved):newPlayer(`studio-${id}`);
 player.name=input(`name-${i}`).value.trim()||initialNames[i];player.appearance.jersey=input(`color-${i}`).value;
 if(!saved){player.appearance.skin=['#dba67f','#ad7553','#e7b99a','#875338'][i];player.appearance.hairStyle=i%2?'ponytail':'short'}
 let randomSeed=(Number(input('outfit-seed').value)+i*1009)>>>0;
 const wardrobe=randomPlayerAppearance(true,()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296});
 for(const key of ['outfit','outfitColor','hat','hatColor','glasses','glassesColor','lensColor','lensTranslucency','top','bottom','bottomColor','shoes','shoeStyle','accessory','paddle','paddleShape','accent'] as const)Object.assign(player.appearance,{[key]:wardrobe[key]});
 const style=select(`style-${i}`).value as keyof typeof ARCHETYPES;if(style in ARCHETYPES)player.skills={...ARCHETYPES[style].skills};return player;
})}
function appearance(players:DesignedPlayer[]){SLOTS.forEach((_,i)=>select('selector-player').options[i+1].textContent=`Player ${i+1} · ${players[i].name}`);SLOTS.forEach((id,i)=>scene.substitutePlayer(id,players[i]));scene.setPlayerNames(input('names').checked)}
function saveDraft(){
 const fields=Array.from(document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input[id],select[id],textarea[id]')).filter(field=>field.id!=='timeline');
 try{localStorage.setItem('picklebash-rally-studio-v1',JSON.stringify(Object.fromEntries(fields.map(field=>[field.id,field instanceof HTMLInputElement&&field.type==='checkbox'?field.checked:field.value]))))}catch{/* Studio remains usable without storage. */}
}
function restoreDraft(){try{const values=JSON.parse(localStorage.getItem('picklebash-rally-studio-v1')??'{}');for(const [id,value] of Object.entries(values)){const field=document.getElementById(id);if(field instanceof HTMLInputElement&&field.type==='checkbox'&&typeof value==='boolean')field.checked=value;else if((field instanceof HTMLInputElement||field instanceof HTMLSelectElement||field instanceof HTMLTextAreaElement)&&typeof value==='string'){const previous=field.value;field.value=value;if(field instanceof HTMLSelectElement&&field.selectedIndex<0)field.value=previous}}}catch{/* Ignore obsolete or unavailable drafts. */}}
function endSearch(){worker?.terminate();worker=null;el<HTMLButtonElement>('generate').disabled=false;el('cancel').hidden=true}
function request():StudioRequest {return {brief:parseRallyBrief(el<HTMLTextAreaElement>('brief').value),players:lineup(),seed:Number(input('seed').value),scoring:select('game-type').value as StudioRequest['scoring'],scope:select('scope').value as StudioRequest['scope'],attempts:Number(select('budget').value)}}
function generate(event?:Event){
 event?.preventDefault();if(!el<HTMLFormElement>('studio-form').reportValidity())return;
 try{
  const spec=request();endSearch();play(false);saveDraft();
  status('Playing real rallies to find your take…');el<HTMLButtonElement>('generate').disabled=true;el('cancel').hidden=false;
  worker=new Worker(new URL('./rally-studio-worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=event=>{const data=event.data;if(data.progress){status(`Trying rally ${data.progress} of ${spec.attempts}…`);return}endSearch();if(data.error){status(data.error,true);return}
   picker.clear();shownDecision=-1;take=data.take;takePlayers=spec.players;appearance(takePlayers);elapsed=0;input('timeline').max=String(duration());input('timeline').disabled=false;
   for(const id of ['play','replay','record'])el<HTMLButtonElement>(id).disabled=false;
   status(`Found in ${take!.attempt} ${take!.attempt===1?'rally':'rallies'}. Ready to record. Use seed ${take!.seed} to find this take again.`);play(true);
  };
  worker.onerror=()=>{endSearch();status('The rally search could not finish. Try again with a smaller search budget.',true)};
  worker.postMessage(spec);
 }catch(error){endSearch();status((error as Error).message,true)}
}
function recording(value:boolean){document.body.classList.toggle('recording',value);el('exit-recording').hidden=!value;countdown=value?3:0;el('countdown').hidden=!value;if(value){elapsed=0;play(false);window.scrollTo(0,0)}else play(false)}
function format(){const [width,height]=select('format').value.split(',').map(Number);el('recording-frame').style.width=`${width}px`;el('recording-frame').style.height=`${height}px`;el('dimensions').textContent=`${width} × ${height} · portrait`}
async function start(){
 if(!import.meta.env.DEV){status('Rally Studio is available on the local development server.',true);el<HTMLButtonElement>('generate').disabled=true;return}
 select('location').innerHTML=COURT_LOCATIONS.map(c=>`<option value="${c.id}">${courtName(c.id)}</option>`).join('');select('location').value='venice';select('theme').innerHTML=themeOptions();
 el('lineup').innerHTML=SLOTS.map((_,i)=>`${i%2===0?`<p class="player-team">${i<2?'NEAR TEAM':'FAR TEAM'}</p>`:''}<select id="roster-${i}" class="roster-pick" aria-label="Player ${i+1} character"><option value="">Studio player ${i+1}</option></select><div class="player-row"><input id="color-${i}" aria-label="Player ${i+1} jersey color" type="color" value="${colors[i]}"><input id="name-${i}" aria-label="Player ${i+1} name" type="text" maxlength="24" value="${initialNames[i]}"><select id="style-${i}" aria-label="Player ${i+1} playing style">${Object.entries(ARCHETYPES).map(([key,profile])=>`<option value="${key}"${key==='allCourt'?' selected':''}>${profile.name}</option>`).join('')}</select></div>`).join('');
 try{savedPlayers=parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY)).players}catch{/* Saved roster is optional and read-only. */}
 SLOTS.forEach((_,i)=>{for(const player of savedPlayers)select(`roster-${i}`).add(new Option(player.name,player.id));select(`style-${i}`).add(new Option('Saved skills','saved'));select(`roster-${i}`).onchange=()=>{const player=savedPlayers.find(p=>p.id===select(`roster-${i}`).value);if(player){input(`name-${i}`).value=player.name;input(`color-${i}`).value=player.appearance.jersey;select(`style-${i}`).value='saved'}else select(`style-${i}`).value='allCourt'}});
 input('outfit-seed').value=String(crypto.getRandomValues(new Uint32Array(1))[0]);restoreDraft();format();await preloadAthletes();scene=new CourtScene(el('studio-court'));scene.setGuides(input('guides').checked);scene.setLocation(select('location').value as CourtLocation);scene.setTheme(select('theme').value as CourtTheme);appearance(lineup());

 picker=new CourtTargetPicker({
  get team(){return activeDecision?.actor==='you'||activeDecision?.actor==='partner'?'home':'away'},
  get choices(){return activeDecision?[{intent:activeDecision.selected},...activeDecision.options.map(intent=>({intent}))]:[]},
  get context(){return activeDecision},get decision(){return String(activeDecision?.index)},get enabled(){return !!activeDecision},
  assess:(choice,point)=>assessChoice(choice,point,activeDecision?.assessment??[]),
  validate:()=>{if(!activeDecision)throw Error('No recorded decision')},play:()=>{},
 },scene,{host:el('recording-frame'),replay:true});
 select('selector-player').onchange=()=>{picker.clear();activeDecision=null;shownDecision=-1;elapsed=0;input('timeline').max=String(duration());};
 const idle=studioMatch({brief:parseRallyBrief('3-5 hits'),players:lineup(),seed:1741,scoring:'side-out-doubles',scope:'finish',attempts:1},1741);scene.render(idle.state,0,idle.shot);
 el<HTMLFormElement>('studio-form').onsubmit=generate;el('cancel').onclick=()=>{endSearch();status(take?'Search cancelled. Your previous take is still available.':'Search cancelled. Adjust the brief and try again.')};
 document.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach(button=>button.onclick=()=>{el<HTMLTextAreaElement>('brief').value=button.dataset.prompt!;saveDraft()});
 select('location').onchange=()=>scene.setLocation(select('location').value as CourtLocation);select('theme').onchange=()=>scene.setTheme(select('theme').value as CourtTheme);
 input('guides').onchange=()=>scene.setGuides(input('guides').checked);
 el('shuffle-outfits').onclick=()=>{input('outfit-seed').value=String(crypto.getRandomValues(new Uint32Array(1))[0]);const players=lineup();if(take){players.forEach((player,i)=>takePlayers[i].appearance=player.appearance);appearance(takePlayers)}else appearance(players);saveDraft()};
 input('names').onchange=()=>scene.setPlayerNames(input('names').checked);input('branding').onchange=()=>el('clip-brand').hidden=!input('branding').checked;el('clip-brand').hidden=!input('branding').checked;
 select('format').onchange=format;el('camera').onclick=()=>scene.resetCamera();el('play').onclick=()=>{if(elapsed>=duration())elapsed=0;play(!playing)};el('replay').onclick=()=>{elapsed=0;play(true)};input('timeline').oninput=()=>{elapsed=Number(input('timeline').value);play(false)};
 el('record').onclick=()=>recording(true);el('exit-recording').onclick=()=>recording(false);window.addEventListener('keydown',event=>{if(event.key==='Escape')recording(false);if(event.code==='Space'&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test((event.target as HTMLElement).tagName)&&take){event.preventDefault();play(!playing)}});
 document.addEventListener('change',saveDraft);window.addEventListener('pagehide',endSearch,{once:true});
 status('Ready. Describe a rally and find your first take.');
 function frame(now:number){
  const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
  if(!document.hidden){if(countdown>0){countdown=Math.max(0,countdown-dt);el('countdown').textContent=String(Math.ceil(countdown));if(!countdown){el('countdown').hidden=true;play(true)}}
   else if(playing&&take){elapsed=Math.min(duration(),elapsed+dt*Number(select('speed').value));if(elapsed>=duration()){if(input('loop').checked)elapsed=0;else play(false)}}}
  if(take){
   const cursor=studioPlayback(take,elapsed,select('selector-player').value),target=cursor.time;let lo=0,hi=take.frames.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(take.frames[mid].simulationTime<=target)lo=mid;else hi=mid-1}
   const state=structuredClone(take.frames[lo]),shot=take.shots[lo],next=take.frames[lo+1];
   if(next&&state.phase==='flight'&&next.shotIndex===state.shotIndex&&next.simulationTime>state.simulationTime){const alpha=Math.min(1,Math.max(0,(target-state.simulationTime)/(next.simulationTime-state.simulationTime)));for(const axis of ['x','y','z'] as const){state.ball.position[axis]+=(next.ball.position[axis]-state.ball.position[axis])*alpha;state.players.forEach((p,i)=>p.position[axis]+=(next.players[i].position[axis]-p.position[axis])*alpha)}state.simulationTime=target}
   scene.setReplayBodyHit(take.result==='body-hit'&&target>=take.end&&state.result?.playerId?{player:state.result.playerId,height:state.ball.position.y,age:target-take.end}:null);
   if(cursor.decision){state.ball.position={...shot.contact};state.phase='decision';state.paused=true;}
   scene.render(state,elapsed,shot);
   activeDecision=cursor.decision;
   if(activeDecision){
    if(shownDecision!==activeDecision.index||(showingPower&&cursor.age<1)){picker.clear();showingPower=false;shownDecision=activeDecision.index;picker.present(activeDecision.point);scene.setShotPreview(shot);}
    picker.sync(true);
    if(cursor.age>=1){showingPower=true;picker.demonstratePower(activeDecision.selected,.5+((activeDecision.selected.power??.5)-.5)*Math.min(1,(cursor.age-1)/.7));}
   }else if(shownDecision!==-1){picker.clear();shownDecision=-1;}
   el('clip-caption').textContent=target>=take.end?(take.result==='body-hit'?'BAGGED.':take.result==='net'?'SO CLOSE.':take.result==='out'?'JUST OUT.':'POINT.'):'';
  }else scene.render(idle.state,now/1000,idle.shot);
  input('timeline').value=String(elapsed);el('time').textContent=`${timeLabel(elapsed)} / ${timeLabel(duration())}`;requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}
void start().catch(error=>{status(`Could not open Rally Studio: ${(error as Error).message}`,true);el<HTMLButtonElement>('generate').disabled=true});
