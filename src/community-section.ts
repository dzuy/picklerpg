import {attachPlayerDetails} from './player-details';
import {startingPlayers,rosterStarters,loadRosterStarters,setStarterAdded} from './roster-membership';
import {communityPlayers,setCommunityAdded,type CommunityPlayer} from './community-players';
import {fillPlayerCard,playerRecord} from './player-card';
import type {HistoryMatch} from './player-history';
import './player-creator.css';
import {AvatarThumbnails} from './avatar-preview';
import {preloadAthletes} from './athlete';
import type {DesignedPlayer} from './player-design';
import './community.css';
let portraits:AvatarThumbnails|undefined;
/** Public designs remain read-only references, separate from the owner's saved library. */
export class CommunitySection {
 readonly element=document.createElement('section');private rows:CommunityPlayer[]=[];private generation=0;
 get addedPlayers(){return [...rosterStarters(),...this.rows.filter(r=>r.added).map(r=>r.player)]}
 rosterCards(history:Promise<HistoryMatch[]>){return this.addedPlayers.map(player=>{const card=this.card(player,true);card.querySelector('.roster-card-identity')!.append(playerRecord(player.id,history));return card})}
 constructor(private changed:(players:DesignedPlayer[])=>void=()=>{}){
  this.element.className='community-section';this.element.innerHTML='<h2>Get more players</h2><p>Add players below to Your Roster to choose them for your team.</p><p data-community-status role="status"></p><h3>Community</h3><div class="community-grid roster-grid"></div><h3>Starting Lineup</h3><div class="starting-grid roster-grid"></div>';
 }
 async load(){const generation=++this.generation;const status=this.element.querySelector<HTMLElement>('[data-community-status]')!;status.textContent='Loading Community Players…';
  await loadRosterStarters();
  try{this.rows=await communityPlayers();status.textContent=this.rows.length?'':'No public players yet.';}catch(e){status.textContent=(e as Error).message;}
  await preloadAthletes();if(generation!==this.generation)return;this.changed(this.addedPlayers);this.draw();
 }
 private card(player:DesignedPlayer,inRoster:boolean){
  const row=this.rows.find(r=>r.player.id===player.id),added=row?.added??rosterStarters().some(p=>p.id===player.id);
  const article=document.createElement('article');article.className='roster-card community-card';
  let portrait='';try{portraits??=new AvatarThumbnails(384);portrait=portraits.get(player.appearance,'roster')}catch{}
  fillPlayerCard(article,player,row?`By ${row.creator_name}`:'Starting Lineup',portrait);attachPlayerDetails(article,player,row?`By ${row.creator_name}`:'Starting Lineup',portrait);
  const actions=document.createElement('div');actions.className='roster-card-actions';
  const button=document.createElement('button');button.type='button';button.className='roster-play';button.textContent=added?(inRoster?'Remove from roster':'In Your Roster'):'Add to roster';button.disabled=added&&!inRoster;button.setAttribute('aria-label',added&&!inRoster?`${player.name} is in Your Roster`:`${added?'Remove':'Add'} ${player.name} ${added?'from':'to'} Your Roster`);
  button.onclick=()=>{button.disabled=true;void (row?setCommunityAdded(row.public_id,!added):setStarterAdded(player.id,!added)).then(()=>this.load()).catch(e=>{this.element.querySelector('[data-community-status]')!.textContent=e.message;button.disabled=false;});};actions.append(button);article.append(actions);return article;
 }
 private draw(){this.element.querySelector('.community-grid')!.replaceChildren(...this.rows.map(r=>this.card(r.player,false)));this.element.querySelector('.starting-grid')!.replaceChildren(...startingPlayers.map(p=>this.card(p,false)));}
}
