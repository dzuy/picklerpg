import {loadScoringPreference} from './scoring-preference';
import {focusView} from './view-focus';
import {fillSetupPlayerCard} from './setup-player-card';
import {courtSelector} from './court-selector';
import {COURT_LOCATIONS,type CourtLocation} from './locations';
import {defaultLineup} from './multiplayer/default-lineup';
import {rosterStarters,starterIds} from './roster-membership';
import {CommunitySection} from './community-section';
import {refreshCommunityDesigns} from './community-players';
import {DEFAULT_RULES,isValidTargetScore,type ScoringMode} from './engine/scoring';
import {type PlayMode} from './engine/controllers';
import {parseLibrary,PLAYER_STORAGE_KEY,type DesignedPlayer} from './player-design';
import {browserStorage} from './browser-storage';
import {cyclePlayer,setupLineup,shufflePlayers,validLineup} from './match-setup-state';
import type {PlayerId} from './engine/model';
import './match-setup.css';
const slots:PlayerId[]=['you','partner','opponent-left','opponent-right'];
const labels=['Your player','Your partner','Opponent 1','Opponent 2'];
const graphics='/assets/picklebash-ui';
const courts=COURT_LOCATIONS.map(c=>({...c,playable:true}));
export class MatchSetup {
 readonly element=document.createElement('main');
 private players:DesignedPlayer[]=[];
 private owned:DesignedPlayer[]=[];private eligible:string[]=[];private applyStarters=false;
 private setRoster(players:DesignedPlayer[]){const own=[...this.owned,...players];this.eligible=own.map(p=>p.id);const current=this.selected.map((id,i)=>i<2&&!this.eligible.includes(id)?null:this.players.find(p=>p.id===id)??null);const lineup=setupLineup(own,current);this.players=lineup.players;this.selected=lineup.selected;if(this.applyStarters){this.selected=[...defaultLineup(own,parseLibrary(browserStorage.getItem(PLAYER_STORAGE_KEY)).activeId,'',undefined,starterIds()),...this.selected.slice(2)];this.applyStarters=false;}this.restrictTeam();if(!this.element.hidden)this.render();}
 private restrictTeam(){for(let i=0;i<2;i++)if(!this.eligible.includes(this.selected[i])&&this.eligible.length)this.selected[i]=this.eligible.find(id=>!this.selected.slice(0,i).includes(id))??this.eligible[0];}
 private community=new CommunitySection(players=>this.setRoster(players));
 private starting=false;
 private async startSelected(){if(this.starting||!this.canStart())return;this.starting=true;const button=this.element.querySelector<HTMLButtonElement>('[data-action=start]')!;button.disabled=true;const selection=this.selected.join('|'),mode=this.mode,court=this.court,target=this.target;try{const players=await refreshCommunityDesigns(this.selected.map(id=>this.players.find(p=>p.id===id)!));if(this.element.hidden||this.selected.join('|')!==selection||this.mode!==mode||this.court!==court||this.target!==target)return;this.start(Object.fromEntries(slots.map((slot,i)=>[slot,players[i]])) as Record<PlayerId,DesignedPlayer>,mode,court,target);}catch(e){const status=this.element.querySelector<HTMLElement>('[role=status]')!;status.className='setup-community-error';status.textContent=(e as Error).message;}finally{this.starting=false;button.disabled=!this.canStart();}}
 private selected:string[]=[];
 private court:CourtLocation='venice';
 private mode:PlayMode='solo';
 private scoring:ScoringMode='rally-doubles';
 private target=DEFAULT_RULES.target;
 private gesture:{slot:number;x:number;y:number;id:number}|null=null;
 constructor(private start:(players:Record<PlayerId,DesignedPlayer>,mode:PlayMode,court:CourtLocation,target:number)=>void,back:()=>void,private scoringChanged:(value:ScoringMode)=>void=()=>{}){
  this.element.id='match-setup';this.element.hidden=true;this.element.setAttribute('aria-labelledby','setup-title');document.body.append(this.element);
  this.element.addEventListener('change',event=>{const el=event.target as HTMLSelectElement;if(el.id==='setup-scoring'&&(el.value==='rally-doubles'||el.value==='side-out-doubles')){this.scoring=el.value;this.scoringChanged(this.scoring);}});
  this.element.addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(input.id==='setup-target'){this.target=input.valueAsNumber;this.element.querySelector<HTMLButtonElement>('[data-action=start]')!.disabled=!this.canStart();}});
  this.element.addEventListener('click',event=>{
   const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
   if(button.dataset.action==='back')back();
   if(button.dataset.mode==='solo'||button.dataset.mode==='local-human'){this.mode=button.dataset.mode;this.refresh(`[data-mode="${this.mode}"]`,this.mode==='solo'?'Solo selected.':'Two players selected. Each person controls one team using their characters’ skills.');}
   if(button.dataset.action==='random'){
    this.selected=[this.selected[0],...shufflePlayers(this.players.map(p=>p.id).filter(id=>id!==this.selected[0])).slice(0,3)];
    this.restrictTeam();this.refresh('[data-action=random]','New matchup selected.');
   }
   if(button.dataset.step)this.cycle(Number(button.dataset.slot),Number(button.dataset.step));
   if(button.dataset.court&&courts.some(c=>c.id===button.dataset.court&&c.playable)){
    this.court=button.dataset.court as CourtLocation;this.refresh(`[data-court="${this.court}"]`,`${courts.find(c=>c.id===this.court)!.name} selected. Same regulation court and gameplay.`);
   }
   if(button.dataset.action==='start')void this.startSelected();
  });
  this.element.addEventListener('pointerdown',event=>{
   if(event.pointerType==='mouse'||(event.target as HTMLElement).closest('button'))return;
   const card=(event.target as HTMLElement).closest<HTMLElement>('[data-card-slot]');
   if(card&&Number(card.dataset.cardSlot)>=0)this.gesture={slot:Number(card.dataset.cardSlot),x:event.clientX,y:event.clientY,id:event.pointerId};
  });
  this.element.addEventListener('pointerup',event=>{
   const gesture=this.gesture;this.gesture=null;if(!gesture||gesture.id!==event.pointerId)return;
   const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
   if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3)this.cycle(gesture.slot,dx<0?1:-1);
  });
  this.element.addEventListener('pointercancel',()=>{this.gesture=null});
  this.element.addEventListener('keydown',event=>{
   const card=(event.target as HTMLElement).closest<HTMLElement>('[data-card-slot]');
   if(card&&Number(card.dataset.cardSlot)>=0&&['ArrowLeft','ArrowRight'].includes(event.key)){
    event.preventDefault();this.cycle(Number(card.dataset.cardSlot),event.key==='ArrowLeft'?-1:1);
   }
  });
 }
 show(saved:DesignedPlayer[],current:(DesignedPlayer|null)[],mode:PlayMode='solo',scoring:ScoringMode='rally-doubles'){
  this.target=loadScoringPreference({scoring,target:DEFAULT_RULES.target}).target;
  this.applyStarters=true;this.mode='solo';this.scoring=scoring;this.owned=saved;this.eligible=[...saved,...rosterStarters()].map(p=>p.id);
  const lineup=setupLineup([...saved,...rosterStarters()],current);this.players=lineup.players;this.selected=lineup.selected;this.restrictTeam();
  const opponents=shufflePlayers(this.players.map(p=>p.id));this.selected=[...this.selected.slice(0,2),...opponents.slice(0,2)];
  this.render();this.element.hidden=false;void this.community.load();window.scrollTo(0,0);focusView(this.element);
 }
 hide(){this.element.hidden=true;this.gesture=null}
 private canStart(){return isValidTargetScore(this.target)&&this.selected.slice(0,2).every(id=>this.eligible.includes(id))&&validLineup(this.players.map(p=>p.id),this.selected)&&courts.some(c=>c.id===this.court&&c.playable)}
 private refresh(focus:string,announcement:string){
  const keyboard=document.activeElement?.matches(':focus-visible');
  const scroll=this.element.querySelector('.setup-courts')?.scrollLeft??0;
  this.render();this.element.querySelector('.setup-courts')!.scrollLeft=scroll;
  if(keyboard)this.element.querySelector<HTMLElement>(focus)?.focus({preventScroll:true});
  this.element.querySelector('[role=status]')!.textContent=announcement;
 }
 private cycle(slot:number,step:number){
  this.selected=cyclePlayer(slot<2?this.eligible:this.players.map(p=>p.id),this.selected,slot,step);this.restrictTeam();
  this.refresh(`[data-slot="${slot}"][data-step="${step}"]`,this.selected.map((id,i)=>`${labels[i]}: ${this.players.find(p=>p.id===id)!.name}`).join('. '));
  this.element.querySelector(`[data-card-slot="${slot}"]`)?.classList.add('setup-changed');
 }
 private render(){
  const labels=['Team A athlete 1','Team A athlete 2','Team B athlete 1','Team B athlete 2'];
  const chosen=this.selected.map(id=>this.players.find(p=>p.id===id)!);
  const card=(i:number)=>`<article data-card-slot="${i}"></article>`;

  this.element.innerHTML=`<div class="setup-shell"><header class="setup-page-header"><nav class="setup-navigation" aria-label="Game setup navigation"><button type="button" data-action="back"><span aria-hidden="true">←</span> Back to Play Menu</button></nav><h1 id="setup-title">Play Solo</h1></header>
   <div class="setup-rules">
   <label class="setup-scoring" for="setup-scoring">Scoring <select id="setup-scoring"><option value="rally-doubles" ${this.scoring==='rally-doubles'?'selected':''}>Rally scoring</option><option value="side-out-doubles" ${this.scoring==='side-out-doubles'?'selected':''}>Side-out scoring</option></select></label><label class="setup-scoring" for="setup-target">Points limit <input id="setup-target" type="number" inputmode="numeric" min="1" max="99" step="1" required value="${Number.isFinite(this.target)?this.target:''}" aria-describedby="setup-win-by"><span id="setup-win-by">Win by 2</span></label></div><div class="setup-matchup"><section class="setup-team setup-home" aria-label="${this.mode==='solo'?'Your team':'Player A team'}"><h2 class="setup-team-title">Choose Your Players</h2><p class="setup-manager">Managed by you · You choose both athletes’ shots</p><div class="setup-team-players">${card(0)}${card(1)}</div></section><div class="setup-versus" aria-hidden="true"><img src="${graphics}/badges/picklebash-badge-vs.png" alt="" draggable="false"></div><section class="setup-team setup-away" aria-label="${this.mode==='solo'?'Opponent team':'Player B team'}"><div class="setup-opponents-heading"><h2 class="setup-team-title">Choose Your Opponents</h2><button type="button" class="setup-shuffle" data-action="random" aria-label="Shuffle matchup" title="Shuffle matchup"><span aria-hidden="true">⤨</span></button></div><p class="setup-manager">Computer managed · Ready to play</p><div class="setup-team-players">${card(2)}${card(3)}</div></section></div>
   <div class="setup-lower"><section class="setup-locations" aria-labelledby="setup-location-title"><h2 id="setup-location-title">Choose your court</h2><div class="setup-courts court-selector">${courtSelector(this.court,'data-court')}</div></section><button type="button" class="setup-start" data-action="start" aria-label="Start Game" ${this.canStart()?'':'disabled'}><span>Start Game</span><span aria-hidden="true">↗</span></button></div>
   <p class="setup-sr-only" role="status" aria-live="polite" aria-atomic="true"></p></div>`;
  chosen.forEach((player,i)=>{
   const article=this.element.querySelector<HTMLElement>(`[data-card-slot="${i}"]`)!;
   const credit=player.id.startsWith('preset-')?'Starting Lineup':player.id.startsWith('community-')?'Community player':this.owned.some(p=>p.id===player.id)?'Your player':'Community player';
   fillSetupPlayerCard(article,player,credit);
   const controls=document.createElement('div');controls.className='roster-card-actions';
   for(const step of [-1,1]){const button=document.createElement('button');button.type='button';button.dataset.slot=String(i);button.dataset.step=String(step);button.textContent=step<0?'‹':'›';button.setAttribute('aria-label',`${step<0?'Previous':'Next'} ${labels[i].toLowerCase()}`);controls.append(button);}
   article.append(controls);
  });

 }
}
