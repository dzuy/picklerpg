/** Root marketing visits stay public; explicit legacy game and account links keep working. */
export function entryRoute(url:URL,native=false):'home'|'game' {
 if(native||url.pathname!=='/')return 'game';
 const gameKeys=['openplay','multiplayer','home','roster','game','newgame','design','createplayer','configured','match','invite','returnMatch','setup','importplayer','code','error_description'];
 const hash=new URLSearchParams(url.hash.slice(1));
 return gameKeys.some(key=>url.searchParams.has(key))||['access_token','refresh_token','type','error','error_description','guestChallenge'].some(key=>hash.has(key))?'game':'home';
}
export function gameEntryUrl(url:URL):URL {
 const destination=new URL(url);
 if(destination.pathname==='/')destination.pathname='/play';
 return destination;
}
