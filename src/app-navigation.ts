import {renderPlayTurnBadge} from './play-turn-badge';
import './app-navigation.css';
import {authClient} from './auth-session';
import {profileAccess} from './profile-access';
import type {User} from '@supabase/supabase-js';
import {profileAvatar} from './multiplayer/team-directory';
import type {Appearance} from './player-design';
import type {AvatarThumbnails} from './avatar-preview';
let navigationPortraits:Promise<AvatarThumbnails>|undefined;
const pendingAvatars=new Map<string,Promise<Appearance>>();
function userAvatar(user:User):Promise<Appearance>{
 const existing=pendingAvatars.get(user.id);if(existing)return existing;
 const fallback=profileAvatar(user.id,user.user_metadata.profile_avatar);
 const client=authClient();
 if(!client)return Promise.resolve(fallback);
 const pending=(async()=>{
  const {data,error}=await client.from('players').select('appearance').eq('owner_id',user.id).order('is_active',{ascending:false}).order('created_at').limit(1);
  return error?fallback:profileAvatar(user.id,data?.[0]?.appearance??user.user_metadata.profile_avatar);
 })().catch(()=>fallback);
 pendingAvatars.set(user.id,pending);
 void pending.finally(()=>{if(pendingAvatars.get(user.id)===pending)pendingAvatars.delete(user.id);});
 return pending;
}
async function updateProfileAvatar(item:HTMLElement,user:User,revision:string){
 try{
  navigationPortraits??=Promise.all([import('./avatar-preview'),import('./athlete')]).then(async([module,athlete])=>{await athlete.preloadAthletes();return new module.AvatarThumbnails(96);}).catch(error=>{navigationPortraits=undefined;throw error;});
  const [portraits,appearance]=await Promise.all([navigationPortraits,userAvatar(user)]);
  if(item.dataset.profileUser!==user.id||item.dataset.profileRevision!==revision)return;
  const image=document.createElement('img');image.className='nav-profile-avatar';image.alt='';image.width=30;image.height=30;image.src=portraits.get(appearance,'face');
  item.querySelector('.nav-profile-avatar')?.remove();item.prepend(image);
 }catch{/* Keep the profile icon if the portrait cannot be loaded. */}
}
let watchingNavigationAuth=false;
function updateProfileLabel(item:HTMLElement,user:User|null){
 const signedIn=!!user&&!user.is_anonymous;
 item.dataset.profileUser=signedIn?user.id:'';
 const revision=String(Number(item.dataset.profileRevision??0)+1);item.dataset.profileRevision=revision;
 item.querySelector('.nav-profile-avatar')?.remove();
 // Defer database reads until the auth callback releases its session lock.
 if(signedIn)setTimeout(()=>{if(item.dataset.profileUser===user.id)void updateProfileAvatar(item,user,revision);},0);
 const username=signedIn&&typeof user.user_metadata.username==='string'?user.user_metadata.username.trim():'';
 const label=signedIn?'Profile':'Sign In';
 item.querySelector('span')!.textContent=username||label;
 item.title=username?`${username} — Profile`:label;
 item.setAttribute('aria-label',username?`${username} — Profile`:label);
}
export type NavigationPage='home'|'games'|'friends'|'roster'|'store'|'profile';
export type LobbyPage='games'|'friends'|'roster'|'store'|'profile';
export function initialLobbyPage():LobbyPage{
 const tab=new URLSearchParams(location.search).get('tab');
 const params=new URLSearchParams(location.search);
 if(params.get('store')==='1'||params.get('premium')==='return')return 'store';
 return tab==='friends'||tab==='profile'||tab==='roster'||tab==='store'?tab:'games';
}
export function appNavigation(active:NavigationPage,navigate?:(page:NavigationPage,href:string)=>void){
 const nav=document.createElement('nav');nav.className='lobby-bottom-nav';nav.setAttribute('aria-label','Main navigation');
 const icons={store:'<path d="M5 7h14l2 14H3L5 7ZM8 9V6a4 4 0 0 1 8 0v3"/>',home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',games:'<g transform="rotate(35 12 12)"><rect x="7" y="2" width="10" height="13" rx="3"/><path d="M10.5 15v5.5a1.5 1.5 0 0 0 3 0V15"/></g>',friends:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/>',roster:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M5 17v-1a4 4 0 0 1 8 0v1m3-9h2m-2 4h2m-2 4h2"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>'};
 const filledIcons:Record<NavigationPage|'store',string>={
  store:'<path fill-rule="evenodd" d="M7 7V6a5 5 0 0 1 10 0v1h2l2 14H3L5 7h2Zm2 0h6V6a3 3 0 0 0-6 0v1Zm-2 3a1 1 0 0 0 2 0V9H7v1Zm8 0a1 1 0 0 0 2 0V9h-2v1Z"/>',
  home:'<path d="M2 10 12 2l10 8h-3v11h-5v-7h-4v7H5V10Z"/>',
  games:'<g transform="rotate(35 12 12)"><rect x="7" y="2" width="10" height="13" rx="3"/><path d="M10.5 14h3v6.5a1.5 1.5 0 0 1-3 0Z"/></g>',
  friends:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3ZM16 4a3 3 0 0 1 0 6ZM17 13a6 6 0 0 1 5 6v2h-5v-3a8 8 0 0 0-1-4Z"/>',
  roster:'<path fill-rule="evenodd" d="M6 2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Zm3 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 11h8v-1a4 4 0 0 0-8 0Zm11-11v2h3V7Zm0 4v2h3v-2Zm0 4v2h3v-2Z"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2Z"/>'
 };
 const routes:Record<NavigationPage|'store',string>={store:'/?openplay=1&tab=store',home:'/?home=1',games:'/?openplay=1',friends:'/?openplay=1&tab=friends',roster:'/?openplay=1&tab=roster',profile:'/?openplay=1&tab=profile'};
 for(const key of ['games','roster','store','profile'] as const){
  const item=document.createElement('a');item.className='lobby-nav-item';item.id=`lobby-nav-${key}`;item.href=routes[key];
  item.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="nav-icon-outline">${icons[key]}</g><g class="nav-icon-filled" fill="currentColor" stroke="none">${filledIcons[key]}</g></svg>`;
  const label=document.createElement('span');label.textContent=key==='games'?'Play':key[0].toUpperCase()+key.slice(1);item.append(label);
  if(key==='profile')updateProfileLabel(item,null);
  if(key==='games')renderPlayTurnBadge(item);
  if(active===key||(active==='friends'&&key==='games'))item.setAttribute('aria-current','page');
  if(navigate||key==='profile')item.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();const go=()=>{if(navigate)navigate(key,routes[key]);else location.assign(routes[key]);};if(key==='profile'){void profileAccess().then(allowed=>{if(allowed)go();});}else go();});
  nav.append(item);
 }
 const client=authClient();
 if(client){
  const profile=nav.querySelector<HTMLElement>('#lobby-nav-profile')!;
  void client.auth.getSession().then(({data:{session}})=>updateProfileLabel(profile,session?.user??null)).catch(()=>{});
  if(!watchingNavigationAuth){
   watchingNavigationAuth=true;
   client.auth.onAuthStateChange((_event,session)=>{
    document.querySelectorAll<HTMLElement>('.lobby-bottom-nav #lobby-nav-profile').forEach(item=>updateProfileLabel(item,session?.user??null));
   });
  }
 }
 return nav;
}
