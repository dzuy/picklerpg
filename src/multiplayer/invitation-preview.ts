import {COURT_LOCATIONS} from '../locations';
import {fillPlayerCard} from '../player-card';
import {attachPlayerDetails} from '../player-details';
import {AvatarThumbnails} from '../avatar-preview';
import {preloadAthletes} from '../athlete';
import type {Invitation} from './invitation-protocol';
let portraits:AvatarThumbnails|undefined;
/** Show the sender's frozen invitation team, never the recipient's roster. */
export function invitationPreview(invite:Invitation){
 const section=document.createElement('section');section.className='invitation-preview';section.setAttribute('aria-label','Inviting team and location');
 const heading=document.createElement('h2');heading.textContent=`${invite.creatorName}’s team`;
 const team=document.createElement('div');team.className='remote-team-picker roster-grid invitation-team';
 const draw=(withPortraits:boolean)=>{
  team.replaceChildren(...invite.team.map((player,index)=>{
   const card=document.createElement('article');card.className='roster-card remote-team-card';
   const role=index?'Inviting partner':'Inviting player';let portrait='';
   if(withPortraits)try{portraits??=new AvatarThumbnails(384);portrait=portraits.get(player.appearance,'roster')}catch{}
   fillPlayerCard(card,player,role,portrait);attachPlayerDetails(card,player,role,portrait);return card;
  }));
 };
 draw(false);
 const location=COURT_LOCATIONS.find(c=>c.id===invite.court)??COURT_LOCATIONS[0];
 const venue=document.createElement('figure');venue.className='invitation-location';
 const image=document.createElement('img');image.src=location.image;image.alt='';
 const caption=document.createElement('figcaption'),name=document.createElement('strong'),description=document.createElement('span');
 name.textContent=invite.court==='venice'?'The Beach':location.name;description.textContent=location.description;caption.append(name,description);venue.append(image,caption);
 const label=document.createElement('h2');label.textContent='Location';
 const note=document.createElement('p');note.className='remote-team-stat-note';note.textContent='Your players use their actual skills in this match.';
 section.append(heading,team,note,label,venue);
 void preloadAthletes().then(()=>{if(section.isConnected)draw(true)}).catch(()=>{});
 return section;
}
