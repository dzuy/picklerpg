import {COURT_LOCATIONS} from '../locations';
import {gameCardLineup} from '../game-card-lineup';
import {newPlayer,type Appearance} from '../player-design';
import type {Invitation} from './invitation-protocol';

/** Saved inviter lineup versus the named recipient until they choose their players. */
export function invitationCard(invite:Invitation,incoming:boolean,recipientAvatar?:Appearance){
 const received=incoming&&invite.status==='pending',declined=invite.status==='declined';
 const card=document.createElement('button');
 card.type='button';card.className='remote-game-card has-player-faces';
 card.dataset.state=declined?'declined':received?'ready':'waiting';
 const badge=document.createElement('span');badge.className='remote-badge '+(received?'ready':'waiting');
 badge.textContent=declined?`${invite.recipientName} declined`:received?'Your turn · Accept game':`Waiting for ${invite.recipientName}`;
 const placeholder=newPlayer('invitation-placeholder').appearance;
 const recipient=[{name:invite.recipientName,appearance:recipientAvatar??placeholder},{name:'Partner',appearance:placeholder}];
 const lineup=gameCardLineup(incoming?recipient:invite.team,incoming?invite.team:recipient);
 const score=document.createElement('span');score.className='remote-card-score';score.setAttribute('aria-label','Score, your team first');score.textContent='0 – 0';
 const location=COURT_LOCATIONS.find(c=>c.id===invite.court)??COURT_LOCATIONS[0];
 const ref=document.createElement('span');ref.className='remote-card-ref';
 ref.textContent=`${invite.court==='venice'?'The Beach':location.name} · ${invite.scoring==='rally-doubles'?'Rally':'Side-out'} · First to ${invite.target??3}`;
 const date=document.createElement('time');date.className='remote-card-created';date.dateTime=invite.createdAt;date.textContent=new Date(invite.createdAt).toLocaleString();
 const action=document.createElement('span');action.className='remote-card-action';action.textContent=received?'Review & accept ↗':'View invitation ↗';
 card.append(badge,lineup,score,date,ref,action);
 return card;
}
