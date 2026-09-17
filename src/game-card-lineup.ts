import {AvatarThumbnails} from './avatar-preview';
import {preloadAthletes} from './athlete';
import type {Appearance} from './player-design';
type CardPlayer={name:string;appearance?:Appearance};
let portraits:AvatarThumbnails|undefined;
const ready=preloadAthletes();
/** Compact, shared matchup for local and online games. */
export function gameCardLineup(home:CardPlayer[],away:CardPlayer[]){
 const lineup=document.createElement('span');lineup.className='game-card-lineup';
 for(const [index,players] of [home,away].entries()){
  if(index){const versus=document.createElement('span');versus.className='game-card-versus';versus.textContent='vs';lineup.append(versus);}
  const team=document.createElement('span');team.className='game-card-team';
  for(const player of players){
   const tile=document.createElement('span');tile.className='game-card-player';
   const face=document.createElement('span');face.className='game-card-face';face.textContent=player.name.slice(0,1);face.setAttribute('aria-hidden','true');
   const name=document.createElement('span');name.className='game-card-name';name.textContent=player.name;name.title=player.name;
   tile.append(face,name);team.append(tile);
   if(player.appearance)void ready.then(()=>{
    if(!lineup.isConnected)return;
    try{portraits??=new AvatarThumbnails(128);const img=document.createElement('img');img.src=portraits.get(player.appearance!,'face');img.alt='';face.replaceChildren(img);}catch{/* Keep initials if portrait rendering is unavailable. */}
   }).catch(()=>{});
  }
  lineup.append(team);
 }
 return lineup;
}
