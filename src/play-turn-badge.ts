import {App} from '@capacitor/app';
import {Capacitor} from '@capacitor/core';
import {authClient,matchCredentials} from './auth-session';
import {remoteRequest} from './multiplayer/api';
import {TurnBadgeState} from './turn-badge-state';

export function renderPlayTurnBadge(item:HTMLElement,count=turnBadge.count){
 let badge=item.querySelector<HTMLElement>('.play-turn-badge');
 if(count===0){badge?.remove();item.setAttribute('aria-label','Play');return;}
 if(!badge){badge=document.createElement('b');badge.className='play-turn-badge';badge.setAttribute('aria-hidden','true');item.append(badge);}
 badge.textContent=String(count);item.setAttribute('aria-label',`Play, ${count} ${count===1?'turn or invitation':'turns or invitations'} waiting`);
}
let nativeActive=true;
function badgeVisible(){
 if(document.hidden||!nativeActive||window.parent!==window||document.querySelector('.game-surface[open]'))return false;
 return Array.from(document.querySelectorAll<HTMLElement>('.lobby-nav-item#lobby-nav-games')).some(item=>item.getClientRects().length>0);
}
const turnBadge=new TurnBadgeState(async owner=>{
 const c=await matchCredentials();if(c.owner!==owner)throw Error('Account changed');
 // The game may have opened while credentials were loading.
 if(!badgeVisible())throw Error('Badge is not visible');
 const result=await remoteRequest<{count:number}>(c.token,'/api/multiplayer/push/badge');return result.count;
},count=>document.querySelectorAll<HTMLElement>('.lobby-nav-item#lobby-nav-games').forEach(item=>renderPlayTurnBadge(item,count)));
let refreshing=false,lastRefresh=0;
const refresh=()=>{if(!badgeVisible()||refreshing||Date.now()-lastRefresh<1000)return;refreshing=true;lastRefresh=Date.now();void turnBadge.refresh().finally(()=>{refreshing=false;});};
authClient()?.auth.onAuthStateChange((_event,session)=>{turnBadge.identify(session?.user.id??null);setTimeout(refresh,0);});
window.addEventListener('pickle-game-refreshed',event=>{
 const {path,method}=(event as CustomEvent).detail??{};
 if(method==='POST'&&typeof path==='string'&&(/^\/api\/matches(?:\/[^/]+(?:\/(?:actions|leave|archive))?)?$/.test(path)||path.startsWith('/api/invitations')))refresh();
});
window.addEventListener('game-surface-closed',refresh);
window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
document.addEventListener('visibilitychange',refresh);
setInterval(refresh,5000);
if(Capacitor.isNativePlatform()){
 void App.addListener('appStateChange',({isActive})=>{nativeActive=isActive;if(isActive)refresh();});
}
