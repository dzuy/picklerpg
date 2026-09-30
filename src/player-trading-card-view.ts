import type {DesignedPlayer} from './player-design';
import {showViewDialog} from './view-focus';
import {publishPlayerCard} from './player-card-publish';
import {playerCardDetails,publishedCardCaption} from './player-trading-card';
import {renderPlayerTradingCard,type CardFinish,type CardPose} from './player-trading-card-render';
import './player-trading-card.css';

export function showPlayerTradingCard(source:DesignedPlayer){
 const player=structuredClone(source),details=playerCardDetails(player),previous=document.activeElement;
 const dialog=document.createElement('dialog');dialog.className='player-trading-card';dialog.setAttribute('aria-labelledby','trading-card-title');
 dialog.innerHTML=`<header><div><p class="trading-card-eyebrow">THE PLAYER COLLECTION</p><h2 id="trading-card-title">Made to show off.</h2></div><button type="button" data-close aria-label="Close player card">✕</button></header><div class="trading-card-layout"><div class="trading-card-art" aria-busy="true"><img alt="" hidden><p data-loading>Creating your public player card…</p></div><section class="trading-card-controls"><label hidden>Card finish<select data-finish><option value="pink">Bash Pink</option><option value="cyan">Court Cyan</option></select></label><label hidden>Action pose<select data-pose><option value="drive">Forehand drive</option><option value="ready">Ready to rally</option></select></label><label>Post caption<textarea data-caption readonly rows="5"></textarea></label><button type="button" data-share disabled>Share card</button><div class="trading-card-secondary-actions"><button type="button" data-download disabled>Download</button><button type="button" data-copy disabled>Copy Link</button></div><p data-status role="status" aria-live="polite"></p><button type="button" data-retry hidden>Try again</button></section></div>`;
 const get=<T extends HTMLElement>(selector:string)=>dialog.querySelector<T>(selector)!;
 const img=get<HTMLImageElement>('img'),art=get<HTMLElement>('.trading-card-art'),loading=get<HTMLElement>('[data-loading]'),status=get<HTMLElement>('[data-status]');
 const share=get<HTMLButtonElement>('[data-share]'),download=get<HTMLButtonElement>('[data-download]'),retry=get<HTMLButtonElement>('[data-retry]');
 const caption=get<HTMLTextAreaElement>('[data-caption]'),copy=get<HTMLButtonElement>('[data-copy]');
 caption.value='';
 let imageBlob:Blob|undefined,publicImageUrl:string|undefined;
 const publish=async(current:number)=>{
  if(!imageBlob)return;copy.disabled=true;share.disabled=true;retry.hidden=true;status.textContent='Publishing your card…';
  try{const publicUrl=await publishPlayerCard(imageBlob);if(current!==revision||!dialog.open)return;publicImageUrl=publicUrl;caption.value=publishedCardCaption(details.name,publicUrl);copy.disabled=false;share.disabled=false;status.textContent='Your public card link is ready.';}
  catch(error){if(current!==revision||!dialog.open)return;status.textContent=error instanceof Error?error.message:'Your card could not be published.';retry.textContent='Retry publishing';retry.hidden=false;}
 };
 let url:string|undefined,file:File|undefined,revision=0;
 const generate=async()=>{
  const current=++revision;share.disabled=true;download.disabled=true;file=undefined;imageBlob=undefined;publicImageUrl=undefined;copy.disabled=true;caption.value='';retry.hidden=true;img.hidden=true;loading.hidden=false;art.setAttribute('aria-busy','true');status.textContent='';
  try{
   const blob=await renderPlayerTradingCard(player,get<HTMLSelectElement>('[data-finish]').value as CardFinish,get<HTMLSelectElement>('[data-pose]').value as CardPose);
   if(current!==revision||!dialog.open)return;
   if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);file=new File([blob],details.filename,{type:'image/png'});
   img.src=url;img.alt=`${details.name}’s PickleBash player card. ${Object.entries(details.meters).map(([name,value])=>`${name} ${(value/10).toFixed(1)} out of 10`).join(', ')}.`;img.hidden=false;loading.hidden=true;download.disabled=false;imageBlob=blob;void publish(current);
  }catch(error){console.error('Player card export failed',error);if(current===revision&&dialog.open){loading.textContent='Your card couldn’t be created.';status.textContent='Try again, or reopen PickleBash in a browser that supports 3D graphics. Your player is still in the editor.';retry.hidden=false;}}
  finally{if(current===revision)art.setAttribute('aria-busy','false');}
 };
 get('[data-close]').onclick=()=>dialog.close();
 for(const selector of ['[data-finish]','[data-pose]'])get(selector).onchange=()=>{loading.textContent='Creating your public player card…';void generate();};
 retry.onclick=()=>{if(imageBlob){void publish(revision);return;}loading.textContent='Creating your public player card…';void generate();};
 download.onclick=()=>{if(!url)return;const link=document.createElement('a');link.href=url;link.download=details.filename;document.body.append(link);link.click();link.remove();status.textContent=copy.disabled?'Card downloaded.':'Card downloaded. Copy Link to share its public image link.';};
 share.onclick=()=>{
  if(!file)return;
  if(!navigator.share||!navigator.canShare?.({files:[file]})){status.textContent='Download your card, then upload it to your favorite social app with the caption below.';return;}
  // Prepared in advance so native sharing remains inside the user gesture.
  share.disabled=true;
  void navigator.share({files:[file],title:`${details.name} | PickleBash`,text:caption.value}).then(()=>{status.textContent='Card shared!';}).catch(error=>{if(error?.name!=='AbortError')status.textContent='Sharing didn’t finish. Download your card and copy the caption instead.';}).finally(()=>{if(dialog.open&&file)share.disabled=false;});
 };
 copy.onclick=()=>{
  if(!publicImageUrl)return;
  const selectLink=()=>{caption.focus();const start=caption.value.indexOf(publicImageUrl!);caption.setSelectionRange(start,start+publicImageUrl!.length);status.textContent='Select and copy the image link above.';};
  if(!navigator.clipboard){selectLink();return;}
  void navigator.clipboard.writeText(publicImageUrl).then(()=>{status.textContent='Link copied.';}).catch(selectLink);
 };
 document.body.append(dialog);showViewDialog(dialog);
 dialog.addEventListener('close',()=>{revision++;if(url)URL.revokeObjectURL(url);dialog.remove();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();},{once:true});
 void generate();return dialog;
}
