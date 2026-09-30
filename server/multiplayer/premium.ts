import {PACKS,PACK_IDS,isPackId,type PackId} from '../../src/pack-catalog';
import type {SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
import {uuid} from './validation';
import type {PremiumStatus} from '../../src/premium-model';
import {billingSandbox,validateBillingEnvironment,appleSandboxAccount,appleSandboxForAccount} from './billing-environment';
const unavailable=()=>new ApiError(503,'premium_unavailable','The store is unavailable. Please try again shortly.');
/** Permanent Apple entitlements must be backed by an actual App Store transaction. */
export function revenueCatPacks(value:any,sandbox=false):PackId[]{
 if(!value?.subscriber||!Number.isFinite(value.request_date_ms))throw unavailable();
 return PACK_IDS.filter(id=>{
  const pack=PACKS[id],entitlement=value.subscriber.entitlements?.[pack.entitlement];
  if(!entitlement||entitlement.product_identifier!==pack.productId||entitlement.expires_date!==null)return false;
  const transactions=value.subscriber.non_subscriptions?.[pack.productId];
  return Array.isArray(transactions)&&transactions.some(t=>t.store==='app_store'&&t.is_sandbox===sandbox&&!t.refunded_at&&t.purchase_date===entitlement.purchase_date);
 });
}
export class PremiumService {
 constructor(readonly client:SupabaseClient,readonly env:NodeJS.ProcessEnv=process.env,private fetcher:typeof fetch=fetch){validateBillingEnvironment(env);}
 isAdmin(actor:string){return (this.env.PREMIUM_ADMIN_IDS??'').split(',').map(s=>s.trim()).includes(actor);}
 async status(actor:string):Promise<PremiumStatus>{
  const [ownership,configuration]=await Promise.all([this.client.from('pack_ownership').select('source,pack_id').eq('owner_id',actor).eq('active',true),this.client.rpc('premium_enforced')]);
  if(ownership.error||configuration.error)throw unavailable();
  const sources=(ownership.data??[]).filter(r=>isPackId(r.pack_id)).map(r=>({source:r.source,packId:r.pack_id as PackId}));
  const https=(value:string|undefined)=>{try{return value&&new URL(value).protocol==='https:'?value:null;}catch{return null;}};
  const privacyUrl=https(this.env.BILLING_PRIVACY_URL),termsUrl=https(this.env.BILLING_TERMS_URL),ready=this.env.BILLING_PURCHASES_ENABLED==='true'&&!!privacyUrl&&!!termsUrl;
  const sandbox=billingSandbox(this.env),review=appleSandboxAccount(actor,this.env),appleReady=(ready||review&&!!privacyUrl&&!!termsUrl)&&!!(this.env.REVENUECAT_SECRET_KEY&&this.env.REVENUECAT_WEBHOOK_AUTH);
  return {sandbox:sandbox||review,privacyUrl,termsUrl,ownedPacks:[...new Set(sources.map(s=>s.packId))],enforced:configuration.data===true,sources,availablePacks:PACK_IDS.filter(id=>PACKS[id].contentReady||(sandbox&&this.env.BILLING_TEST_CATALOG==='true')),appleReady,webReady:ready&&!review&&!!(this.env.STRIPE_SECRET_KEY&&this.env.STRIPE_WEBHOOK_SECRET&&this.env.BILLING_RETURN_ORIGIN)&&PACK_IDS.every(id=>!!this.env[PACKS[id].stripePriceEnv]),admin:this.isAdmin(actor)};
 }
 async analysisAccess(actor:string){const {data,error}=await this.client.rpc('pack_analysis_access',{p_owner:actor});if(error)throw unavailable();return data===true;}
 async refreshApple(actor:string){
  if(!this.env.REVENUECAT_SECRET_KEY)throw unavailable();
  const response=await this.fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(actor)}`,{headers:{Authorization:`Bearer ${this.env.REVENUECAT_SECRET_KEY}`,Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw unavailable();
  const result=await response.json(),packs=revenueCatPacks(result,appleSandboxForAccount(actor,this.env));
  const {error}=await this.client.rpc('update_pack_provider',{p_owner:actor,p_source:'revenuecat',p_packs:packs,p_observed:new Date(result.request_date_ms).toISOString()});
  if(error)throw unavailable();return this.status(actor);
 }
 async requireAccount(actor:string){const {data,error}=await this.client.auth.admin.getUserById(actor);if(error||!data.user||data.user.is_anonymous)throw new ApiError(403,'account_required','Sign in to a saved account before purchasing.');return data.user;}
 async grant(actor:string,input:any){
  await this.requireAccount(actor);if(!this.isAdmin(actor))throw new ApiError(403,'forbidden','Pack administration is unavailable for this account.');
  if(!input||typeof input.ownerId!=='string'||!input.ownerId.trim()||input.ownerId.length>254||typeof input.active!=='boolean'||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>200||!isPackId(input.packId))throw new ApiError(400,'grant','Choose an account, pack, and reason.');
  if(!uuid(input.ownerId)){
   const identifier=input.ownerId.trim().replace(/^@/,'').toLowerCase();let found:string|undefined;
   for(let page=1;page<=100;page++){const {data,error}=await this.client.auth.admin.listUsers({page,perPage:1000});if(error)throw unavailable();const matches=data.users.filter(user=>user.email?.toLowerCase()===identifier||user.user_metadata?.username?.toLowerCase()===identifier);if(matches.length>1||found&&matches.length)throw new ApiError(409,'account','Several accounts match. Use the account ID.');if(matches[0])found=matches[0].id;if(data.users.length<1000)break;}
   if(!found)throw new ApiError(404,'account','No account matches that username or email.');input={...input,ownerId:found};
  }
  const {error}=await this.client.rpc('grant_pack',{p_owner:input.ownerId,p_administrator:actor,p_active:input.active,p_pack:input.packId,p_reason:input.reason.trim()});if(error)throw unavailable();return {ok:true};
 }
}
