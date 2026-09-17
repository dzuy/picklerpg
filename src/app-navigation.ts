import './app-navigation.css';
export type NavigationPage='home'|'games'|'friends'|'roster'|'profile';
export type LobbyPage='games'|'friends'|'roster'|'profile';
export function initialLobbyPage():LobbyPage{
 const tab=new URLSearchParams(location.search).get('tab');
 return tab==='friends'||tab==='profile'||tab==='roster'?tab:'games';
}
export function appNavigation(active:NavigationPage,navigate?:(page:NavigationPage,href:string)=>void){
 const nav=document.createElement('nav');nav.className='lobby-bottom-nav';nav.setAttribute('aria-label','Main navigation');
 const icons={home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',games:'<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M7 9v6m-3-3h6m6-2h.01M19 14h.01"/>',friends:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/>',roster:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M5 17v-1a4 4 0 0 1 8 0v1m3-9h2m-2 4h2m-2 4h2"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>'};
 const routes:Record<NavigationPage,string>={home:'/?home=1',games:'/?openplay=1',friends:'/?openplay=1&tab=friends',roster:'/?openplay=1&tab=roster',profile:'/?openplay=1&tab=profile'};
 for(const key of ['home','games','friends','roster','profile'] as const){
  const item=document.createElement('a');item.className='lobby-nav-item';item.id=`lobby-nav-${key}`;item.href=routes[key];
  item.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
  const label=document.createElement('span');label.textContent=key[0].toUpperCase()+key.slice(1);item.append(label);
  if(active===key)item.setAttribute('aria-current','page');
  if(navigate)item.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(key,routes[key]);});
  nav.append(item);
 }
 return nav;
}
