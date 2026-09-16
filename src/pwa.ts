import {authClient,matchCredentials} from './auth-session';
import {remoteRequest} from './multiplayer/api';
import {browserStorage} from './browser-storage';
import './pwa.css';
interface InstallPrompt extends Event {prompt():Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
let installPrompt:InstallPrompt|null=null;
let installedThisSession=false;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let render=()=>{};
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event as InstallPrompt;render();});
window.addEventListener('appinstalled',()=>{installedThisSession=true;installPrompt=null;render();});
matchMedia('(display-mode: standalone)').addEventListener('change',()=>render());
const registration='serviceWorker' in navigator&&isSecureContext
 ?navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>null):Promise.resolve(null);
let subscription:PushSubscription|null=null;
let eligible=false,enabled=false,busy=false,message='',publicKey:string|null=null;
let owner:string|null=null;
let restoringNotifications=true;
const supported=()=> 'Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
const dismissed=()=>browserStorage.getItem('pickle-install-dismissed')==='1';
export function setTurnPromptEligible(value:boolean){eligible=value;render();}
export function mountTurnPrompt(host:HTMLElement){
 const card=document.createElement('section');card.className='turn-prompt';host.prepend(card);
 render=()=>{
  card.replaceChildren();card.hidden=!eligible||!owner||enabled||restoringNotifications;if(card.hidden)return;
  const installed=standalone();
  const needsInstall=ios&&!installed;
  if(!needsInstall&&(!supported()||Notification.permission==='denied')){card.hidden=true;return;}
  if(needsInstall&&dismissed()){card.hidden=true;return;}
  const title=document.createElement('strong');title.textContent=!needsInstall?"Know when it's your turn":'Never miss your turn';
  const copy=document.createElement('p');copy.textContent=!needsInstall?'Get notified when your opponent plays, even while you’re using another app.':"Add PickleBash to your Home Screen and we'll let you know when your friends play.";
  const button=document.createElement('button');button.type='button';button.disabled=busy;
  if(needsInstall){
   button.textContent='Add PickleBash';button.onclick=()=>void install();
   if(installedThisSession){copy.textContent='Open PickleBash from your Home Screen to enable notifications.';button.hidden=true;}
   else if(!ios&&!installPrompt){copy.textContent+=' Use your browser’s menu to install PickleBash.';button.hidden=true;}
   const close=document.createElement('button');close.className='turn-later';close.textContent='Not now';close.onclick=()=>{browserStorage.setItem('pickle-install-dismissed','1');render();};card.append(close);
  }else{
   button.textContent=enabled?'Notifications enabled':'Enable Notifications';button.disabled=busy||enabled;
   if(!supported()){copy.textContent='Notifications aren’t supported in this browser. Try an updated browser.';button.hidden=true;}
   else if(Notification.permission==='denied'){copy.textContent='Notifications are blocked. You can change this in your device or browser settings.';button.hidden=true;}
   else if(!publicKey){copy.textContent='Notifications are not available yet.';button.hidden=true;}
   button.onclick=()=>void enable();
  }
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent=message;
  card.append(title,copy,button,status);
 };
 render();
}
async function install(){
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='dismissed')browserStorage.setItem('pickle-install-dismissed','1');render();return;}
 if(ios){const dialog=document.createElement('dialog');dialog.className='turn-install';dialog.innerHTML='<h2>Add PickleBash</h2><ol><li>Tap Share</li><li>Tap Add to Home Screen</li><li>Tap Add</li></ol><form method="dialog"><button>Got it</button></form>';document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();}
}
async function enable(){
 if(!supported()||busy)return;busy=true;message='';
 // Permission must be requested directly in this tap, before any network await.
 const permission=Notification.requestPermission();render();
 try{
  const result=await permission;
  if(result!=='granted'){message=result==='denied'?'Notifications are blocked.':'You can enable notifications whenever you’re ready.';return;}
  const reg=await registration;if(!reg)throw Error('Could not prepare notifications. Reload and try again.');
  await navigator.serviceWorker.ready;
  const c=await matchCredentials();if(c.owner!==owner)throw Error('Account changed. Reload and try again.');
  if(!publicKey)throw Error('Notifications are not available yet.');
  const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/'));
  subscription=await reg.pushManager.getSubscription();
  if(subscription){const old=subscription.options.applicationServerKey;if(old&&btoa(String.fromCharCode(...new Uint8Array(old))).replace(/=+$/,'')!==btoa(raw).replace(/=+$/,'')){await subscription.unsubscribe();subscription=null;}}
  subscription??=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});
  await remoteRequest(c.token,'/api/multiplayer/push/subscribe',subscription.toJSON());
  browserStorage.setItem('pickle-push-owner',c.owner);enabled=true;await activity();
 }catch(error){message=(error as Error).message;}finally{busy=false;render();}
}
async function activity(forceInactive=false){
 if(!enabled||!subscription||!owner)return;
 try{const c=await matchCredentials();if(c.owner!==owner)return;await fetch('/api/multiplayer/push/activity',{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint,active:!forceInactive&&document.visibilityState==='visible'&&document.hasFocus()}),keepalive:true});}catch{}
}
// Clear this device before explicit logout; other devices remain subscribed.
export async function disableDevicePush(){
 if(!subscription)return;
 try{const c=await matchCredentials();await remoteRequest(c.token,'/api/multiplayer/push/unsubscribe',{endpoint:subscription.endpoint});}catch{/* Local unsubscribe still invalidates delivery when the API is offline. */}
 await subscription.unsubscribe();subscription=null;enabled=false;browserStorage.removeItem('pickle-push-owner');render();
}
let authRevision=0;
authClient()?.auth.onAuthStateChange((_event,session)=>{
 const revision=++authRevision;restoringNotifications=true;render();
 // Supabase auth callbacks must not await another auth API call.
 setTimeout(()=>void(async()=>{
  if(revision!==authRevision)return;
  owner=session?.user.id??null;enabled=false;publicKey=null;
  const reg=await registration;subscription=await reg?.pushManager.getSubscription()??null;
  if(subscription&&browserStorage.getItem('pickle-push-owner')!==owner){await subscription.unsubscribe();subscription=null;browserStorage.removeItem('pickle-push-owner');}
  if(!session){render();return;}
  // A saved subscription already represents opt-in, even if the refresh API is offline.
  enabled=!!subscription&&supported()&&Notification.permission==='granted'&&browserStorage.getItem('pickle-push-owner')===owner;
  const config=await remoteRequest<{publicKey:string|null}>(session.access_token,'/api/multiplayer/push/config');
  if(revision!==authRevision)return;publicKey=config.publicKey;
  // Existing opt-in: refresh persistence without ever asking permission on load.
  if(subscription&&publicKey&&Notification.permission==='granted'&&browserStorage.getItem('pickle-push-owner')===owner){await remoteRequest(session.access_token,'/api/multiplayer/push/subscribe',subscription.toJSON());enabled=true;await activity();}
  render();
 })().catch(()=>{}).finally(()=>{if(revision===authRevision){restoringNotifications=false;render();}}),0);
});
setInterval(()=>void activity(),15000);
window.addEventListener('pagehide',()=>void activity(true));
for(const event of ['focus','blur'])window.addEventListener(event,()=>void activity());
document.addEventListener('visibilitychange',()=>void activity());
