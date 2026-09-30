import type {DesignedPlayer} from './player-design';
import {summarizeSkills} from './player-skill-summary';

export const PLAYER_CARD_URL='https://picklebash.app/';
export const PLAYER_CARD_SIZE={width:1080,height:1350} as const;
export function playerCardDetails(player:DesignedPlayer){
 const name=player.name.trim()||'Your player';
 const {meters,estimatedDupr}=summarizeSkills(player.skills);
 return {name,meters,rating:estimatedDupr.toFixed(2),caption:`Meet ${name}, my PickleBash player! Build your player. Bring your game.\n${PLAYER_CARD_URL}`,filename:`picklebash-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'player'}.png`};
}

export function publishedCardCaption(name:string,imageUrl:string){return `Meet ${name}, my PickleBash player!\n${imageUrl}\nBuild your player at ${PLAYER_CARD_URL}`;}
