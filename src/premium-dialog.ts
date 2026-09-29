import {appleBilling,applePrice,premiumAction,premiumStatus,purchaseApple,restoreApple} from './premium';
import {PACKS,ownsPack,type PackId} from './pack-catalog';
import {showViewDialog} from './view-focus';
import './full-game-analysis.css';
import './premium.css';
const defaultServices={appleBilling,applePrice,premiumAction,premiumStatus,purchaseApple,restoreApple};
export function openPremium(trigger?:HTMLElement,services=defaultServices){
 const {appleBilling,applePrice,premiumAction,premiumStatus,purchaseApple,restoreApple}=services;
 const existing=document.querySelector<HTMLDialogElement>('#picklebash-store');if(existing){existing.focus();return;}
 const dialog=document.createElement('dialog');dialog.id='picklebash-store';dialog.className='full-analysis-dialog';dialog.setAttribute('aria-labelledby','store-title');
 dialog.innerHTML='<header class="full-analysis-header"><h2 id="store-title">PickleBash Store</h2><button type="button" aria-label="Close store">✕</button></header><div class="full-analysis-content"><p>Make the game your own. Every pack is a one-time purchase, yours to keep.</p><p data-store-status role="status" aria-live="polite">Checking your packs…</p><div data-store-packs></div><p class="full-analysis-note">Core gameplay stays free. Packs add style and scenery, never a competitive advantage. Analysis is separate.</p><div data-store-actions></div><p data-store-legal></p></div>';
 document.body.append(dialog);dialog.querySelector('header button')!.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();trigger?.focus()},{once:true});showViewDialog(dialog);
 const status=dialog.querySelector<HTMLElement>('[data-store-status]')!,actions=dialog.querySelector<HTMLElement>('[data-store-actions]')!,packs=dialog.querySelector<HTMLElement>('[data-store-packs]')!;let busy=false;
 function button(parent:HTMLElement,label:string,action:()=>Promise<void>,disabled=false){const b=document.createElement('button');b.type='button';b.className='full-analysis-retry';b.textContent=label;b.disabled=disabled;b.dataset.unavailable=String(disabled);b.onclick=()=>{if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);void action().catch(error=>{status.textContent=(error as {userCancelled?:boolean}).userCancelled?'Purchase cancelled.':error instanceof Error?error.message:'Your purchase could not be completed. Please try again.';}).finally(()=>{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=b.dataset.unavailable==='true');});};parent.append(b);}
 async function load(refresh=false){
  const membership=await premiumStatus(refresh);if(!dialog.open)return;actions.replaceChildren();packs.replaceChildren();
  const legal=dialog.querySelector<HTMLElement>('[data-store-legal]')!;legal.replaceChildren();for(const [label,url] of [['Privacy',membership.privacyUrl],['Terms of Use',membership.termsUrl]])if(url){const link=document.createElement('a');link.textContent=label!;link.href=url;link.target='_blank';link.rel='noopener';legal.append(link,document.createTextNode(' '));}
  status.textContent=membership.ownedPacks.length?'Your packs are yours to keep.':'Choose more ways to express yourself.';
  for(const id of ['everything','style','court','fun'] as const){
   const pack=PACKS[id],owned=ownsPack(membership.ownedPacks,id),card=document.createElement('section');card.className='store-pack';card.dataset.featured=String(id==='everything');
   const heading=document.createElement('h3');heading.textContent=pack.name;card.append(heading);
   if(id==='everything'){const value=document.createElement('strong');value.className='store-value';value.textContent=appleBilling()?'Best value · All three V1 packs + exclusives':'Best value · Save US$1.98 on the three packs';card.append(value);}
   const description=document.createElement('p');description.textContent=pack.description;card.append(description);packs.append(card);
   let price=`US$${(pack.cents/100).toFixed(2)}`,ready=membership.availablePacks.includes(id)&&(appleBilling()?membership.appleReady:membership.webReady);
   if(appleBilling()&&ready&&!owned)try{price=await applePrice(id);}catch{ready=false;}
   if(!dialog.open)return;
   button(card,owned?'Owned':!pack.contentReady?`${price} · Coming soon`:ready?`Buy once · ${price}`:`${price} · Available soon`,async()=>{
    if(appleBilling()){await purchaseApple(id);await load();status.textContent='Purchase received. Refresh your packs if confirmation is still pending.';}
    else {const result=await premiumAction('checkout',{packId:id});if(result.url)location.assign(result.url);}
   },owned||!ready);
  }
  if(appleBilling())button(actions,'Restore purchases',async()=>{const result=await restoreApple();await load();status.textContent=result.ownedPacks.length?'Your packs are restored.':'No purchases were found. Use the PickleBash account and Apple account used for your purchase.';});
  button(actions,'Refresh packs',()=>load(true));
  if(membership.admin){
   const form=document.createElement('form');form.className='ph-no-capture';form.setAttribute('data-private','true');form.innerHTML='<h3>Give a complimentary pack</h3><label>Account username, email, or ID<input name="owner" required maxlength="254" autocomplete="off"></label><label>Pack<select name="pack"><option value="everything">Everything Pack</option><option value="style">Style Pack</option><option value="court">Court Pack</option><option value="fun">Fun Pack</option></select></label><label>Reason<input name="reason" required maxlength="200"></label><label><input name="active" type="checkbox" checked> Permanent access enabled</label><button type="submit" class="full-analysis-retry">Save complimentary pack</button>';
   form.onsubmit=event=>{event.preventDefault();if(busy)return;const values=new FormData(form);busy=true;const submit=form.querySelector('button')!;submit.disabled=true;void premiumAction('grant',{ownerId:values.get('owner'),packId:values.get('pack') as PackId,reason:values.get('reason'),active:values.get('active')==='on'}).then(()=>{status.textContent='Complimentary pack saved.';}).catch(e=>{status.textContent=e.message;}).finally(()=>{busy=false;submit.disabled=false;});};actions.append(form);
  }
 }
 const returned=new URLSearchParams(location.search).get('premium')==='return';if(returned){const url=new URL(location.href);url.searchParams.delete('premium');history.replaceState(null,'',url);}
 void load(returned).catch(error=>{status.textContent=error.message;button(actions,'Try again',()=>load());});
}
