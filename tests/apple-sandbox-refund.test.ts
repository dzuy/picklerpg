import test from 'node:test';
import assert from 'node:assert/strict';
import {requestSandboxRefund} from '../src/apple-sandbox-refund';
import {PACKS} from '../src/pack-catalog';
import type {PremiumStatus} from '../src/premium-model';
function fixture(){
 const calls:string[]=[];
 const status:PremiumStatus={sandbox:true,ownedPacks:['fun'],sources:[{source:'revenuecat',packId:'fun'}],enforced:true,appleReady:true,webReady:true,availablePacks:['fun'],admin:false,privacyUrl:null,termsUrl:null};
 const entitlement={isSandbox:true,productIdentifier:PACKS.fun.productId};
 const product={identifier:PACKS.fun.productId,productType:'NON_CONSUMABLE'};
 let result=0;
 const sdk={invalidateCustomerInfoCache:async()=>{calls.push('invalidate');},getCustomerInfo:async()=>({customerInfo:{entitlements:{active:{[PACKS.fun.entitlement]:entitlement}}}}),getProducts:async()=>({products:[product]}),beginRefundRequestForProduct:async({storeProduct}:any)=>{assert.equal(storeProduct,product);calls.push('refund');return {refundRequestStatus:result};}};
 return {calls,status,entitlement,product,setResult:(value:number)=>{result=value},run:()=>requestSandboxRefund('fun',sdk as any,async()=>status)};
}
test('test refunds reject production and non-Apple ownership before requesting a sheet',async()=>{
 for(const source of ['production','missing-environment','stripe','complimentary','different-pack']){
  const f=fixture();if(source==='production')f.status.sandbox=false;
  else if(source==='missing-environment')delete f.status.sandbox;
  else if(source==='different-pack')f.status.sources[0].packId='style';
  else f.status.sources[0].source=source as 'stripe'|'complimentary';
  await assert.rejects(f.run);assert.deepEqual(f.calls,[]);
 }
});
test('test refunds require fresh sandbox receipt and exact non-consumable product',async()=>{
 for(const invalid of ['production-receipt','different-receipt-product','subscription']){
  const f=fixture();if(invalid==='production-receipt')f.entitlement.isSandbox=false;
  else if(invalid==='different-receipt-product')f.entitlement.productIdentifier=PACKS.style.productId;
  else f.product.productType='AUTO_RENEWABLE_SUBSCRIPTION';
  await assert.rejects(f.run);assert.equal(f.calls.includes('refund'),false);
 }
});
test('refund submission and cancellation never locally revoke pack ownership',async()=>{
 for(const result of [0,1,2,99]){
  const f=fixture();f.setResult(result);
  if(result<2)assert.equal(await f.run(),result===0?'submitted':'cancelled');else await assert.rejects(f.run);
  assert.deepEqual(f.calls,['invalidate','refund']);assert.deepEqual(f.status.ownedPacks,['fun']);
 }
});
