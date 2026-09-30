import {PACKS,ownsPack,ownsPackContent,isApplePackProduct} from '../src/pack-catalog';
import test from 'node:test';
import assert from 'node:assert/strict';
import {revenueCatPacks,PremiumService} from '../server/multiplayer/premium';
import {validWebhookSecret,premiumWebhook} from '../server/multiplayer/premium-routes';
import {premiumAppearance,changedPremiumChoices,missingAppearancePacks} from '../src/premium-appearance';
import {DEFAULT_APPEARANCE,APPEARANCE_OPTIONS} from '../src/player-design';
import {Readable} from 'node:stream';
test('Apple non-consumables require exact entitlement, transaction, and store environment',()=>{
 const p=PACKS.style,date='2026-09-29T00:00:00Z';
 const t={store:'app_store',is_sandbox:false,purchase_date:date,refunded_at:null as string|null};
 const e={product_identifier:p.productId,expires_date:null,purchase_date:date};
 const receipt={request_date_ms:Date.parse(date),subscriber:{entitlements:{[p.entitlement]:e},non_subscriptions:{[p.productId]:[t]}}};
 assert.deepEqual(revenueCatPacks(receipt),['style']);t.is_sandbox=true;assert.deepEqual(revenueCatPacks(receipt),[]);assert.deepEqual(revenueCatPacks(receipt,true),['style']);
 t.is_sandbox=false;t.refunded_at=date;assert.deepEqual(revenueCatPacks(receipt),[]);t.refunded_at=null;t.store='test_store';assert.deepEqual(revenueCatPacks(receipt),[]);
 t.store='app_store';delete receipt.subscriber.entitlements[p.entitlement];assert.deepEqual(revenueCatPacks(receipt),[]);assert.throws(()=>revenueCatPacks({}));
});
test('V1 bundle and partial cosmetic ownership are explicit',()=>{
 assert.equal(ownsPack(['everything'],'fun'),true);assert.equal(ownsPack(['style','court','fun'],'everything'),false);
 assert.equal(ownsPackContent(['style','court','fun'],'everything'),true);
 for(const missing of ['style','court','fun'] as const)assert.equal(ownsPackContent((['style','court','fun'] as const).filter(id=>id!==missing),'everything'),false);
 assert.equal(ownsPackContent(['everything'],'everything'),true);assert.equal(ownsPackContent([],'everything'),false);
 const appearance={...DEFAULT_APPEARANCE,hat:'crown' as const,paddleShape:'circular' as const};
 assert.equal(premiumAppearance(appearance,['style']).hat,'crown');assert.equal(premiumAppearance(appearance,['style']).paddleShape,DEFAULT_APPEARANCE.paddleShape);
 assert.equal(premiumAppearance(appearance,['fun']).hat,DEFAULT_APPEARANCE.hat);assert.equal(premiumAppearance(appearance,['fun']).paddleShape,'circular');
 assert.equal(changedPremiumChoices(DEFAULT_APPEARANCE,appearance,['everything']),false);
});
test('fallback appearance preserves original choices and leaves free styles untouched',()=>{
 const original={...DEFAULT_APPEARANCE,hat:'crown' as const,hairStyle:'mohawk' as const,jersey:'#123456'};
 const effective=premiumAppearance(original,false);assert.equal(effective.hat,DEFAULT_APPEARANCE.hat);assert.equal(effective.jersey,'#123456');assert.equal(original.hat,'crown');assert.deepEqual(premiumAppearance(original,true),original);
 assert.equal(changedPremiumChoices(original,original),false);assert.equal(changedPremiumChoices(DEFAULT_APPEARANCE,original),true);
});
test('webhook authentication fails closed and transfers refresh both known UUID identities',async()=>{
 assert.equal(validWebhookSecret('Bearer secret','Bearer secret'),true);assert.equal(validWebhookSecret('secret',undefined),false);assert.equal(validWebhookSecret(['secret'],'secret'),false);assert.equal(validWebhookSecret('Bearer wrong','Bearer secret'),false);
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',seen:string[]=[];
 const service={env:{REVENUECAT_WEBHOOK_AUTH:'Bearer secret'},refreshApple:async(id:string)=>{seen.push(id)}} as unknown as PremiumService;
 const req=()=>Object.assign(Readable.from([JSON.stringify({event:{id:'one',type:'TRANSFER',transferred_from:[a],transferred_to:[b],aliases:['$RCAnonymousID:ignored',a]}})]),{headers:{authorization:'Bearer secret'}});
 await premiumWebhook(req() as any,service,'/revenuecat');assert.deepEqual(new Set(seen),new Set([a,b]));
 const denied=req();denied.headers.authorization='wrong';await assert.rejects(premiumWebhook(denied as any,service,'/revenuecat'),e=>(e as any).status===401);
});

