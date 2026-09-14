import {AvatarThumbnails} from './avatar-preview';
import {LOOKS} from './player-looks';
import type {DesignedPlayer} from './player-design';
import {summarizeSkills} from './player-skill-summary';
import {cyclePlayer,setupLineup,shufflePlayers,validLineup} from './match-setup-state';
import type {PlayerId} from './engine/model';
import './match-setup.css';
const slots:PlayerId[]=['you','partner','opponent-left','opponent-right'];
const labels=['Your player','Your partner','Opponent 1','Opponent 2'];
const assets='/assets/picklebash-select';
const graphics='/assets/picklebash-ui';
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const courts=[{id:'forest',name:'The Forest',description:'Shaded courts. Clean rallies.',playable:true},{id:'beach',name:'The Beach',description:'Sun. Sand. High stakes.',playable:false},{id:'mountaintop',name:'The Mountaintop',description:'Higher altitude. Bigger rallies.',playable:false}];
export class MatchSetup {
 readonly element=document.createElement('main');
 private players:DesignedPlayer[]=[];
 private selected:string[]=[];
 private portraits:AvatarThumbnails|undefined;
 private court='forest';
 private gesture:{slot:number;x:number;y:number;id:number}|null=null;
 constructor(private start:(players:Record<PlayerId,DesignedPlayer>)=>void,back:()=>void){
  this.element.id='match-setup';this.element.hidden=true;this.element.setAttribute('aria-labelledby','setup-title');document.body.append(this.element);
  this.element.addEventListener('click',event=>{
   const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
   if(button.dataset.action==='back')back();
   if(button.dataset.action==='random'){
    this.selected=[this.selected[0],...shufflePlayers(this.players.map(p=>p.id).filter(id=>id!==this.selected[0])).slice(0,3)];
    this.refresh('[data-action=random]','New matchup selected.');
   }
   if(button.dataset.step)this.cycle(Number(button.dataset.slot),Number(button.dataset.step));
   if(button.dataset.court&&courts.some(c=>c.id===button.dataset.court&&c.playable)){
    this.court=button.dataset.court;this.refresh(`[data-court="${this.court}"]`,'The Forest selected.');
   }
   if(button.dataset.action==='start'&&this.canStart())this.start(Object.fromEntries(slots.map((slot,i)=>[slot,structuredClone(this.players.find(p=>p.id===this.selected[i])!)])) as Record<PlayerId,DesignedPlayer>);
  });
  this.element.addEventListener('pointerdown',event=>{
   if(event.pointerType==='mouse'||(event.target as HTMLElement).closest('button'))return;
   const card=(event.target as HTMLElement).closest<HTMLElement>('[data-card-slot]');
   if(card&&Number(card.dataset.cardSlot)>0)this.gesture={slot:Number(card.dataset.cardSlot),x:event.clientX,y:event.clientY,id:event.pointerId};
  });
  this.element.addEventListener('pointerup',event=>{
   const gesture=this.gesture;this.gesture=null;if(!gesture||gesture.id!==event.pointerId)return;
   const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
   if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3)this.cycle(gesture.slot,dx<0?1:-1);
  });
  this.element.addEventListener('pointercancel',()=>{this.gesture=null});
  this.element.addEventListener('keydown',event=>{
   const card=(event.target as HTMLElement).closest<HTMLElement>('[data-card-slot]');
   if(card&&Number(card.dataset.cardSlot)>0&&['ArrowLeft','ArrowRight'].includes(event.key)){
    event.preventDefault();this.cycle(Number(card.dataset.cardSlot),event.key==='ArrowLeft'?-1:1);
   }
  });
 }
 show(saved:DesignedPlayer[],current:(DesignedPlayer|null)[]){
  const lineup=setupLineup(saved,current);this.players=lineup.players;this.selected=lineup.selected;this.court='forest';
  this.render();this.element.hidden=false;window.scrollTo(0,0);this.element.querySelector<HTMLButtonElement>('[data-action=back]')!.focus({preventScroll:true});
 }
 hide(){this.element.hidden=true;this.gesture=null}
 private canStart(){return validLineup(this.players.map(p=>p.id),this.selected)&&courts.some(c=>c.id===this.court&&c.playable)}
 private refresh(focus:string,announcement:string){
  const scroll=this.element.querySelector('.setup-courts')?.scrollLeft??0;
  this.render();this.element.querySelector('.setup-courts')!.scrollLeft=scroll;
  this.element.querySelector<HTMLElement>(focus)?.focus({preventScroll:true});
  this.element.querySelector('[role=status]')!.textContent=announcement;
 }
 private cycle(slot:number,step:number){
  this.selected=cyclePlayer(this.players.map(p=>p.id),this.selected,slot,step);
  this.refresh(`[data-slot="${slot}"][data-step="${step}"]`,this.selected.map((id,i)=>`${labels[i]}: ${this.players.find(p=>p.id===id)!.name}`).join('. '));
  this.element.querySelector(`[data-card-slot="${slot}"]`)?.classList.add('setup-changed');
 }
 private render(){
  const chosen=this.selected.map(id=>this.players.find(p=>p.id===id)!);
  const card=(i:number)=>{
   const player=chosen[i],look=LOOKS.find(p=>p.name===player.name),rating=summarizeSkills(player.skills).estimatedDupr.toFixed(2);
   const preset=LOOKS.findIndex((p,index)=>player.id===`preset-${index}`&&JSON.stringify(p.appearance)===JSON.stringify(player.appearance));
   let image=preset>=0&&preset<4?`${assets}/players/${['ema','leo','maya','jax'][preset]}-card-art.jpg`:'';
   const illustrated=Boolean(image);
   if(!image)try{this.portraits??=new AvatarThumbnails(512);image=this.portraits.get(player.appearance,`hand-${player.handedness}`)}catch{}
   return `<article class="setup-player ${i===0?'setup-you':''}" data-card-slot="${i}" aria-label="${labels[i]}: ${escape(player.name)}" style="--player-color:${escape(player.appearance.jersey)};--card-accent:${['#FF3D7D','#12E1F3','#FFD43B','#FF4F63'][i]}">
    ${i===0?'<span class="setup-you-badge">★ YOU</span>':''}
    <div class="setup-portrait ${illustrated?'setup-illustrated':''}">${image?`<img src="${image}" alt="${escape(player.name)} holding a pickleball paddle" draggable="false">`:`<span class="setup-portrait-fallback" aria-hidden="true">${escape(player.name.slice(0,1))}</span>`}</div>
    <div class="setup-player-meta"><h2>${escape(player.name)}</h2><p class="setup-role">${escape(look?.role??'Custom player')}</p><p class="setup-rating" title="Game skill estimate, not an official DUPR rating"><span>DUPR</span> <strong>${rating}</strong></p></div>
    ${i>0?`<div class="setup-picker"><button type="button" data-slot="${i}" data-step="-1" aria-label="Previous ${labels[i].toLowerCase()}">‹</button><button type="button" data-slot="${i}" data-step="1" aria-label="Next ${labels[i].toLowerCase()}">›</button></div>`:''}
   </article>`;
  };
  const lock='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3" stroke="#061A42"/></svg>';
  this.element.innerHTML=`<div class="setup-shell"><header class="setup-top"><p class="setup-motto">Rally friends.<br>Bash hard<span>✧</span></p><img class="setup-logo" src="${assets}/brand/picklebash-logo.png" alt="PickleBash — a pickleball strategy game"><p class="setup-tagline">Small court.<br>Big energy.<span></span></p><h1 id="setup-title" class="setup-sr-only">Choose your players and court</h1></header>
   <div class="setup-matchup"><section class="setup-team setup-home" aria-label="Your team"><h2 class="setup-team-title"><img src="${graphics}/banners/picklebash-banner-team-a.png" alt="Team A" draggable="false"></h2><div class="setup-team-players">${card(0)}${card(1)}</div></section><div class="setup-versus" aria-hidden="true"><img src="${graphics}/badges/picklebash-badge-vs.png" alt="" draggable="false"></div><section class="setup-team setup-away" aria-label="Opponent team"><h2 class="setup-team-title"><img src="${graphics}/banners/picklebash-banner-team-b.png" alt="Team B" draggable="false"></h2><div class="setup-team-players">${card(2)}${card(3)}</div></section></div>
   <div class="setup-lower"><section class="setup-locations" aria-labelledby="setup-location-title"><h2 id="setup-location-title">Choose a location</h2><div class="setup-courts">${courts.map(c=>`<button type="button" data-court="${c.id}" class="setup-court ${c.playable?'setup-playable':'setup-locked'}" ${c.playable?`aria-pressed="${this.court===c.id}"`:'disabled'} aria-label="${c.name}${c.playable?', playable':', locked, coming soon'}"><img src="${assets}/locations/${c.id}.jpg" alt="" draggable="false">${c.playable?'<span class="setup-court-check" aria-hidden="true">✓</span>':`<span class="setup-coming">Coming soon</span><span class="setup-lock">${lock}</span>`}<strong>${c.name}</strong><small>${c.description}</small></button>`).join('')}</div></section><button type="button" class="setup-start" data-action="start" aria-label="Start Match" ${this.canStart()?'':'disabled'}><img src="${graphics}/buttons/picklebash-button-start-match.png" alt="" draggable="false"></button></div>
   <footer class="setup-footer"><button type="button" data-action="back"><span aria-hidden="true">←</span> Back</button><button type="button" data-action="random"><span aria-hidden="true">⤨</span> Shuffle matchup</button><p>Your player is locked in. Let’s play.</p></footer><p class="setup-sr-only" role="status" aria-live="polite" aria-atomic="true"></p></div>`;
 }
}
