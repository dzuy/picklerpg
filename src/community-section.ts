import {COMMUNITY_CATEGORIES,communityCategory} from './community-categories';
import {rosterTrashIcon} from './roster-action-icons';
import {attachPlayerDetails} from './player-details';
import {canAddToRoster} from './roster-account';
import {rosterStarters,loadRosterStarters,setStarterAdded} from './roster-membership';
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
 constructor(private changed:(players:DesignedPlayer[])=>void=()=>{},private editSkills?:(player:DesignedPlayer)=>void){
  document.addEventListener('community-moderated',()=>{void this.load();});
  this.element.className='community-section';this.element.innerHTML='<h2>Browse Players</h2><p>Add these community-created players to your roster to play as them</p><p data-community-status role="status"></p><div class="community-categories"></div>';
 }
 async load(){const generation=++this.generation;const status=this.element.querySelector<HTMLElement>('[data-community-status]')!;status.textContent='Loading Community Players…';
  await loadRosterStarters();
  try{this.rows=await communityPlayers();status.textContent=this.rows.length?'':'No public players yet.';}catch(e){status.textContent=(e as Error).message;}
  await preloadAthletes();if(generation!==this.generation)return;this.draw();this.changed(this.addedPlayers);
 }
 private card(player:DesignedPlayer,inRoster:boolean){
  const row=this.rows.find(r=>r.player.id===player.id),added=row?.added??rosterStarters().some(p=>p.id===player.id);
  const article=document.createElement('article');article.className='roster-card community-card';if(!inRoster)article.classList.add('roster-card-short');
  let portrait='';try{portraits??=new AvatarThumbnails(384);portrait=portraits.get(player.appearance,'roster',player.handedness)}catch{}
  const change=async()=>{if(!added&&!await canAddToRoster())return false;await (row?setCommunityAdded(row.public_id,!added):setStarterAdded(player.id,!added));await this.load();};
  fillPlayerCard(article,player,row?`By ${row.creator_name}`:'Starting Lineup',portrait);
  attachPlayerDetails(article,player,row?`By ${row.creator_name}`:'Starting Lineup',portrait,row&&added&&this.editSkills?()=>this.editSkills!(player):undefined,{label:added?'Remove from roster':'Add to Roster',primary:!added,change});
  const actions=document.createElement('div');actions.className='roster-card-actions';
  const button=document.createElement('button');button.type='button';button.className=inRoster?'roster-remove':'roster-play';button.textContent=added?(inRoster?'Remove':'In Your Roster'):'Add to roster';button.disabled=added&&!inRoster;button.setAttribute('aria-label',added&&!inRoster?`${player.name} is in Your Roster`:`${added?'Remove':'Add'} ${player.name} ${added?'from':'to'} Your Roster`);
  if(inRoster&&added){button.innerHTML=rosterTrashIcon;button.title='Remove from roster';}
  button.onclick=()=>{button.disabled=true;void change().catch(e=>{this.element.querySelector('[data-community-status]')!.textContent=e.message;}).finally(()=>{button.disabled=false;});};actions.append(button);article.append(actions);return article;
 }
 private draw(){
  const added=new Set(this.addedPlayers.map(player=>player.id));
  const community=this.element.querySelector<HTMLElement>('.community-categories')!;
  community.replaceChildren();
  for(const category of COMMUNITY_CATEGORIES){
   const rows=this.rows.filter(row=>!added.has(row.player.id)&&communityCategory(row.player.skills).id===category.id).sort((a,b)=>category.score(b.player.skills)-category.score(a.player.skills)||a.player.name.localeCompare(b.player.name));
   if(!rows.length)continue;
   const section=document.createElement('section');section.className='community-category';
   const heading=document.createElement('h3');heading.textContent=category.title;
   const description=document.createElement('p');description.textContent=category.description;
   const rail=document.createElement('div');rail.className='community-grid roster-grid community-category-row';rail.tabIndex=0;rail.setAttribute('role','region');rail.setAttribute('aria-label',`${category.title} players`);
   rail.append(...rows.map(row=>this.card(row.player,false)));section.append(heading,description,rail);community.append(section);
  }
 }
}
