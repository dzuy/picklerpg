import {PACKS,ownsPackContent,isApplePackProduct,type PackId} from './pack-catalog';
import type {PremiumStatus} from './premium-model';
import type {Purchases} from '@revenuecat/purchases-capacitor';

type PurchaseSDK=Pick<typeof Purchases,'syncPurchases'|'getProducts'|'purchaseStoreProduct'>;
export async function purchaseApplePack(pack:PackId,sdk:PurchaseSDK,refresh:()=>Promise<PremiumStatus>){
 const check=(status:PremiumStatus)=>{
  if(!status.appleReady||!status.availablePacks.includes(pack))throw new Error('This pack is not available yet.');
  if(ownsPackContent(status.ownedPacks,pack))throw new Error('You already own all the content in this pack.');
 };
 check(await refresh());
 // Detect a receipt belonging to another saved account before opening Apple's purchase sheet.
 await sdk.syncPurchases();
 check(await refresh());
 const product=(await sdk.getProducts({productIdentifiers:[PACKS[pack].productId]})).products.find(p=>isApplePackProduct(pack,p));
 if(!product)throw new Error('This pack is not available yet.');
 await sdk.purchaseStoreProduct({product});
 return refresh();
}

export function packPurchaseError(error:unknown){
 const e=error as {code?:number|string;userCancelled?:boolean;message?:string;readableErrorCode?:string}|null;
 if(e?.userCancelled)return 'Purchase cancelled.';
 if(String(e?.code)==='7'||e?.readableErrorCode==='RECEIPT_ALREADY_IN_USE'||e?.message?.includes('another active subscriber using the same receipt'))return 'These Apple purchases belong to another PickleBash account. Sign in to the PickleBash account you originally used to buy them. Do not buy again.';
 return e?.message||'Your purchase could not be completed. Please try again.';
}

export function packPurchaseConfirmation(status:PremiumStatus,pack:PackId){
 return ownsPackContent(status.ownedPacks,pack)?'Your pack is unlocked. Yours to keep.':'Your purchase is not confirmed for this PickleBash account yet. Do not buy again. Try Restore purchases or contact support.';
}
