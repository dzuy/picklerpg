import {focusView,showViewDialog} from '../view-focus';
import {hudButtonIcon} from '../hud-button';
import {copyInviteLink} from './pending-invite-card';
import type {Invitation} from './invitation-protocol';
import {publicOrigin} from '../native-origin';
export interface GameShare {title:string;description:string;path:string;text:string}
export function matchShare(id:string):GameShare{return {title:'Share game',description:'Send this link to your opponent to reopen this game. It opens for the players who joined it.',path:`/?multiplayer=1&match=${encodeURIComponent(id)}`,text:'Open our PickleBash game.'};}
export function invitationShare(invite:Pick<Invitation,'id'|'recipientName'|'status'|'matchId'>):GameShare{
 if(invite.status==='accepted'&&invite.matchId)return matchShare(invite.matchId);
 return {title:`Invite ${invite.recipientName}`,description:`The invitation is in ${invite.recipientName}’s games list. You can also send them this link. They’ll need to sign in as that player.`,path:`/?openplay=1&invite=${encodeURIComponent(invite.id)}`,text:'Join me for a game of PickleBash.'};
}
/** Native sharing stays on the button tap; unsupported browsers can always copy the URL. */
export function showGameShare(share:GameShare){
 const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const dialog=document.createElement('dialog');dialog.className='friend-dialog remote-new-game friend-share-dialog';dialog.setAttribute('aria-label',share.title);
 const close=document.createElement('button');close.type='button';close.className='friend-share-close';close.setAttribute('aria-label','Close');close.innerHTML=hudButtonIcon('close');close.onclick=()=>dialog.close();
 const heading=document.createElement('h1');heading.textContent=share.title;
 const description=document.createElement('p');description.className='friend-share-intro';description.textContent=share.description;
 const url=new URL(share.path,publicOrigin()).href,link=document.createElement('input');link.value=url;link.readOnly=true;link.setAttribute('aria-label','Game link');link.onclick=()=>link.select();
 const copy=document.createElement('button');copy.type='button';copy.className='remote-quiet';copy.textContent='Copy Link';
 const shareButton=document.createElement('button');shareButton.type='button';shareButton.className='remote-primary';shareButton.textContent='Share game';
 const message=document.createElement('p');message.setAttribute('role','status');
 const copyLink=async()=>{try{await copyInviteLink(url);message.textContent='Link copied.';}catch{link.focus();link.select();message.textContent='Select and copy the link above.';}};
 copy.onclick=()=>void copyLink();
 shareButton.onclick=()=>{if(typeof navigator.share!=='function'){void copyLink();return;}void navigator.share({title:share.title,text:share.text,url}).catch(error=>{if(error.name!=='AbortError')void copyLink();});};
 const actions=document.createElement('div');actions.className='friend-share-actions';actions.append(copy,shareButton);
 dialog.append(close,heading,description,link,actions,message);dialog.addEventListener('close',()=>{dialog.remove();focusView();},{once:true});document.body.append(dialog);showViewDialog(dialog);return dialog;
}
