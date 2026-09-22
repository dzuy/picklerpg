import {AvatarThumbnails} from './avatar-preview';
import {fillPlayerCard} from './player-card';
import {attachPlayerDetails} from './player-details';
import type {DesignedPlayer} from './player-design';
import './roster.css';
import './setup-player-card.css';
let portraits:AvatarThumbnails|undefined;
export function fillSetupPlayerCard(card:HTMLElement,player:DesignedPlayer,credit:string){
 card.classList.add('roster-card','setup-lineup-card');
 let portrait='';try{portraits??=new AvatarThumbnails(384);portrait=portraits.get(player.appearance,'profile')}catch{}
 fillPlayerCard(card,player,credit,portrait);attachPlayerDetails(card,player,'',portrait);
}
