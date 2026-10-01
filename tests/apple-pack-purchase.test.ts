import test from 'node:test';
import assert from 'node:assert/strict';
import {purchaseApplePack,packPurchaseError,packPurchaseConfirmation} from '../src/apple-pack-purchase';
import {PACKS} from '../src/pack-catalog';
import type {PremiumStatus} from '../src/premium-model';
const empty:PremiumStatus={ownedPacks:[],enforced:true,sources:[],availablePacks:['everything'],appleReady:true,webReady:false,admin:false,privacyUrl:null,termsUrl:null};
test('a conflicting Apple receipt prevents a new purchase before the Apple sheet opens',async()=>{
 let purchases=0,lookups=0;
 const conflict={code:'7',message:'There is already another active subscriber using the same receipt'};
 const sdk={syncPurchases:async()=>{throw conflict;},getProducts:async()=>{lookups++;return {products:[]};},purchaseStoreProduct:async()=>{purchases++;}};
 await assert.rejects(purchaseApplePack('everything',sdk as any,async()=>empty),e=>e===conflict);
 assert.equal(purchases,0);assert.equal(lookups,0);
 assert.match(packPurchaseError(conflict),/another PickleBash account/);
});
test('receipt synchronization rechecks ownership and cannot charge for restored content',async()=>{
 let reads=0,purchases=0;
 const sdk={syncPurchases:async()=>{},purchaseStoreProduct:async()=>{purchases++;}};
 await assert.rejects(purchaseApplePack('everything',sdk as any,async()=>++reads===1?empty:{...empty,ownedPacks:['everything']}),/already own/);
 assert.equal(purchases,0);
});
test('successful Apple payment uses server ownership for confirmation',async()=>{
 const calls:string[]=[];let reads=0;
 const sdk={syncPurchases:async()=>{calls.push('sync');},getProducts:async()=>({products:[{identifier:PACKS.everything.productId,productType:'NON_CONSUMABLE'}]}),purchaseStoreProduct:async()=>{calls.push('purchase');}};
 const result=await purchaseApplePack('everything',sdk as any,async()=>{calls.push('refresh');reads++;return empty;});
 assert.deepEqual(calls,['refresh','sync','refresh','purchase','refresh']);
 assert.equal(reads,3);assert.match(packPurchaseConfirmation(result,'everything'),/not confirmed/);
 assert.match(packPurchaseConfirmation({...empty,ownedPacks:['everything']},'style'),/unlocked/);
 assert.equal(packPurchaseError({userCancelled:true}), 'Purchase cancelled.');
 assert.equal(packPurchaseError(new Error('Connection lost.')),'Connection lost.');
});
