import test from 'node:test';
import assert from 'node:assert/strict';
import {PremiumStripe} from '../server/multiplayer/premium-stripe';
import type {PremiumService} from '../server/multiplayer/premium';
const owner='11111111-1111-4111-8111-111111111111';
function fixture(){
 let refunded=0,disputed=false,disputeStatus='needs_response',paid=true,mode='payment',price='price_style';
 const writes:any[]=[],checkouts:any[]=[];
 const premium={env:{STRIPE_STYLE_PRICE_ID:'price_style',STRIPE_WEBHOOK_SECRET:'test_secret',BILLING_RETURN_ORIGIN:'https://picklebash.test'},requireAccount:async()=>{},status:async()=>({ownedPacks:[],availablePacks:['style','court'],webReady:true}),client:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{stripe_customer_id:'cus_one',owner_id:owner}})})})}),rpc:async(_n:string,args:any)=>{writes.push(args);return {error:null}}}} as unknown as PremiumService;
 const iterable=(values:any[])=>({async *[Symbol.asyncIterator](){yield* values}});
 const stripe={prices:{retrieve:async()=>({id:'price_style',active:true,unit_amount:299,currency:'usd',type:'one_time',recurring:null})},paymentIntents:{retrieve:async()=>({status:'succeeded',latest_charge:{id:'ch_one',paid,amount_refunded:refunded,disputed}})},disputes:{list:async()=>({data:[{status:disputeStatus}]})},checkout:{sessions:{list:(input:any)=>input.status==='open'?Promise.resolve({data:[]}):iterable([{id:'cs_one',mode,payment_status:paid?'paid':'unpaid',payment_intent:'pi_one'}]),listLineItems:()=>iterable([{price:{id:price}}]),create:async(params:any)=>{checkouts.push(params);return {url:'https://checkout.stripe.com/test'}}}},webhooks:{constructEvent:()=>{throw new Error('Invalid signature')}}};
 return {service:new PremiumStripe(premium,stripe as any),premium,writes,checkouts,setPaid(v:boolean){paid=v},setRefund(v:number){refunded=v},setDispute(v:boolean,status='needs_response'){disputed=v;disputeStatus=status},setMode(v:string){mode=v},setPrice(v:string){price=v}};
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
 await assert.rejects(f.service.checkout(owner,{packId:'fun'}));
 f.premium.status=async()=>({ownedPacks:['everything'],availablePacks:['style'],webReady:true} as any);
 await assert.rejects(f.service.checkout(owner,{packId:'style'}),e=>(e as any).code==='already_owned');assert.equal(f.checkouts.length,1);
 f.writes.length=0;await assert.rejects(f.service.webhook(Buffer.from('{}'),'forged'));assert.equal(f.writes.length,0);
});
