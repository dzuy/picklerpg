import {copyInviteLink} from './pending-invite-card';
import {rivalryShareText,sendRivalryText,type RivalryShareMatch} from './rivalry-share';
export function openRivalryShare(match:RivalryShareMatch,opponent:string){
 // Validate before opening. Freeze the preview so later polling cannot change
 // the text underneath a player's approval or native share operation.
 const publicText=rivalryShareText(match,opponent,location.origin),gameText=rivalryShareText(match,opponent,location.origin,true);
 const dialog=document.createElement('dialog');dialog.className='friend-dialog remote-new-game rivalry-share';dialog.setAttribute('aria-label','Share rivalry moment');
 const heading=document.createElement('h2');heading.textContent='Share this rivalry moment';
 const preview=document.createElement('textarea');preview.readOnly=true;preview.rows=6;preview.value=publicText;preview.setAttribute('aria-label','Exact message to share');
 const label=document.createElement('label'),include=document.createElement('input');include.type='checkbox';label.append(include,document.createTextNode('Include our game link'));
 const note=document.createElement('p');note.textContent='The game link is for you and your opponent. It requires sign-in and does not give anyone else access. Leave it off when sharing with other friends.';
 if(['localhost','127.0.0.1','[::1]'].includes(location.hostname))note.textContent+=' Local preview links only work on this computer.';
 const status=document.createElement('p');status.setAttribute('role','status');
 const button=(text:string)=>{const b=document.createElement('button');b.type='button';b.textContent=text;return b;};
 const share=button('Share'),copy=button('Copy message'),close=button('Close');share.className='remote-primary';copy.className=close.className='remote-quiet';share.hidden=typeof navigator.share!=='function';
 include.onchange=()=>{preview.value=include.checked?gameText:publicText;status.textContent='';};
 let busy=false;const send=async(mode:'share'|'copy')=>{if(busy)return;busy=true;share.disabled=copy.disabled=include.disabled=true;status.textContent='';try{const outcome=await sendRivalryText(preview.value,mode,{share:typeof navigator.share==='function'?data=>navigator.share(data):undefined,copy:copyInviteLink});status.textContent=outcome==='cancelled'?'Sharing cancelled.':outcome==='copied'?'Message copied.':'Share action completed.';}catch{preview.focus();preview.select();status.textContent='Could not share automatically. Copy the selected message, or try again.';}finally{busy=false;share.disabled=copy.disabled=include.disabled=false;}};
 share.onclick=()=>void send('share');copy.onclick=()=>void send('copy');close.onclick=()=>dialog.close();
 const focused=document.activeElement;dialog.addEventListener('close',()=>{dialog.remove();if(focused instanceof HTMLElement&&focused.isConnected)focused.focus();});
 dialog.append(heading,preview,label,note,share,copy,status,close);document.body.append(dialog);dialog.showModal();return dialog;
}
