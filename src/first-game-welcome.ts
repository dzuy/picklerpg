export const FIRST_GAME_WELCOME_URL='/?openplay=1&welcome=1';

/** Keep the welcome attached to its action across lobby refreshes. */
export function firstGameWelcome(button:HTMLButtonElement,host:HTMLElement){
 if(new URLSearchParams(location.search).get('welcome')!=='1')return;
 host.classList.add('first-game-welcome');
 const tip=document.createElement('div');tip.className='first-game-welcome-tip';tip.id='first-game-welcome-tip';tip.setAttribute('role','status');
 const copy=document.createElement('p');copy.textContent="Welcome to PickleBash! Let's get you into your first game!";
 const close=document.createElement('button');close.type='button';close.className='first-game-welcome-close';close.setAttribute('aria-label','Dismiss welcome');close.textContent='×';
 const dismiss=()=>{const url=new URL(location.href);url.searchParams.delete('welcome');history.replaceState(null,'',url);tip.remove();host.replaceWith(button);button.removeAttribute('aria-describedby');};
 close.onclick=dismiss;button.addEventListener('click',dismiss,{once:true});button.setAttribute('aria-describedby',tip.id);
 tip.append(copy,close);host.append(tip);
}