test('RevenueCat test deliveries authenticate without refreshing synthetic accounts',async()=>{
 let refreshes=0;const service={env:{REVENUECAT_WEBHOOK_AUTH:'Bearer secret'},refreshApple:async()=>{refreshes++;throw new Error('Synthetic account must not be refreshed');}} as unknown as PremiumService;
 const request=(authorization:string)=>Object.assign(Readable.from([JSON.stringify({event:{id:'dashboard-test',type:'TEST',app_user_id:'11111111-1111-4111-8111-111111111111',aliases:['22222222-2222-4222-8222-222222222222']}})]),{headers:{authorization}});
 await premiumWebhook(request('Bearer secret') as any,service,'/revenuecat');assert.equal(refreshes,0);
 await assert.rejects(premiumWebhook(request('wrong') as any,service,'/revenuecat'),e=>(e as any).status===401);assert.equal(refreshes,0);
});

test('only a configured, non-guest admin can grant access and every grant records its actor',async()=>{
 const actor='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222';let guest=false;const writes:any[]=[];
 const client={auth:{admin:{getUserById:async()=>({data:{user:{id:actor,is_anonymous:guest,user_metadata:{admin:true}}}})}},rpc:async(name:string,args:any)=>{writes.push({name,args});return {error:null}}};
 const input={ownerId:target,active:true,packId:'everything',reason:'Promotion'};
 await assert.rejects(new PremiumService(client as any,{}).grant(actor,input),e=>(e as any).status===403);assert.equal(writes.length,0);
 const service=new PremiumService(client as any,{PREMIUM_ADMIN_IDS:actor});guest=true;
 await assert.rejects(service.grant(actor,input),e=>(e as any).status===403);guest=false;
 await assert.rejects(service.grant(actor,{...input,packId:'unknown'}),e=>(e as any).status===400);
 await service.grant(actor,input);assert.deepEqual(writes,[{name:'grant_pack',args:{p_owner:target,p_administrator:actor,p_active:true,p_pack:'everything',p_reason:'Promotion'}}]);
});

test('membership endpoints remain a safe setup state before schema rollout',async()=>{
 const {createMatchHandler}=await import('../server/multiplayer/routes');
 const {MatchService}=await import('../server/multiplayer/service');
 const {MemoryRepository,testers,A}=await import('./helpers/remote');
 const handler=createMatchHandler(new MatchService(new MemoryRepository(),testers),async()=>A);
 const req=Object.assign(Readable.from([]),{url:'/api/multiplayer/premium',method:'GET',headers:{host:'localhost',authorization:'Bearer test'},socket:{remoteAddress:'127.0.0.1'}});
 let status=0,value:any;const res={writeHead(code:number){status=code;return this},end(text:string){value=JSON.parse(text);return this}};
 await handler(req as any,res as any);assert.equal(status,200);assert.equal(value.enforced,false);assert.equal(value.appleReady,false);assert.equal(value.webReady,false);
});

