import {AvatarPreview} from './avatar-preview';
import {fillPlayerCard,playerSkillDetails} from './player-card';
import type {DesignedPlayer} from './player-design';
import './player-details.css';
let drawer:HTMLDialogElement|undefined;
export function attachPlayerDetails(card:HTMLElement,player:DesignedPlayer,role:string,portrait:string,edit?:()=>void,membership?:{label:string;change:()=>Promise<void>}){
 card.querySelector(':scope > dl')?.remove();
 card.classList.add('roster-card-compact');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`View ${player.name} details`);
 const open=()=>openPlayerDetails(player,role,portrait,card,edit,membership);
 card.addEventListener('click',event=>{if((event.target as HTMLElement).closest('button,a,input,select,summary'))return;open()});
 card.addEventListener('keydown',event=>{if(event.target===card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();open()}});
}

export function openPlayerDetails(player:DesignedPlayer,role:string,portrait='',returnFocus?:HTMLElement,edit?:()=>void,membership?:{label:string;change:()=>Promise<void>}){

  drawer??=document.createElement('dialog');drawer.className='roster-details-drawer';drawer.setAttribute('aria-labelledby','roster-details-title');drawer.replaceChildren();if(!drawer.isConnected)document.body.append(drawer);
  let closing=false;let preview:AvatarPreview|undefined;
  const dismiss=(after?:()=>void)=>{if(closing)return;closing=true;preview?.dispose();preview=undefined;const finish=()=>{drawer!.close();after?.()};if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}drawer!.classList.add('is-closing');window.setTimeout(finish,180)};
  drawer.oncancel=event=>{event.preventDefault();dismiss()};
  let outsideDown=false;const outside=(event:MouseEvent)=>{const r=drawer!.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom};
  drawer.onpointerdown=event=>{outsideDown=outside(event)};drawer.onclick=event=>{if(event.target===drawer&&outsideDown&&outside(event))dismiss()};
  const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.id='roster-details-title';title.textContent=player.name;close.type='button';close.textContent='✕';close.setAttribute('aria-label','Close player details');close.onclick=()=>dismiss();header.append(title,close);
  const profile=document.createElement('article');profile.className='roster-card';fillPlayerCard(profile,player,role,portrait);const details=playerSkillDetails(player);details.open=true;profile.append(details);
  drawer.append(header,profile);
  if(edit){const button=document.createElement('button');button.type='button';button.className='roster-details-edit';button.textContent='Edit player';button.onclick=()=>dismiss(edit);drawer.append(button);}
  if(membership){
   const button=document.createElement('button');button.type='button';button.className='roster-details-membership';button.textContent=membership.label;
   const status=document.createElement('p');status.setAttribute('role','status');
   button.onclick=()=>{button.disabled=true;status.textContent='';void membership.change().then(()=>dismiss()).catch(error=>{status.textContent=(error as Error).message;button.disabled=false;});};
   drawer.append(button,status);
  }
  drawer.onclose=()=>{preview?.dispose();preview=undefined;if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true})};drawer.showModal();close.focus();
  const banner=profile.querySelector<HTMLElement>('.roster-banner')!,host=document.createElement('div');host.className='roster-live-preview';
  banner.prepend(host);
  try{preview=new AvatarPreview(host,true);preview.setPlayer(player);banner.classList.add('has-live-preview');banner.querySelector('img')?.remove();const hint=document.createElement('span');hint.className='roster-preview-hint';hint.textContent='Drag to rotate';host.append(hint);}catch{preview?.dispose();preview=undefined;host.remove();}


}
