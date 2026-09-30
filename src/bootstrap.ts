import {Capacitor} from '@capacitor/core';
import {entryRoute,gameEntryUrl} from './entry-route';
const url=new URL(location.href);
if(entryRoute(url,Capacitor.isNativePlatform())==='game'){
 const destination=gameEntryUrl(url);
 if(destination.href!==url.href)history.replaceState(null,'',destination);
 document.querySelector('#marketing')?.remove();
 document.title='Play PickleBash — A Pickleball Strategy Game';
 const loading=document.querySelector<HTMLElement>('#match-loading');
 const showEntryLoading=loading?.hidden===true;
 if(loading)loading.hidden=false;
 try{
  await import('./game-bootstrap');
  if(showEntryLoading)loading?.remove();
 }catch(error){
  if(loading){loading.hidden=false;loading.querySelector('span')!.textContent='Couldn’t load the game. Please refresh to try again.';}
  console.error('Game startup failed',error);
 }
}else{
 document.body.dataset.screen='homepage';
 document.querySelector('#match-loading')?.setAttribute('hidden','');
}
export {};
