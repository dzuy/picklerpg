import {PACKS,isApplePackProduct,type PackId} from './pack-catalog';
import type {PremiumStatus} from './premium-model';
import type {Purchases} from '@revenuecat/purchases-capacitor';

type RefundSDK=Pick<typeof Purchases,'invalidateCustomerInfoCache'|'getCustomerInfo'|'getProducts'|'beginRefundRequestForProduct'>;
/** Test-only request. Only verified provider reconciliation can change ownership. */
export async function requestSandboxRefund(pack:PackId,sdk:RefundSDK,refresh:()=>Promise<PremiumStatus>){
 const status=await refresh();
 if(status.sandbox!==true||!status.sources.some(s=>s.source==='revenuecat'&&s.packId===pack))throw new Error('Only an owned Apple test purchase can be refunded here.');
 await sdk.invalidateCustomerInfoCache();
 const {customerInfo}=await sdk.getCustomerInfo();
 const entitlement=customerInfo.entitlements.active[PACKS[pack].entitlement];
 if(!entitlement||entitlement.isSandbox!==true||entitlement.productIdentifier!==PACKS[pack].productId)throw new Error('This pack does not have an active Apple test purchase.');
 const product=(await sdk.getProducts({productIdentifiers:[PACKS[pack].productId]})).products.find(p=>isApplePackProduct(pack,p));
 if(!product)throw new Error('This pack is not available yet.');
 const {refundRequestStatus}=await sdk.beginRefundRequestForProduct({storeProduct:product});
 if(refundRequestStatus===1)return 'cancelled' as const;
 if(refundRequestStatus!==0)throw new Error('The test refund request could not be sent.');
 return 'submitted' as const;
}
