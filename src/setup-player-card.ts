import {AvatarThumbnails} from './avatar-preview';
import {fillPlayerCard} from './player-card';
import {attachPlayerDetails} from './player-details';
import type {DesignedPlayer} from './player-design';
import './roster.css';
import './setup-player-card.css';
let portraits:AvatarThumbnails|undefined;
export function fillSetupPlayerCard(card:HTMLElement,player:DesignedPlayer,credit:string){
 card.classList.add('roster-card','setup-lineup-card','roster-card-short');
 let portrait='';try{portraits??=new AvatarThumbnails(384);portrait=portraits.get(player.appearance,'profile')}catch{}
 const visibleCredit=credit.startsWith('By ')?'':credit;
 fillPlayerCard(card,player,visibleCredit,portrait);
 if(!visibleCredit)card.querySelector('.roster-role')?.remove();
 attachPlayerDetails(card,player,'',portrait);
}
