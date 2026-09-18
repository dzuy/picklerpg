export async function copyInviteLink(value:string){
 if(navigator.clipboard)try{await navigator.clipboard.writeText(value);return;}catch{/* Use the selection fallback on local HTTP previews. */}
 const previous=document.activeElement as HTMLElement|null;
 // Elements outside a modal dialog are inert and cannot receive the copy selection.
 const host=previous?.closest('dialog[open]')??Array.from(document.querySelectorAll('dialog:modal')).at(-1)??document.body;
 const field=document.createElement('textarea');field.value=value;field.readOnly=true;field.style.cssText='position:fixed;top:0;left:0;opacity:0';host.append(field);
 try{field.focus({preventScroll:true});field.select();field.setSelectionRange(0,value.length);if(document.activeElement!==field||field.selectionStart!==0||field.selectionEnd!==value.length||!document.execCommand('copy'))throw Error('Copy is unavailable in this browser.');}finally{field.remove();previous?.focus({preventScroll:true});}
}

/** Separate controls from the clickable card so buttons never nest inside buttons. */
export function pendingInviteCard(card:HTMLButtonElement,link:()=>Promise<string>,recipient:string,incoming?:{accept:()=>Promise<void>;decline:()=>Promise<void>}){
 const row=document.createElement('div');row.className='remote-pending-entry';
 card.querySelector('.remote-card-score')?.remove();
 const controls=document.createElement('div');controls.className='pending-invite-controls';
 const notice=document.createElement('span');notice.className='pending-invite-notice';notice.setAttribute('role','status');
 if(incoming){
  const accept=document.createElement('button');accept.type='button';accept.className='pending-invite-accept';accept.textContent='Accept';
  const decline=document.createElement('button');decline.type='button';decline.textContent='Decline';
  const respond=async(action:()=>Promise<void>)=>{accept.disabled=true;decline.disabled=true;card.disabled=true;notice.textContent='';try{await action();}catch(error){notice.textContent=(error as Error).message||'Please try again.';}finally{accept.disabled=false;decline.disabled=false;card.disabled=false;}};
  accept.onclick=()=>void respond(incoming.accept);decline.onclick=()=>void respond(incoming.decline);card.onclick=()=>void respond(incoming.accept);
  controls.classList.add('pending-invite-response');controls.append(decline,accept);row.append(card,controls,notice);return row;
 }
 const nudge=document.createElement('button');nudge.type='button';nudge.textContent='Nudge';nudge.title=`Share a reminder with ${recipient}`;
 const copy=document.createElement('button');copy.type='button';copy.textContent='Copy Link';
 async function run(button:HTMLButtonElement,action:()=>Promise<void>){button.disabled=true;notice.textContent='';try{await action()}catch(error){if((error as Error).name!=='AbortError')notice.textContent=(error as Error).message||'Please try again.';}finally{button.disabled=false;}}
 copy.onclick=()=>void run(copy,async()=>{await copyInviteLink(await link());notice.textContent='Link copied';});
 nudge.onclick=()=>void run(nudge,async()=>{const url=await link();if(typeof navigator.share==='function')await navigator.share({title:'PickleBash reminder',text:`${recipient}, your PickleBash game is waiting. Join when you’re ready!`,url});else{await copyInviteLink(url);notice.textContent=`Link copied — share it with ${recipient} to remind them.`;}});
 controls.append(nudge,copy);row.append(card,controls,notice);return row;
}
