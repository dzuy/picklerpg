import {appleBilling,applePrice,premiumAction,premiumStatus,purchaseApple,restoreApple,appleRefundTesting,refundAppleTest} from './premium';
import {PACKS,ownsPack,ownsPackContent,type PackId} from './pack-catalog';
import {showViewDialog} from './view-focus';
import {storePackPreview} from './store-pack-preview';
import './full-game-analysis.css';
import './premium.css';
const defaultServices={appleBilling,applePrice,premiumAction,premiumStatus,purchaseApple,restoreApple,appleRefundTesting,refundAppleTest};
export function openPremium(trigger?:HTMLElement,services=defaultServices,requiredPack?:PackId){
 const existing=document.querySelector<HTMLDialogElement>('#picklebash-store');if(existing){existing.focus();return;}
 const dialog=document.createElement('dialog');dialog.id='picklebash-store';dialog.className='full-analysis-dialog';dialog.setAttribute('aria-labelledby','store-title');
 dialog.innerHTML='<header class="full-analysis-header"><h2 id="store-title">PickleBash Store</h2><button type="button" aria-label="Close store">✕</button></header><div class="full-analysis-content"><p>Make the game your own. Every pack is a one-time purchase, yours to keep.</p><p data-store-status role="status" aria-live="polite">Checking your packs…</p><div data-store-packs></div><div data-store-actions></div><p data-store-legal></p></div>';
 if(requiredPack==='court'||requiredPack==='fun'||requiredPack==='style')dialog.dataset.compactUpgrade='true';
 if(requiredPack){dialog.dataset.requiredPack=requiredPack;dialog.querySelector('h2')!.textContent=`Unlock the ${requiredPack==='fun'?'Party Pack':PACKS[requiredPack].name}`;dialog.querySelector('.full-analysis-content > p')!.textContent=requiredPack==='court'?"You've picked a Premium court that requires the Court Pack.":requiredPack==='fun'?"You’ve picked a Premium theme that requires the Party Pack.":`Save these Premium choices with the ${PACKS[requiredPack].name}. Your edits are still here.`;}
 document.body.append(dialog);dialog.querySelector('header button')!.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();trigger?.focus()},{once:true});showViewDialog(dialog);
 renderStore(dialog,()=>dialog.open,services,requiredPack);
}
export function openPackUpgrade(pack:PackId,trigger?:HTMLElement){openPremium(trigger,defaultServices,pack);}
export function storePage(services=defaultServices){
 const page=document.createElement('section');page.id='picklebash-store';page.className='store-page';page.dataset.compactUpgrade='true';page.setAttribute('aria-label','Store packs');
 page.innerHTML='<div class="full-analysis-content"><p>Make the game your own. Every pack is a one-time purchase, yours to keep.</p><p data-store-status role="status" aria-live="polite">Checking your packs…</p><div data-store-packs></div><div data-store-actions></div><p data-store-legal></p></div>';
 const url=new URL(location.href);if(url.searchParams.has('store')||url.searchParams.get('premium')==='return'){url.searchParams.set('tab','store');url.searchParams.delete('store');history.replaceState(null,'',url);}
 renderStore(page,()=>page.isConnected,services);return page;
}
function renderStore(dialog:HTMLElement,isActive:()=>boolean,services:typeof defaultServices,requiredPack?:PackId){
 const compact=dialog.hasAttribute('data-compact-upgrade'),partyLabel=dialog.classList.contains('store-page')||requiredPack==='fun';
 const {appleBilling,applePrice,premiumAction,premiumStatus,purchaseApple,restoreApple,appleRefundTesting,refundAppleTest}=services;
 const status=dialog.querySelector<HTMLElement>('[data-store-status]')!,actions=dialog.querySelector<HTMLElement>('[data-store-actions]')!,packs=dialog.querySelector<HTMLElement>('[data-store-packs]')!;let busy=false;
 function button(parent:HTMLElement,label:string,action:()=>Promise<void>,disabled=false){const b=document.createElement('button');b.type='button';b.className='full-analysis-retry';b.textContent=label;b.disabled=disabled;b.dataset.unavailable=String(disabled);b.onclick=()=>{if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);void action().catch(error=>{status.textContent=(error as {userCancelled?:boolean}).userCancelled?'Purchase cancelled.':error instanceof Error?error.message:'Your purchase could not be completed. Please try again.';}).finally(()=>{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=b.dataset.unavailable==='true');});};parent.append(b);}
 async function load(refresh=false){
  const membership=await premiumStatus(refresh);if(!isActive())return;actions.replaceChildren();packs.replaceChildren();
  const legal=dialog.querySelector<HTMLElement>('[data-store-legal]')!;legal.replaceChildren();for(const [label,url] of [['Privacy',membership.privacyUrl],['Terms of Use',membership.termsUrl]])if(url){const link=document.createElement('a');link.textContent=label!;link.href=url;link.target='_blank';link.rel='noopener';legal.append(link,document.createTextNode(' '));}
  status.textContent=requiredPack==='court'||requiredPack==='fun'||requiredPack==='style'?'':membership.ownedPacks.length?'Your packs are yours to keep.':'Choose more ways to express yourself.';
  const offers:PackId[]=requiredPack?[requiredPack,...(requiredPack==='everything'?[]:['everything'] as PackId[])]:['everything','style','court','fun'];
  for(const id of offers){
   const pack=PACKS[id],owned=ownsPack(membership.ownedPacks,id),contentOwned=ownsPackContent(membership.ownedPacks,id),card=document.createElement('section');card.className='store-pack';card.dataset.featured=String(id==='everything');
   const heading=document.createElement('h3');heading.textContent=partyLabel&&id==='fun'?'Party Pack':pack.name;card.append(heading,storePackPreview(id,compact,partyLabel));
   if(id==='everything'){const value=document.createElement('strong');value.className='store-value';value.textContent=appleBilling()?'Best value · All three V1 packs':'Best value · Save US$1.98 on the three packs';card.append(value);}
   if(!(compact&&id==='court')){const description=document.createElement('p');description.textContent=compact?(id==='fun'?'Themes, looks, paddles & celebrations.':id==='style'?'Outfits, hairstyles, hats & accessories.':`Style, Court & ${partyLabel?'Party':'Fun'}. Future packs sold separately.`):pack.description;card.append(description);}packs.append(card);
   let price=`US$${(pack.cents/100).toFixed(2)}`,ready=membership.availablePacks.includes(id)&&(appleBilling()?membership.appleReady:membership.webReady);
   if(appleBilling()&&ready&&!contentOwned)try{price=await applePrice(id);}catch{ready=false;}
   if(!isActive())return;
   button(card,owned?'Owned':!pack.contentReady?`${price} · Coming soon`:ready?`Buy once · ${price}`:`${price} · Available soon`,async()=>{
    if(appleBilling()){await purchaseApple(id);await load();status.textContent='Purchase received. Reopen Store if confirmation is still pending.';}
    else {const result=await premiumAction('checkout',{packId:id});if(result.url)location.assign(result.url);}
   },contentOwned||!ready);
  }
  if(appleBilling())button(actions,'Restore purchases',async()=>{const result=await restoreApple();await load();status.textContent=result.ownedPacks.length?'Your packs are restored.':'No purchases were found. Use the PickleBash account and Apple account used for your purchase.';});
  if(membership.sandbox&&appleRefundTesting()){
   const applePacks=membership.sources.filter(s=>s.source==='revenuecat');
   if(applePacks.length){
    const tools=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Purchase test tools';tools.append(summary);
    const help=document.createElement('p');help.textContent='Request a refund for an Apple test purchase. Access changes after Apple confirms the refund. No real money is involved.';tools.append(help);
    for(const {packId} of applePacks)button(tools,`Test refund · ${PACKS[packId].name}`,async()=>{
     const result=await refundAppleTest(packId);await load(true);status.textContent=result==='cancelled'?'Test refund cancelled.':'Test refund requested. Reopen Store after Apple confirms it.';
    });actions.append(tools);
   }
  }
 }
 const returned=new URLSearchParams(location.search).get('premium')==='return';if(returned){const url=new URL(location.href);url.searchParams.delete('premium');history.replaceState(null,'',url);}
 void load(returned).catch(error=>{status.textContent=error.message;button(actions,'Try again',()=>load());});
}
