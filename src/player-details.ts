import {fillPlayerCard,playerSkillDetails} from './player-card';
import type {DesignedPlayer} from './player-design';
import './player-details.css';
let drawer:HTMLDialogElement|undefined;
export function attachPlayerDetails(card:HTMLElement,player:DesignedPlayer,role:string,portrait:string,edit?:()=>void){
 card.querySelector(':scope > dl')?.remove();
 card.classList.add('roster-card-compact');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`View ${player.name} details`);
 const open=()=>{
  drawer??=document.createElement('dialog');drawer.className='roster-details-drawer';drawer.setAttribute('aria-labelledby','roster-details-title');drawer.replaceChildren();if(!drawer.isConnected)document.body.append(drawer);
  let closing=false;
  const dismiss=(after?:()=>void)=>{if(closing)return;closing=true;const finish=()=>{drawer!.close();after?.()};if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}drawer!.classList.add('is-closing');window.setTimeout(finish,180)};
  drawer.oncancel=event=>{event.preventDefault();dismiss()};
  let outsideDown=false;const outside=(event:MouseEvent)=>{const r=drawer!.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom};
  drawer.onpointerdown=event=>{outsideDown=outside(event)};drawer.onclick=event=>{if(event.target===drawer&&outsideDown&&outside(event))dismiss()};
  const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.id='roster-details-title';title.textContent=player.name;close.type='button';close.textContent='✕';close.setAttribute('aria-label','Close player details');close.onclick=()=>dismiss();header.append(title,close);
  const profile=document.createElement('article');profile.className='roster-card';fillPlayerCard(profile,player,role,portrait);const details=playerSkillDetails(player);details.open=true;profile.append(details);
  drawer.append(header,profile);
  if(edit){const button=document.createElement('button');button.type='button';button.className='roster-details-edit';button.textContent='Edit player';button.onclick=()=>dismiss(edit);drawer.append(button);}
  drawer.onclose=()=>{if(card.isConnected)card.focus({preventScroll:true})};drawer.showModal();close.focus();
 };
 card.addEventListener('click',event=>{if((event.target as HTMLElement).closest('button,a,input,select,summary'))return;open()});
 card.addEventListener('keydown',event=>{if(event.target===card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();open()}});
}
