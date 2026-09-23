import {focusView,showViewDialog} from './view-focus';
import {installSwipeLeft} from './swipe-left';
import './game-list-exit.css';

export function installGameListExit(card:HTMLElement,options:{title:string;message:string;action:string;confirm:()=>void|Promise<void>}){
 card.classList.add('game-list-swipe');
 let dialog:HTMLDialogElement|null=null;
 installSwipeLeft(card,()=>{
  if(dialog?.open)return;
  dialog=document.createElement('dialog');
  dialog.className='game-list-exit';
  dialog.setAttribute('aria-label',options.title);
  const title=document.createElement('h2');title.textContent=options.title;
  const message=document.createElement('p');message.textContent=options.message;
  const error=document.createElement('p');error.setAttribute('role','alert');error.hidden=true;
  const actions=document.createElement('div');actions.className='game-list-exit-actions';
  const cancel=document.createElement('button');cancel.className='pb-button';cancel.textContent='Cancel';
  const confirm=document.createElement('button');confirm.className='pb-button pb-button--primary';confirm.textContent=options.action;
  let busy=false;
  cancel.onclick=()=>dialog?.close();
  confirm.onclick=async()=>{
   if(busy)return;
   busy=true;confirm.disabled=true;cancel.disabled=true;error.hidden=true;
   try{await options.confirm();dialog?.close();}
   catch(e){error.textContent=e instanceof Error?e.message:'Unable to update this game. Please try again.';error.hidden=false;}
   finally{busy=false;confirm.disabled=false;cancel.disabled=false;}
  };
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{dialog?.remove();dialog=null;focusView();},{once:true});
  actions.append(cancel,confirm);dialog.append(title,message,error,actions);document.body.append(dialog);
  showViewDialog(dialog);focusView(dialog);
 });
}
