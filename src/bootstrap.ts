import {Capacitor} from '@capacitor/core';
import {entryRoute,gameEntryUrl} from './entry-route';
import {requiresWebBetaAccount} from './beta-access-policy';
const url=new URL(location.href);
if(entryRoute(url,Capacitor.isNativePlatform())==='game'){
 const destination=gameEntryUrl(url);
 if(destination.href!==url.href)history.replaceState(null,'',destination);
 document.querySelector('#marketing')?.remove();
 document.title='Play PickleBash — A Pickleball Strategy Game';
 const loading=document.querySelector<HTMLElement>('#match-loading');
 // Saved and configured games keep the cover until their first court frame renders.
 const remoteMatch=url.searchParams.has('match')&&(url.searchParams.get('openplay')==='1'||url.searchParams.get('multiplayer')==='1');
 const showEntryLoading=!remoteMatch&&!url.searchParams.has('game')&&!url.searchParams.has('configured');
 if(loading)loading.hidden=false;
 try{
  const allowed=!requiresWebBetaAccount(destination,Capacitor.isNativePlatform())||await (await import('./beta-access')).webBetaAccess(destination);
  if(allowed){
   await import('./game-bootstrap');
   if(showEntryLoading)loading?.remove();
  }
 }catch(error){
  if(loading){loading.hidden=false;loading.querySelector('span')!.textContent='Couldn’t load the game. Please refresh to try again.';}
  console.error('Game startup failed',error);
 }
}else{
 document.body.dataset.screen='homepage';
 document.querySelector('#match-loading')?.setAttribute('hidden','');
}
export {};
