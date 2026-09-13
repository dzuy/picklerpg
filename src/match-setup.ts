import {AvatarThumbnails} from './avatar-preview';
import {LOOKS} from './player-looks';
import {newPlayer,type DesignedPlayer} from './player-design';
import {summarizeSkills} from './player-skill-summary';
import type {PlayerId} from './engine/model';
import './match-setup.css';
const slots:PlayerId[]=['you','partner','opponent-left','opponent-right'];
const labels=['Your player','Your partner','Opponent 1','Opponent 2'];
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export class MatchSetup {
 readonly element=document.createElement('main');
 private players:DesignedPlayer[]=[];private selected:string[]=[];private portraits:AvatarThumbnails|undefined;
 constructor(private start:(players:Record<PlayerId,DesignedPlayer>)=>void,back:()=>void){
  this.element.id='match-setup';this.element.hidden=true;this.element.setAttribute('aria-labelledby','setup-title');document.body.append(this.element);
  this.element.addEventListener('click',event=>{
   const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
   if(button.dataset.action==='back')back();
   if(button.dataset.action==='random'){
    const shuffled=[...this.players];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
    this.selected=shuffled.slice(0,4).map(p=>p.id);this.render();this.element.querySelector<HTMLButtonElement>('[data-action=random]')!.focus();
   }
   if(button.dataset.step){const slot=Number(button.dataset.slot),index=this.players.findIndex(p=>p.id===this.selected[slot]),step=Number(button.dataset.step);let next=index;
    do{next=(next+step+this.players.length)%this.players.length}while(this.selected.some((id,i)=>i!==slot&&id===this.players[next].id));
    this.selected[slot]=this.players[next].id;this.render();this.element.querySelector<HTMLButtonElement>(`[data-slot="${slot}"][data-step="${step}"]`)!.focus();
   }
   if(button.dataset.action==='start')this.start(Object.fromEntries(slots.map((slot,i)=>[slot,structuredClone(this.players.find(p=>p.id===this.selected[i])!)])) as Record<PlayerId,DesignedPlayer>);
  });
  this.element.addEventListener('change',event=>{const select=event.target as HTMLSelectElement;if(select.dataset.playerSlot===undefined)return;this.selected[Number(select.dataset.playerSlot)]=select.value;this.render();this.element.querySelector<HTMLSelectElement>(`[data-player-slot="${select.dataset.playerSlot}"]`)!.focus()});
 }
 show(saved:DesignedPlayer[],current:(DesignedPlayer|null)[]){
  this.players=[...saved,...LOOKS.map((look,i)=>({...newPlayer(`preset-${i}`),name:look.name,appearance:{...look.appearance},skills:{...look.skills}}))];
  this.selected=[];
  for(const player of current){const candidate=this.players.find(p=>p.id===player?.id)??this.players.find(p=>p.name===player?.name);this.selected.push(candidate&&!this.selected.includes(candidate.id)?candidate.id:this.players.find(p=>!this.selected.includes(p.id))!.id)}
  this.render();this.element.hidden=false;this.element.querySelector<HTMLButtonElement>('[data-action=back]')!.focus();
 }
 hide(){this.element.hidden=true}
 private render(){
  const chosen=this.selected.map(id=>this.players.find(p=>p.id===id)!);
  const card=(i:number)=>{const player=chosen[i],look=LOOKS.find(p=>p.name===player.name),rating=summarizeSkills(player.skills).estimatedDupr.toFixed(2);let image='';
   try{this.portraits??=new AvatarThumbnails(384);image=this.portraits.get(player.appearance,'full')}catch{}
   return `<article class="setup-player" style="--player-color:${player.appearance.jersey}"><div class="setup-slot-label">${labels[i]}</div><div class="setup-portrait">${image?`<img src="${image}" alt="${escape(player.name)}">`:''}</div><div class="setup-picker"><button type="button" data-slot="${i}" data-step="-1" aria-label="Previous ${labels[i].toLowerCase()}">‹</button><select data-player-slot="${i}" aria-label="${labels[i]}">${this.players.map(p=>`<option value="${escape(p.id)}" ${p.id===player.id?'selected':''} ${this.selected.some((id,index)=>index!==i&&id===p.id)?'disabled':''}>${escape(p.name)}</option>`).join('')}</select><button type="button" data-slot="${i}" data-step="1" aria-label="Next ${labels[i].toLowerCase()}">›</button></div><span class="setup-role">${escape(look?.role??'Custom player')}</span><p class="setup-rating" title="Game skill estimate, not an official DUPR rating">Estimated DUPR <strong>${rating}</strong></p></article>`;
  };
  this.element.innerHTML=`<header class="setup-top"><button type="button" data-action="back">← Back</button><span>PICKLE RPG</span><span>SMALL GAME. BIG RALLIES.</span></header><div class="setup-heading"><div><h1 id="setup-title">Pick your doubles matchup</h1><p>Four players. One court. Big rallies await.</p></div><button type="button" data-action="random">⤨ Randomize Players</button></div><div class="setup-matchup"><section class="setup-team setup-home" aria-label="Your team"><div class="setup-team-title"><strong>Team A · Your team</strong><span>${escape(chosen[0].name)} + ${escape(chosen[1].name)}</span></div><div class="setup-team-players">${card(0)}${card(1)}</div></section><span class="setup-versus" aria-hidden="true">VS</span><section class="setup-team setup-away" aria-label="Opponent team"><div class="setup-team-title"><strong>Team B</strong><span>${escape(chosen[2].name)} + ${escape(chosen[3].name)}</span></div><div class="setup-team-players">${card(2)}${card(3)}</div></section></div><section class="setup-locations" aria-label="Court selection"><div class="setup-location-heading"><h2>Choose a location</h2><p>More courts are on the way.</p></div><div class="setup-courts"><button class="setup-court setup-garden" type="button" aria-pressed="true" aria-label="Garden Court, selected"><span class="setup-court-art" aria-hidden="true"><i></i><b>♣</b><b>♣</b><b>♣</b></span><strong>Garden Court <span>✓</span></strong><small>Green surroundings. Great rallies.</small></button><button type="button" class="setup-court setup-future" disabled><span aria-hidden="true">☀</span><strong>The Beach</strong><small>Coming soon</small></button><button type="button" class="setup-court setup-future" disabled><span aria-hidden="true">△</span><strong>The Mountaintop</strong><small>Coming soon</small></button></div><button type="button" class="setup-start" data-action="start">Start Match →</button></section>`;
 }
}
