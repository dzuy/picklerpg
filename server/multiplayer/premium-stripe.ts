import Stripe from 'stripe';
import {PremiumService} from './premium';
import {ApiError} from './errors';
import {PACKS,PACK_IDS,isPackId,ownsPack,type PackId} from '../../src/pack-catalog';
export class PremiumStripe {
 private stripe:Stripe|null;
 constructor(private premium:PremiumService,stripe?:Stripe){this.stripe=stripe??(premium.env.STRIPE_SECRET_KEY?new Stripe(premium.env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1}):null);}
 private configured(){if(!this.stripe)throw new ApiError(503,'billing_unavailable','Purchases are not available yet.');return this.stripe;}
 private origin(){const url=new URL(this.premium.env.BILLING_RETURN_ORIGIN??'');if(url.protocol!=='https:'||url.origin!==this.premium.env.BILLING_RETURN_ORIGIN)throw new Error('Invalid billing return origin');return url.origin;}
 private async customer(actor:string){const {data,error}=await this.premium.client.from('billing_customers').select('stripe_customer_id').eq('owner_id',actor).maybeSingle();if(error)throw error;return data?.stripe_customer_id as string|undefined;}
 private async paymentValid(session:Stripe.Checkout.Session){
  const stripe=this.configured(),id=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;if(!id)return false;
  const intent=await stripe.paymentIntents.retrieve(id,{expand:['latest_charge']});if(intent.status!=='succeeded')return false;
  const charge=typeof intent.latest_charge==='string'?await stripe.charges.retrieve(intent.latest_charge):intent.latest_charge;
  if(!charge||!charge.paid||charge.amount_refunded>0)return false;
  if(charge.disputed){const disputes=await stripe.disputes.list({charge:charge.id,limit:100});if(disputes.data.some(d=>d.status!=='won'&&d.status!=='warning_closed'))return false;}
  return true;
 }
 async refresh(actor:string){
  const stripe=this.configured(),customer=await this.customer(actor);if(!customer)return this.premium.status(actor);
  const observed=new Date().toISOString(),owned=new Set<PackId>();
  for await(const session of stripe.checkout.sessions.list({customer,status:'complete',limit:100})){
   if(session.mode!=='payment'||session.payment_status!=='paid'||!await this.paymentValid(session))continue;
   for await(const item of stripe.checkout.sessions.listLineItems(session.id,{limit:100})){
    const pack=PACK_IDS.find(id=>!!this.premium.env[PACKS[id].stripePriceEnv]&&item.price?.id===this.premium.env[PACKS[id].stripePriceEnv]);
    if(pack)owned.add(pack);
   }
  }
  const {error}=await this.premium.client.rpc('update_pack_provider',{p_owner:actor,p_source:'stripe',p_packs:[...owned],p_observed:observed});if(error)throw error;return this.premium.status(actor);
 }
 async checkout(actor:string,input:unknown){
  const pack=(input as {packId?:unknown})?.packId;if(!isPackId(pack))throw new ApiError(400,'pack','Choose a pack.');
  await this.premium.requireAccount(actor);const stripe=this.configured();
  if(this.premium.env.REVENUECAT_SECRET_KEY)await this.premium.refreshApple(actor);
  const status=await this.refresh(actor);if(!status.webReady||!status.availablePacks.includes(pack))throw new ApiError(503,'billing_unavailable','This pack is not available yet.');
  if(ownsPack(status.ownedPacks,pack))throw new ApiError(409,'already_owned','You already own this pack.');
  const priceId=this.premium.env[PACKS[pack].stripePriceEnv];if(!priceId)throw new ApiError(503,'billing_configuration','This pack is being set up.');
  const price=await stripe.prices.retrieve(priceId);
  if(!price.active||price.unit_amount!==PACKS[pack].cents||price.currency!=='usd'||price.type!=='one_time'||price.recurring)throw new ApiError(503,'billing_configuration','This pack is being set up.');
  let customer=await this.customer(actor);
  if(!customer){const created=await stripe.customers.create({metadata:{picklebash_user_id:actor}},{idempotencyKey:`picklebash-customer-${actor}`});const {error}=await this.premium.client.from('billing_customers').upsert({owner_id:actor,stripe_customer_id:created.id},{onConflict:'owner_id',ignoreDuplicates:true});if(error)throw error;customer=await this.customer(actor);if(!customer)throw new Error('Customer unavailable');}
  const open=await stripe.checkout.sessions.list({customer,status:'open',limit:100});const existing=open.data.find(s=>s.mode==='payment'&&s.metadata?.picklebash_price===price.id);if(existing?.url)return {url:existing.url};
  const session=await stripe.checkout.sessions.create({mode:'payment',customer,client_reference_id:actor,metadata:{picklebash_price:price.id,pack_id:pack},line_items:[{price:price.id,quantity:1}],success_url:`${this.origin()}/?openplay=1&tab=profile&premium=return`,cancel_url:`${this.origin()}/?openplay=1&tab=profile`,expires_at:Math.floor(Date.now()/1000)+1800},{idempotencyKey:`picklebash-pack-${actor}-${pack}-${Math.floor(Date.now()/1800000)}`});
  if(!session.url)throw new Error('Checkout unavailable');return {url:session.url};
 }
 async webhook(raw:Buffer,signature:string){
  const stripe=this.configured();if(!this.premium.env.STRIPE_WEBHOOK_SECRET)throw new ApiError(503,'webhook_configuration','Webhook is not configured.');
  let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(raw,signature,this.premium.env.STRIPE_WEBHOOK_SECRET);}catch{throw new ApiError(400,'webhook_signature','Invalid webhook signature.');}
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','charge.refunded','charge.dispute.created','charge.dispute.updated','charge.dispute.closed'].includes(event.type))return;
  const object=event.data.object as unknown as {customer?:string|{id:string}};let customer=typeof object.customer==='string'?object.customer:object.customer?.id;
  if(event.type.startsWith('charge.dispute.')){const dispute=event.data.object as Stripe.Dispute;const charge=typeof dispute.charge==='string'?await stripe.charges.retrieve(dispute.charge):dispute.charge;customer=typeof charge.customer==='string'?charge.customer:charge.customer?.id;}
  if(!customer)return;const {data,error}=await this.premium.client.from('billing_customers').select('owner_id').eq('stripe_customer_id',customer).maybeSingle();if(error)throw error;if(data)await this.refresh(data.owner_id);
 }
}
