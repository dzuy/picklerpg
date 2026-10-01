import {PACKS,isApplePackProduct,type PackId} from './pack-catalog';
import {Capacitor} from '@capacitor/core';
import {authClient,matchCredentials} from './auth-session';
import {remoteRequest} from './multiplayer/api';
import {requestSandboxRefund} from './apple-sandbox-refund';
import type {PremiumStatus} from './premium-model';
import {purchaseApplePack} from './apple-pack-purchase';
export const appleBilling=()=>Capacitor.getPlatform()==='ios';
export async function premiumStatus(refresh=false):Promise<PremiumStatus>{
 const credentials=await matchCredentials();
 const result=await remoteRequest<PremiumStatus>(credentials.token,`/api/multiplayer/premium${refresh?'/refresh':''}`,refresh?{}:undefined);
 if((await matchCredentials()).owner!==credentials.owner)throw new Error('Your account changed. Please reopen the store.');return result;
}
export async function premiumAction(action:'checkout'|'grant',body:unknown={}){
 const {token,owner}=await matchCredentials();const result=await remoteRequest<{url?:string}>(token,`/api/multiplayer/premium/${action}`,body);if((await matchCredentials()).owner!==owner)throw new Error('Your account changed. Reopen the store.');return result;
}
let sdkOwner:string|null=null;
let queue:Promise<unknown>=Promise.resolve();
async function withApple<T>(work:(sdk:typeof import('@revenuecat/purchases-capacitor').Purchases,owner:string)=>Promise<T>){
 const run=queue.catch(()=>{}).then(async()=>{
  const client=authClient(),session=await client?.auth.getSession(),user=session?.data.session?.user;
  if(!user||user.is_anonymous)throw new Error('Sign in to a saved account before purchasing or restoring purchases.');
  const key=import.meta.env.VITE_REVENUECAT_APPLE_KEY;
  if(!appleBilling()||!key?.startsWith('appl_'))throw new Error('App Store purchases are not available yet.');
  const {Purchases}=await import('@revenuecat/purchases-capacitor');
  if(!sdkOwner){await Purchases.configure({apiKey:key,appUserID:user.id});sdkOwner=user.id;}
  else if(sdkOwner!==user.id){await Purchases.logIn({appUserID:user.id});sdkOwner=user.id;}
  if((await matchCredentials()).owner!==user.id)throw new Error('Your account changed. Reopen the store.');
  const value=await work(Purchases,user.id);
  if((await matchCredentials()).owner!==user.id)throw new Error('Your account changed. Reopen the store to check your purchases.');return value;
 });queue=run;return run;
}
export async function applePrice(pack:PackId){return withApple(async sdk=>{const product=(await sdk.getProducts({productIdentifiers:[PACKS[pack].productId]})).products.find(p=>isApplePackProduct(pack,p));if(!product)throw new Error('This pack is not available yet.');return product.priceString;});}
export async function purchaseApple(pack:PackId){
 return withApple(sdk=>purchaseApplePack(pack,sdk,()=>premiumStatus(true)));
}
export const appleRefundTesting=()=>appleBilling()&&import.meta.env.VITE_APP_VERSION==='purchase-sandbox';
export async function refundAppleTest(pack:PackId){
 if(!appleRefundTesting())throw new Error('Test refunds are only available in the purchase test app.');
 return withApple(sdk=>requestSandboxRefund(pack,sdk,()=>premiumStatus(true)));
}
export async function restoreApple(){await withApple(sdk=>sdk.restorePurchases());return premiumStatus(true);}

/** Free local play stays usable during a connection failure; never infer paid access. */
export async function premiumForPlay():Promise<PremiumStatus>{
 try{return await premiumStatus();}catch{return {ownedPacks:[],enforced:true,sources:[],availablePacks:[],appleReady:false,webReady:false,admin:false,privacyUrl:null,termsUrl:null};}
}