test('Apple product lookup never offers a subscription or consumable as a permanent pack',()=>{for(const type of ['AUTO_RENEWABLE_SUBSCRIPTION','CONSUMABLE','UNKNOWN'])assert.equal(isApplePackProduct('style',{identifier:PACKS.style.productId,productType:type}),false);assert.equal(isApplePackProduct('style',{identifier:PACKS.style.productId,productType:'NON_CONSUMABLE'}),true);});

 test('all approved V1 packs are available independently of the payment switch',async()=>{
 const client={from:()=>({select:()=>({eq:()=>({eq:async()=>({data:[]})})})}),rpc:async()=>({data:true})};
 const env={BILLING_PRIVACY_URL:'https://picklebash.app/privacy',BILLING_TERMS_URL:'https://picklebash.app/tos',BILLING_RETURN_ORIGIN:'https://picklebash.app',REVENUECAT_SECRET_KEY:'test',REVENUECAT_WEBHOOK_AUTH:'test',STRIPE_SECRET_KEY:'rk_live_test',STRIPE_WEBHOOK_SECRET:'test',STRIPE_STYLE_PRICE_ID:'style',STRIPE_COURT_PRICE_ID:'court',STRIPE_FUN_PRICE_ID:'fun',STRIPE_EVERYTHING_PRICE_ID:'everything'};
 const off=await new PremiumService(client as any,env).status('test');
 assert.deepEqual(off.availablePacks,['style','court','fun','everything']);assert.equal(off.webReady,false);assert.equal(off.appleReady,false);
 const on=await new PremiumService(client as any,{...env,BILLING_PURCHASES_ENABLED:'true'}).status('test');
 assert.equal(on.webReady,true);assert.equal(on.appleReady,true);assert.equal(on.availablePacks.includes('everything'),true);
 });

test('save upgrades identify the exact missing packs without restricting saved or free choices',()=>{
 const paid={...DEFAULT_APPEARANCE,hat:'crown' as const,paddleShape:'rounded-lines' as const};
 assert.deepEqual(missingAppearancePacks(DEFAULT_APPEARANCE,paid,[]),['style','fun']);
 assert.deepEqual(missingAppearancePacks(DEFAULT_APPEARANCE,paid,['style']),['fun']);
 assert.deepEqual(missingAppearancePacks(DEFAULT_APPEARANCE,paid,['fun']),['style']);
 assert.deepEqual(missingAppearancePacks(DEFAULT_APPEARANCE,paid,['everything']),[]);
 assert.deepEqual(missingAppearancePacks(paid,{...paid,jersey:'#123456'},[]),[]);
 assert.deepEqual(missingAppearancePacks(paid,DEFAULT_APPEARANCE,[]),[]);
 assert.deepEqual(missingAppearancePacks(undefined,DEFAULT_APPEARANCE,[]),[]);
 assert.deepEqual(missingAppearancePacks(paid,{...paid,hat:'tiara'},[]),['style']);
 assert.deepEqual(missingAppearancePacks(undefined,{...DEFAULT_APPEARANCE,funTheme:'fairy',funVariant:0},[]),['fun']);
});

test('every outfit costume needs Style Pack; None needs no pack',()=>{
 for(const outfit of APPEARANCE_OPTIONS.outfit){
  const next={...DEFAULT_APPEARANCE,outfit};
  assert.deepEqual(missingAppearancePacks(DEFAULT_APPEARANCE,next,[]),outfit==='none'?[]:['style']);
  assert.deepEqual(missingAppearancePacks(DEFAULT_APPEARANCE,next,['fun']),outfit==='none'?[]:['style']);
  assert.deepEqual(missingAppearancePacks(DEFAULT_APPEARANCE,next,['style']),[]);
  assert.equal(premiumAppearance(next,[]).outfit,'none');
  assert.equal(premiumAppearance(next,['style']).outfit,outfit);
 }
});
