import {Capacitor,registerPlugin} from '@capacitor/core';
import {PushNotifications} from '@capacitor/push-notifications';
import {App} from '@capacitor/app';
import {authClient,matchCredentials} from '../auth-session';
import {remoteRequest} from '../multiplayer/api';
import {browserStorage,browserSessionStorage} from '../browser-storage';
import {showViewDialog} from '../view-focus';
export const nativeNotifications=()=>Capacitor.getPlatform()==='ios';
const Badge=registerPlugin<{set(options:{count:number}):Promise<void>;environment():Promise<{value:'sandbox'|'production'}>}>('PickleBadge');
let token:string|undefined,owner:string|null=null,revision=0,ready:Promise<void>|undefined;
let registration:Promise<void>|undefined,resolveRegistration:(()=>void)|undefined,rejectRegistration:((error:Error)=>void)|undefined;
let badgeRequest=0,previousAccessToken:string|undefined;
let cleanup:Promise<void>=Promise.resolve();
let saves:Promise<void>=Promise.resolve();
let enabled=false,dialog:HTMLDialogElement|undefined;
function installation(){let id=browserStorage.getItem('pickle-push-installation');if(!id){id=crypto.randomUUID();browserStorage.setItem('pickle-push-installation',id);}return id;}
function optedIn(){return !!owner&&browserStorage.getItem('pickle-native-push-owner')===owner;}
function failRegistration(error:Error){rejectRegistration?.(error);resolveRegistration=undefined;rejectRegistration=undefined;}
function saveToken(){
 // APNs can report a replacement while a previous backend upload is in flight.
 // Serialize uploads so a slow old token cannot overwrite the newest registration.
 saves=saves.catch(()=>{}).then(()=>persistToken());return saves;
}
async function persistToken(){
 if(!token||!owner||!optedIn())return;
 const current=revision,c=await matchCredentials();if(current!==revision||c.owner!==owner)return;
 const {value:environment}=await Badge.environment();
 await remoteRequest(c.token,'/api/multiplayer/push/native/register',{id:installation(),token,environment});
 if(current!==revision){await remoteRequest(c.token,'/api/multiplayer/push/native/disable',{id:installation()});return;}
 enabled=true;resolveRegistration?.();resolveRegistration=undefined;rejectRegistration=undefined;
}
async function listeners(){
 await PushNotifications.addListener('registration',value=>{token=value.value;void saveToken().catch(()=>failRegistration(Error('Could not save notifications. Check your connection and try again.')));});
 await PushNotifications.addListener('registrationError',()=>failRegistration(Error('Could not register with Apple. Try again shortly.')));
 await PushNotifications.addListener('pushNotificationReceived',()=>void syncNativeBadge());
 await PushNotifications.addListener('pushNotificationActionPerformed',event=>{
  const data=event.notification.data;
  if((data?.type==='your_turn'||data?.type==='nudge')&&typeof data.gameId==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.gameId)){
   // Internal route preserves the existing sign-in and match authorization flow.
   location.assign(`/?multiplayer=1&match=${encodeURIComponent(data.gameId)}`);
  }
 });
 await App.addListener('appStateChange',event=>{if(event.isActive)void restore().catch(()=>{});});
}
async function register(){
 if(registration)return registration;
 registration=(async()=>{
  await (ready??=listeners());
  await new Promise<void>((resolve,reject)=>{
   const timeout=setTimeout(()=>failRegistration(Error('Apple registration timed out. Please try again.')),15000);
   resolveRegistration=()=>{clearTimeout(timeout);resolve()};rejectRegistration=error=>{clearTimeout(timeout);reject(error)};
   void PushNotifications.register().catch(()=>failRegistration(Error('Could not register notifications.')));
  });
 })().finally(()=>{registration=undefined});return registration;
}
/** Call from a contextual Enable Notifications tap; never invoked automatically. */
export async function requestNativeNotifications(){
 if(!nativeNotifications())return false;
 const c=await matchCredentials();if(c.owner!==owner)throw Error('Account changed. Try again.');
 const config=await remoteRequest<{available:boolean}>(c.token,'/api/multiplayer/push/native/config');
 if(!config.available)throw Error('Notifications are not available yet. Please try again later.');
 const permission=await PushNotifications.requestPermissions();
 if(permission.receive!=='granted')throw Error('Notifications are off. Enable them in iPhone Settings → Notifications → PickleBash.');
 browserStorage.setItem('pickle-native-push-owner',c.owner);
 await register();await syncNativeBadge();return true;
}
export async function syncNativeBadge(){
 if(!nativeNotifications()||!owner)return;
 const current=revision,request=++badgeRequest;
 try{const c=await matchCredentials();if(c.owner!==owner)return;const result=await remoteRequest<{count:number}>(c.token,'/api/multiplayer/push/badge');if(current===revision&&request===badgeRequest)await Badge.set({count:result.count});}catch{/* Preserve last authoritative count while offline. */}
}
async function restore(){
 await cleanup;
 if(!owner){await Badge.set({count:0});return;}
 await syncNativeBadge();
 if(!optedIn())return;
 const permission=await PushNotifications.checkPermissions();
 if(permission.receive==='granted')await register();
 else {const c=await matchCredentials();if(c.owner===owner)await remoteRequest(c.token,'/api/multiplayer/push/native/disable',{id:installation()});enabled=false;}
}
/** Disable server delivery before changing accounts; an offline logout must be retried. */
export async function disableNativeNotifications(){
 if(!nativeNotifications())return;
 if(optedIn()){
  const c=await matchCredentials();await remoteRequest(c.token,'/api/multiplayer/push/native/disable',{id:installation()});
 }
 revision++;enabled=false;failRegistration(Error('Account changed.'));browserStorage.removeItem('pickle-native-push-owner');
 await PushNotifications.unregister();await Badge.set({count:0});
}
export function showNativeTurnPrompt(){
 if(!nativeNotifications()||!owner||enabled||dialog?.open||browserSessionStorage.getItem(`native-prompt:${owner}`))return;
 const promptOwner=owner;
 dialog=document.createElement('dialog');dialog.className='turn-notification-modal';
 dialog.innerHTML='<section class="turn-prompt"><div class="turn-prompt-content"><strong>Know when it’s your turn</strong><p>We can notify you when your opponent plays, even when PickleBash is closed.</p><div class="turn-prompt-actions"><button class="turn-enable">Enable Notifications</button><button class="turn-later">Not right now</button></div><p role="status"></p></div></section>';
 const view=dialog,button=view.querySelector<HTMLButtonElement>('.turn-enable')!;
 button.onclick=()=>{button.disabled=true;void requestNativeNotifications().then(()=>view.close()).catch(error=>{view.querySelector('[role=status]')!.textContent=error.message;button.disabled=false;});};
 view.querySelector<HTMLButtonElement>('.turn-later')!.onclick=()=>view.close();
 view.addEventListener('close',()=>{browserSessionStorage.setItem(`native-prompt:${promptOwner}`,'1');view.remove();});document.body.append(view);showViewDialog(view);
}
if(nativeNotifications()){
 ready=listeners();void ready.catch(()=>{});
 authClient()?.auth.onAuthStateChange((_event,session)=>{
  const next=session?.user.id??null;
  if(next!==owner){
   const oldAccess=previousAccessToken;
   if(owner&&optedIn()&&oldAccess){
    cleanup=cleanup.catch(()=>{}).then(async()=>{
     try{await remoteRequest(oldAccess,'/api/multiplayer/push/native/disable',{id:installation()});}
     finally{await PushNotifications.unregister();await Badge.set({count:0});}
    });
    void cleanup.catch(()=>{});
   }
   revision++;enabled=false;owner=next;dialog?.close();failRegistration(Error('Account changed.'));
  }
  previousAccessToken=session?.access_token;
  setTimeout(()=>void restore().catch(()=>{}),0);
 });
 window.addEventListener('online',()=>void restore().catch(()=>{}));
 window.addEventListener('pickle-game-refreshed',event=>{
  void syncNativeBadge();
  const {path,value}=(event as CustomEvent).detail;
  const state=value?.state;
  if(path.endsWith('/actions')&&state?.status==='active'&&state.currentTeam&&state.currentTeam!==state.viewerTeam)showNativeTurnPrompt();
 });
}
