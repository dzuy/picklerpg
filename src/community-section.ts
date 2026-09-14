import {communityPlayers,setCommunityAdded,type CommunityPlayer} from './community-players';
import {summarizeSkills} from './player-skill-summary';
import {AvatarThumbnails} from './avatar-preview';
import {preloadAthletes} from './athlete';
import type {DesignedPlayer} from './player-design';
import './community.css';
let portraits:AvatarThumbnails|undefined;
/** Public designs remain read-only references, separate from the owner's saved library. */
export class CommunitySection {
 readonly element=document.createElement('section');private rows:CommunityPlayer[]=[];private generation=0;
 constructor(private changed:(players:DesignedPlayer[])=>void=()=>{}){
  this.element.className='community-section';this.element.innerHTML='<h2>Community Players</h2><p>Discover public players and add them to your selection. Their creators control updates; existing games keep their saved versions.</p><button type="button" data-community-refresh>Browse / refresh players</button><p data-community-status role="status"></p><div class="community-grid"></div>';
  this.element.querySelector('button')!.onclick=()=>void this.load();
 }
 async load(){const generation=++this.generation;const status=this.element.querySelector<HTMLElement>('[data-community-status]')!;status.textContent='Loading Community Players…';
  try{const rows=await communityPlayers();await preloadAthletes();if(generation!==this.generation)return;this.rows=rows;this.changed(rows.filter(r=>r.added).map(r=>r.player));this.draw();status.textContent=rows.length?'':'No public players yet. Share one from the player creator!';}catch(e){status.textContent=(e as Error).message;}
 }
 private draw(){const grid=this.element.querySelector('.community-grid')!;grid.replaceChildren();for(const row of this.rows){
  const article=document.createElement('article');article.className='community-card';
  try{portraits??=new AvatarThumbnails(256);const img=document.createElement('img');img.src=portraits.get(row.player.appearance,'profile');img.alt=row.player.name;article.append(img)}catch{}
  const name=document.createElement('h3');name.textContent=row.player.name;const by=document.createElement('p');by.textContent=`By ${row.creator_name}`;const stats=document.createElement('p'),summary=summarizeSkills(row.player.skills);stats.textContent=`DUPR ${summary.estimatedDupr.toFixed(2)} · ${Object.entries(summary.meters).map(([k,v])=>`${k} ${Math.round(v)}`).join(' · ')}`;stats.title='Estimated game rating';
  const button=document.createElement('button');button.type='button';button.textContent=row.added?'Remove from selection':'Add to selection';button.setAttribute('aria-label',`${row.added?'Remove':'Add'} ${row.player.name} ${row.added?'from':'to'} selection`);
  button.onclick=()=>{button.disabled=true;void setCommunityAdded(row.public_id,!row.added).then(()=>this.load()).catch(e=>{this.element.querySelector('[data-community-status]')!.textContent=e.message;button.disabled=false;});};article.append(name,by,stats,button);grid.append(article);
 }}
}
