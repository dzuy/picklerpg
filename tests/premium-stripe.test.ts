import test from 'node:test';
import assert from 'node:assert/strict';
import {PremiumStripe} from '../server/multiplayer/premium-stripe';
import type {PremiumService} from '../server/multiplayer/premium';
const owner='11111111-1111-4111-8111-111111111111';
function fixture(){
 let refunded=0,disputed=false,disputeStatus='needs_response',paid=true,mode='payment',price='price_style';
 const writes:any[]=[],checkouts:any[]=[],checkoutKeys:string[]=[];let open:any[]=[];
 const premium={env:{STRIPE_STYLE_PRICE_ID:'price_style',STRIPE_WEBHOOK_SECRET:'test_secret',BILLING_RETURN_ORIGIN:'https://picklebash.test'},requireAccount:async()=>{},status:async()=>({ownedPacks:[],availablePacks:['style','court'],webReady:true}),client:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{stripe_customer_id:'cus_one',owner_id:owner}})})})}),rpc:async(_n:string,args:any)=>{writes.push(args);return {error:null}}}} as unknown as PremiumService;
 const iterable=(values:any[])=>({async *[Symbol.asyncIterator](){yield* values}});
 const stripe={prices:{retrieve:async()=>({id:'price_style',active:true,unit_amount:299,currency:'usd',type:'one_time',recurring:null})},paymentIntents:{retrieve:async()=>({status:'succeeded',latest_charge:{id:'ch_one',paid,amount_refunded:refunded,disputed}})},disputes:{list:async()=>({data:[{status:disputeStatus}]})},checkout:{sessions:{list:(input:any)=>input.status==='open'?Promise.resolve({data:open}):iterable([{id:'cs_one',mode,payment_status:paid?'paid':'unpaid',payment_intent:'pi_one'}]),listLineItems:()=>iterable([{price:{id:price}}]),create:async(params:any,options:any)=>{checkouts.push(params);checkoutKeys.push(options.idempotencyKey);return {url:'https://checkout.stripe.com/test'}}}},webhooks:{constructEvent:()=>{throw new Error('Invalid signature')}}};
 return {service:new PremiumStripe(premium,stripe as any),premium,writes,checkouts,checkoutKeys,setOpen(v:any[]){open=v},setPaid(v:boolean){paid=v},setRefund(v:number){refunded=v},setDispute(v:boolean,status='needs_response'){disputed=v;disputeStatus=status},setMode(v:string){mode=v},setPrice(v:string){price=v}};
}
test('Stripe one-time ownership requires paid mapped items; refunds and disputes revoke only its snapshot',async()=>{
 const f=fixture();const owned=()=>f.writes.at(-1).p_packs;
 await f.service.refresh(owner);assert.deepEqual(owned(),['style']);
 f.setPaid(false);await f.service.refresh(owner);assert.deepEqual(owned(),[]);f.setPaid(true);
 f.setRefund(1);await f.service.refresh(owner);assert.deepEqual(owned(),[]);f.setRefund(0);
 f.setDispute(true);await f.service.refresh(owner);assert.deepEqual(owned(),[]);f.setDispute(true,'won');await f.service.refresh(owner);assert.deepEqual(owned(),['style']);
 f.setMode('subscription');await f.service.refresh(owner);assert.deepEqual(owned(),[]);f.setMode('payment');f.setPrice('unmapped');await f.service.refresh(owner);assert.deepEqual(owned(),[]);
});
test('checkout is a one-time purchase, rejects effective ownership and unfinished packs',async()=>{
 const f=fixture();await f.service.checkout(owner,{packId:'style'});assert.equal(f.checkouts[0].mode,'payment');assert.equal(f.checkouts[0].line_items[0].price,'price_style');
 assert.equal(f.checkouts[0].success_url,'https://picklebash.test/?openplay=1&tab=store&premium=return');
 assert.equal(f.checkouts[0].cancel_url,'https://picklebash.test/?openplay=1&tab=store');
 await assert.rejects(f.service.checkout(owner,{packId:'fun'}));
 f.premium.status=async()=>({ownedPacks:['everything'],availablePacks:['style'],webReady:true} as any);
 await assert.rejects(f.service.checkout(owner,{packId:'style'}),e=>(e as any).code==='already_owned');assert.equal(f.checkouts.length,1);
 f.writes.length=0;await assert.rejects(f.service.webhook(Buffer.from('{}'),'forged'));assert.equal(f.writes.length,0);
});

test('all individual packs block a redundant Everything checkout without creating a payment session',async()=>{
 const f=fixture();
 f.premium.status=async()=>({ownedPacks:['style','court','fun'],availablePacks:['style','court','fun','everything'],webReady:true} as any);
 await assert.rejects(f.service.checkout(owner,{packId:'everything'}),e=>(e as any).status===409&&(e as any).code==='already_owned');
 assert.equal(f.checkouts.length,0);
});

test('tax checkout collects a current billing address and does not reuse an untaxed session',async()=>{
 const f=fixture();
 f.premium.env.STRIPE_AUTOMATIC_TAX_ENABLED='true';
 f.setOpen([{mode:'payment',metadata:{picklebash_price:'price_style'},automatic_tax:{enabled:false},url:'https://checkout.stripe.com/old'}]);
 const result=await f.service.checkout(owner,{packId:'style'});
 assert.equal(result.url,'https://checkout.stripe.com/test');
 assert.deepEqual(f.checkouts[0].automatic_tax,{enabled:true});
 assert.equal(f.checkouts[0].billing_address_collection,'required');
 assert.deepEqual(f.checkouts[0].customer_update,{address:'auto'});
 assert.match(f.checkoutKeys[0],/-tax1v1-/);
 f.setOpen([{mode:'payment',metadata:{picklebash_price:'price_style',picklebash_tax_policy:'billing-address-v1'},automatic_tax:{enabled:true},billing_address_collection:'required',url:'https://checkout.stripe.com/taxed'}]);
 assert.equal((await f.service.checkout(owner,{packId:'style'})).url,'https://checkout.stripe.com/taxed');
 assert.equal(f.checkouts.length,1);
 f.premium.env.STRIPE_AUTOMATIC_TAX_ENABLED='false';
 await f.service.checkout(owner,{packId:'style'});
 assert.equal(f.checkouts.length,2);
 assert.equal(f.checkouts[1].automatic_tax,undefined);
 assert.match(f.checkoutKeys[1],/-tax0v1-/);
});
