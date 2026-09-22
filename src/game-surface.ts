import type {SoloLaunch} from './solo-launch';
import './game-surface.css';
const CLOSE='picklebash:close-game';
let surface:HTMLDialogElement|null=null;
/** Keep the originating Open Play page mounted while the game owns the screen. */
export function openGameSurface(path='/?newgame=1',solo?:SoloLaunch){
 if(surface)return;
 const url=new URL(path,location.origin);
 if(url.origin!==location.origin)throw new Error('Games must open in this app.');
 const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const dialog=document.createElement('dialog'),frame=document.createElement('iframe');
 dialog.className='game-surface';dialog.setAttribute('aria-label','Game');
 frame.title='Game setup and court';frame.src=url.href;frame.allow='microphone; fullscreen';
 dialog.append(frame);document.body.append(dialog);surface=dialog;
 const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const close=()=>dialog.close();
 const message=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==frame.contentWindow)return;if(event.data===CLOSE)close();if(event.data==='picklebash:solo-ready'&&solo)frame.contentWindow?.postMessage({type:'picklebash:start-solo',setup:solo},location.origin);};
 window.addEventListener('message',message);
 dialog.addEventListener('close',()=>{window.removeEventListener('message',message);frame.src='about:blank';dialog.remove();surface=null;document.body.style.overflow=overflow;previousFocus?.focus({preventScroll:true});window.dispatchEvent(new Event('game-surface-closed'));},{once:true});
 dialog.showModal();frame.focus();
}
/** Closing a game reveals its launcher; direct links return to Games. */
export function closeGameSurface(){
 if(window.parent!==window){window.parent.postMessage(CLOSE,location.origin);return;}
 location.assign('/?openplay=1');
}
