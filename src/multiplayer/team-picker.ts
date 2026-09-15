import {rosterStarters} from '../roster-membership';
import {CommunitySection} from '../community-section';
import {refreshCommunityDesigns} from '../community-players';
import type {DesignedPlayer} from '../player-design';
import {cyclePlayer} from '../match-setup-state';
import {parseLibrary,PLAYER_STORAGE_KEY} from '../player-design';
import {preloadAthletes} from '../athlete';
import {AvatarThumbnails} from '../avatar-preview';
import {fillPlayerCard} from '../player-card';
import {attachPlayerDetails} from '../player-details';
import type {TeamSelection} from './invitation-protocol';
/** Same roster/preset selection and rendered athletes as solo setup, restricted to your team. */
export class TeamPicker {
 private lineup={players:[...parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY)).players,...rosterStarters()],selected:[] as string[]};
 private community=new CommunitySection(players=>this.setCommunity(players));
 private setCommunity(players:DesignedPlayer[]){const all=[...parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY)).players,...players];const selected=this.lineup.selected.filter(id=>all.some(p=>p.id===id));for(const p of all)if(selected.length<2&&!selected.includes(p.id))selected.push(p.id);this.lineup={players:all,selected:selected.slice(0,2)};this.draw();}
 private ready:Promise<void>=Promise.resolve();
 async freshTeam(){await this.ready;if(this.lineup.selected.length<2)throw Error('Add at least two players to Your Roster.');return await refreshCommunityDesigns(this.team) as TeamSelection}
 private static portraits:AvatarThumbnails|undefined;
 constructor(private host:HTMLElement){this.lineup.selected=this.lineup.players.slice(0,2).map(p=>p.id);this.draw();this.ready=this.community.load();void preloadAthletes().then(()=>{if(this.host.isConnected)this.draw()}).catch(()=>{})}
 get team():TeamSelection{return this.lineup.selected.slice(0,2).map(id=>structuredClone(this.lineup.players.find(p=>p.id===id)!)) as TeamSelection}
 private draw(){
  this.host.replaceChildren();this.host.className='remote-team-picker roster-grid';
  this.team.forEach((p,i)=>{
   const role=i?'Your partner':'Your player',card=document.createElement('article');card.className='roster-card remote-team-card';
   let portrait='';try{TeamPicker.portraits??=new AvatarThumbnails(384);portrait=TeamPicker.portraits.get(p.appearance,'roster')}catch{}
   fillPlayerCard(card,p,role,portrait);attachPlayerDetails(card,p,role,portrait);
   const controls=document.createElement('div');controls.className='roster-card-actions remote-team-controls';for(const step of [-1,1]){const button=document.createElement('button');button.type='button';button.dataset.teamSlot=String(i);button.dataset.teamStep=String(step);button.textContent=step<0?'‹ Previous':'Next ›';button.setAttribute('aria-label',`${step<0?'Previous':'Next'} ${i?'partner':'player'}`);button.onclick=()=>{this.lineup.selected=cyclePlayer(this.lineup.players.map(p=>p.id),this.lineup.selected.slice(0,2),i,step);this.draw();this.host.querySelector<HTMLButtonElement>(`[data-team-slot="${i}"][data-team-step="${step}"]`)?.focus()};controls.append(button)}
   card.append(controls);this.host.append(card);
  });
  const note=document.createElement('p');note.className='remote-team-stat-note';note.textContent='Player ratings shown. Multiplayer currently uses equal gameplay skills.';this.host.append(note);
 }
}
