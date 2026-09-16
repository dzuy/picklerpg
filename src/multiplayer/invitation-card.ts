import {COURT_LOCATIONS} from '../locations';
import {AvatarThumbnails} from '../avatar-preview';
import {preloadAthletes} from '../athlete';
import type {Invitation} from './invitation-protocol';

let portraits:AvatarThumbnails|undefined;

/** Lobby previews always use the team frozen into the invitation. */
export function invitationCard(invite:Invitation,incoming:boolean){
 const received=incoming&&invite.status==='pending';
 const declined=invite.status==='declined';
 const card=document.createElement('button');
 card.type='button';card.className='remote-game-card remote-invitation-card';
 card.dataset.state=declined?'declined':received?'invitation-received':'invitation-sent';
 const location=COURT_LOCATIONS.find(c=>c.id===invite.court)??COURT_LOCATIONS[0];
 const locationName=invite.court==='venice'?'The Beach':location.name;
 const badge=document.createElement('span');badge.className='remote-badge';
 badge.textContent=declined?'INVITATION DECLINED':received?'YOUR MOVE · INVITATION':'INVITATION SENT · WAITING';
 const title=document.createElement('strong');title.className='invitation-card-title';
 title.textContent=declined?`${invite.recipientName} declined`:received?`${invite.creatorName} challenged you`:`Waiting for ${invite.recipientName}`;
 const copy=document.createElement('span');copy.className='remote-card-opponent';
 copy.textContent=declined?'This game will not start.':received?'Meet your opponents. Pick your team and serve first.':'You’re all set. They’ll choose their team and accept.';
 card.append(badge,title,copy);
 if(received){
  const lineup=document.createElement('span');lineup.className='invitation-card-lineup';
  const label=document.createElement('span');label.className='invitation-card-label';label.textContent=`${invite.creatorName}’s team`;card.append(label);
  const images:HTMLImageElement[]=[];
  for(const player of invite.team){
   const tile=document.createElement('span');tile.className='invitation-card-player';
   const portrait=document.createElement('img');portrait.alt='';portrait.hidden=true;images.push(portrait);
   const name=document.createElement('span');name.textContent=player.name;
   tile.append(portrait,name);lineup.append(tile);
  }
  card.append(lineup);
  void preloadAthletes().then(()=>{
   if(!card.isConnected)return;
   try{portraits??=new AvatarThumbnails(256);invite.team.forEach((player,index)=>{images[index].src=portraits!.get(player.appearance,'roster');images[index].hidden=false;});}catch{/* Names remain available if WebGL cannot render portraits. */}
  }).catch(()=>{});
 }else{
  const team=document.createElement('span');team.className='invitation-card-team-copy';
  team.textContent=`${incoming?invite.creatorName+'’s':'Your'} team: ${invite.team.map(p=>p.name).join(' & ')}`;card.append(team);
 }
 const venue=document.createElement('span');venue.className='invitation-card-venue';
 const image=document.createElement('img');image.src=location.image;image.alt='';image.loading='lazy';
 const name=document.createElement('span');name.textContent=locationName;venue.append(image,name);card.append(venue);
 const rules=document.createElement('span');rules.className='invitation-card-rules';
 rules.textContent=`${invite.scoring==='rally-doubles'?'Rally':'Side-out'} scoring · First to 3`;card.append(rules);
 const footer=document.createElement('span');footer.className='invitation-card-footer';
 const date=document.createElement('time');date.className='remote-card-created';date.dateTime=invite.createdAt;
 date.textContent=new Date(invite.createdAt).toLocaleString();
 const action=document.createElement('span');action.className='remote-card-action';
 action.textContent=received?'Review & accept ↗':'View invitation ↗';footer.append(date,action);card.append(footer);
 return card;
}
