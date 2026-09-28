import {App} from '@capacitor/app';
import {Capacitor} from '@capacitor/core';
import {RematchCountdown} from './rematch-countdown';

/** Cancel before secondary controls run, and on browser/native lifecycle changes. */
export function bindRematchLifecycle(dialog:HTMLDialogElement,button:HTMLButtonElement,countdown:RematchCountdown){
 let nativeActive=true;
 const cancel=()=>countdown.cancel();
 dialog.addEventListener('click',event=>{if(event.target instanceof Element&&!button.contains(event.target)&&event.target.closest('button,a,summary'))cancel();},true);
 dialog.addEventListener('close',cancel);dialog.addEventListener('cancel',cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 window.addEventListener('pagehide',cancel);window.addEventListener('blur',cancel);
 window.addEventListener('popstate',cancel);window.addEventListener('hashchange',cancel);
 if(Capacitor.isNativePlatform()){
  void App.addListener('appStateChange',({isActive})=>{nativeActive=isActive;if(!isActive)cancel();}).catch(cancel);
  void App.getState().then(({isActive})=>{nativeActive=isActive;if(!isActive)cancel();}).catch(cancel);
 }
 return ()=>nativeActive&&dialog.open&&!document.hidden;
}
export function rematchSection(dialog:HTMLDialogElement,button:HTMLButtonElement){
 dialog.classList.add('rematch-end');
 const section=document.createElement('section');section.className='run-it-back';section.setAttribute('aria-label','Rematch');
 const title=document.createElement('h2'),opponent=document.createElement('p'),number=document.createElement('strong'),message=document.createElement('p');
 title.textContent='RUN IT BACK?';opponent.className='rematch-opponent';number.className='rematch-countdown';number.setAttribute('aria-label','Seconds until rematch request');message.className='rematch-status';message.setAttribute('role','status');
 section.append(title,opponent,number,button,message);dialog.querySelector('.game-end-score')!.after(section);
 button.classList.add('rematch-primary');
 return {section,title,opponent,number,message,renderCountdown(value:number|null){number.hidden=value===null;number.textContent=value===null?'':String(value);number.dataset.urgency=value!==null&&value<=2?'high':value!==null&&value<=5?'medium':'normal';}};
}
