import {installMenuSounds} from './sound';
installMenuSounds();
import './pwa';
// Keep legacy roster bookmarks inside the Open Play shell.
const route=new URL(location.href);
if(route.searchParams.get('roster')==='1'&&!route.searchParams.has('match')){route.search='?openplay=1&tab=roster';history.replaceState(null,'',route);}
if(location.pathname.startsWith('/challenge/'))await import('./multiplayer/friend-landing');
else if((new URLSearchParams(location.search).get('multiplayer')==='1'||new URLSearchParams(location.search).get('openplay')==='1'))await import('./multiplayer/remote-main');
else await import('./main');
export {};
